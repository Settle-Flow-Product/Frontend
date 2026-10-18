# Frontend

Two applications, split along the trust boundary rather than by taste.

| App | Port | Audience | How it reads data |
|---|---|---|---|
| [`website/`](website/) | 5173 | The people who create and approve payments | The backend API, through a same-origin proxy |
| [`admin/`](admin/) | 5174 | Operations — looking at what the system did | **Postgres directly**, through server actions |

Both are Next.js 15 App Router + TypeScript + Tailwind v4 + [shadcn/ui](https://ui.shadcn.com), and
neither shares code with the other. No workspace, no shared package: a change to an operations table
browser has no business being able to break the screen somebody approves a payment on.

## Why they are separate

The website is **wallet-facing**. It holds no credential of its own — the person's wallet signs, and
a session token is all it keeps. It must be safe to load in a browser with whatever extensions the
user has installed.

The admin console is **server-owned**. It holds a database password and reads rows directly. It
never leaves the operator's network and has no business making anybody sign anything.

One codebase would mean one bundle that both talks to wallets and holds a database connection
string. The boundary is the point.

## Why the admin talks to Postgres and not to the backend

Routing row browsing through the Rust service would mean a hand-written endpoint per table, in the
language whose job is the money path. The backend keeps the endpoints that compute a **verdict**;
the admin answers "show me what is in the table". Migrations still live in `backend/migrations` and
are applied by the backend at boot — nothing in the console creates a table.
