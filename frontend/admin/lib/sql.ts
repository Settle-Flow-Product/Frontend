/**
 * Building statement fragments out of catalogue identifiers.
 *
 * Pure, and separate from `lib/schema.ts` so it can be tested without a database and without
 * `server-only` — which is the point: the functions here are the entire safety argument for a
 * console that will happily build a statement against any table in the schema.
 */

/** One column, as the catalogue describes it. */
export interface ColumnShape {
  name: string;
  dataType: string;
}

/**
 * Quote an identifier that has already been matched against the catalogue.
 *
 * Both halves matter. The catalogue check is what makes the name ours; the quoting keeps a
 * legitimate but awkward name — a keyword, a capital letter — from changing what a statement means.
 * Doubling an embedded quote costs one line and closes the case where a name reaches here from
 * somewhere other than that check.
 */
export function quote(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`;
}

/** A single-quoted SQL string literal. Used for column *names* inside `jsonb_build_object`. */
export function literal(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

/**
 * A type whose values do not survive JavaScript's `number`.
 *
 * `numeric(30,7)` is every amount in this schema; `bigint` is a ledger sequence. The boundary is a
 * property of the type, not of the values that happen to be in the table today.
 *
 * Arrays are excluded because casting one to text turns a JSON list into the string `{1,2}` — a
 * different shape on screen, which is a worse bug than the one being fixed.
 */
export function isWideNumberType(dataType: string): boolean {
  if (dataType.endsWith('[]')) return false;
  return dataType.startsWith('numeric') || dataType === 'bigint';
}

/** `bytea` renders as `\x…`, which is unreadable. Hex-encode it instead. */
export function isBinaryType(dataType: string): boolean {
  return dataType === 'bytea';
}

/**
 * The expression that renders a row as JSON, with wide numbers kept exact.
 *
 * # Why not `to_jsonb(t)`
 *
 * `to_jsonb` puts a `numeric` into JSON as a JSON *number*, and the driver parses that with
 * `JSON.parse` — so an amount arrives already rounded. Registering a numeric type parser does not
 * help: the value never travels as a `numeric`, it travels inside a `jsonb` that has already lost
 * the digits.
 *
 * The fix has to happen in the database, before the conversion. Each wide column is cast to `text`
 * and arrives as a JSON string, which is how the rest of this console already treats amounts.
 */
export function rowJson(columns: readonly ColumnShape[]): string {
  const parts = columns.map((c) => {
    const name = literal(c.name);
    if (isWideNumberType(c.dataType)) return `${name}, ${quote(c.name)}::text`;
    if (isBinaryType(c.dataType)) return `${name}, encode(${quote(c.name)}, 'hex')`;
    return `${name}, ${quote(c.name)}`;
  });
  return `jsonb_build_object(${parts.join(', ')})`;
}
