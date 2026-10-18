# The admin console

Next.js (App Router) + TypeScript + Tailwind v4 + [shadcn/ui](https://ui.shadcn.com). The screen
operations opens when something needs explaining.

```bash
npm install
npm run dev        # http://localhost:5174
npm test           # 46
npm run typecheck
```

It reads **PostgreSQL directly**, through server actions. The website next door reads the backend
API. The full reasoning is in [`docs/11-admin.md`](../../docs/11-admin.md); the short version is
that an operations console asks open-ended questions, and answering those through an HTTP contract
means either a new endpoint per question or a query language with a URL in front of it.

## Accounts

There is no sign-up page and no bootstrap-by-environment-variable, because both are ways for an
account to exist that nobody decided to create.

```bash
npm run admin-user -- create you@example.com superadmin
npm run admin-user -- list
npm run admin-user -- passwd you@example.com
npm run admin-user -- roles you@example.com operator
npm run admin-user -- disable you@example.com
```

`passwd`, `roles` and `disable` bump `token_epoch`, which signs that account out everywhere without
a session table to clear.

## One route for every table

[`app/admin/[table]/page.tsx`](app/admin/[table]/page.tsx) is the only module screen. The list of
tables comes from `pg_catalog` at request time, so a table added by a migration is browsable the
moment the migration runs.

That generality is also the risk, because the one part of a SQL statement that cannot be a bound
parameter is an identifier. The rule, enforced in [`lib/schema.ts`](lib/schema.ts) and
[`lib/crud.ts`](lib/crud.ts):

> **Every identifier that reaches a statement was first read from the catalogue and compared for
> exact equality. Every value is bound.**

Nothing else here builds SQL.

## What it refuses

| | |
|---|---|
| `auth_challenges`, `admin_users`, `_sqlx_migrations` | Not shown at all. Asking by URL returns 404 — the same answer as a misspelled name, so the status code cannot be used to learn which tables exist |
| `settlements`, `settlement_approvals`, `payment_requests` | Read-only. The money path: a row edited here changes what the submitter believes about a payment that may already be in flight |
| `chain_events`, `ingest_cursor` | Read-only. Projections; editing one changes what the console *says* happened, until the next ingest overwrites it |
| `audit_events`, `chain_events` | Append-only. `REVOKE UPDATE, DELETE` in migration 0008 is the real enforcement |

No role writes to the money path. The restriction is a property of the table, not of the person.

## Permissions

Four roles collapse to three grants in [`types/role.ts`](types/role.ts), once — asking "is this
person an admin?" at a call site is how a fourth role later gets forgotten in one of twenty places.

The check runs **inside each server action**, per call. A server action is a POST endpoint with a
generated name: anything callable is callable by somebody who should not be calling it.
[`middleware.ts`](middleware.ts) only checks that a cookie is present, because it runs on the Edge
runtime and has no database to ask anything better.

## Environment

| Variable | |
|---|---|
| `DATABASE_URL` | **required** |
| `ADMIN_SESSION_KEY` | **required**, and a different value from the backend's `SESSION_KEY` |
| `DATABASE_POOL_MAX` | `6` |
| `COOKIE_SECURE` | `true` behind TLS |

**No `NEXT_PUBLIC_*` variable exists in this app.** A database URL baked in at build time would be a
credential sitting in a browser bundle.

The config is [`next.config.mjs`](next.config.mjs), not `.ts`: Next reaches for the TypeScript
compiler to load a `.ts` config at start-up, and the production image has no devDependencies to find
one in.
