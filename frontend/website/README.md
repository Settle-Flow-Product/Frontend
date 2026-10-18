# The website

Next.js (App Router) + TypeScript + Tailwind v4 + [shadcn/ui](https://ui.shadcn.com), one
internal application.

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # 18
npm run typecheck
```

Four screens, and no more. The statement of work puts a dashboard out of scope, and each screen
here exists because something in the evidence package needs it.

| Route | Screen |
|---|---|
| `/` | Wallet sign-in |
| `/requests` | The payment list |
| `/requests/new` | Create a payment |
| `/approve/:id` | Approver signing |
| `/evidence/:id` | On-chain evidence — the page the Chapter Lead opens |

## Components

shadcn/ui, in the way shadcn is meant to be used: the primitives live in
[`components/ui/`](components/ui/) as source we own, not as a dependency we upgrade. Variants come
from `cva`, merged through `cn()` in [`lib/utils.ts`](lib/utils.ts) so a caller's utility class wins
over a variant's instead of the outcome depending on stylesheet order.

| Primitive | Used by |
|---|---|
| `button` `card` `input` `label` | the create and sign-in screens |
| `badge` | every status pill, and the Testnet marker |
| `alert` `skeleton` | the component states in [`components/States.tsx`](components/States.tsx) |
| `table` | the evidence page |

There is **no `tailwind.config.js`**. Tailwind v4 is CSS-first: the token contract lives in
[`app/globals.css`](app/globals.css) under `@theme inline`, with light and dark values on `:root`
and `.dark`.

Two families of token, deliberately kept apart. The shadcn tokens (`background`, `primary`,
`border`, `ring`, …) style the furniture. `--ok` / `--warn` / `--err` / `--info` carry **meaning**,
and each keeps one meaning throughout: amber is waiting, blue is in progress, green is done, red is
stopped.

## How it talks to the backend

`app/api/[...path]/route.ts` is a catch-all proxy forwarding to `API_TARGET`. It is a route handler
rather than a `next.config.ts` rewrite because rewrites are serialised at **build** time — the
backend URL would be baked into the image, and one image would no longer run anywhere.

Chain calls go through the wallet, not through us: the console never holds a key.

## The rules this code follows

- **No amount is ever a `number`.** Stellar uses seven decimal places and amounts reach magnitudes
  where an IEEE double silently drops digits. Everything is `string` and `bigint`, and the amount
  input is `type="text"`, never `type="number"`.
- **Colour is never the only carrier.** Every status pill states its word, for colour-blind readers
  and for screenshots pasted into a submission form.
- **Nothing shows success before a readback.** Creating a payment moves the screen to "writing to
  chain" and stays there until the backend confirms. Every chain-touching endpoint returns 202.
- **Unresolved offers "Check again", never "Send again".** Offering a resend after a timeout is how
  a vendor gets paid twice.
- **Terminal states hide their actions rather than disabling them.** A disabled button implies it
  could be unlocked.
- **The approver countdown is the transaction's timebounds**, not the request's expiry. A request
  may be valid for a day while the transaction built from it is valid for an hour.
- **The idempotency key is generated when the form opens**, not when the button is clicked, so two
  clicks create one payment.
- **There is no `NEXT_PUBLIC_*` variable.** Everything is read server-side at runtime.
