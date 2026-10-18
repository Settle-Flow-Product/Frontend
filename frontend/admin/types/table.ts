/** What the catalogue says about one column. */
export interface Column {
  name: string;
  dataType: string;
  nullable: boolean;
  hasDefault: boolean;
}

/** Why a table refuses writes, or that it does not. */
export type Writability = 'writable' | 'projection' | 'append-only';

/** One table, as the catalogue describes it. */
export interface Table {
  name: string;
  columns: Column[];
  primaryKey: string[];
  writability: Writability;
}

/** A table as it appears in the navigation. */
export interface Module {
  slug: string;
  table: string;
  title: string;
  writable: boolean;
  readOnlyBecause: string | null;
}

/** One row, already rendered to JSON by the database. */
export type Record_ = Record<string, unknown>;

/** A page of rows, with enough to draw the pager. */
export interface Listing {
  slug: string;
  title: string;
  columns: Column[];
  primaryKey: string[];
  rows: Record_[];
  total: number;
  page: number;
  perPage: number;
  writable: boolean;
  readOnlyBecause: string | null;
}
