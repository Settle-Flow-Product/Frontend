/**
 * Where this app is mounted, as the browser sees it.
 *
 * The console is one of two Next apps behind a single nginx front door, and two apps at one origin
 * cannot both own `/` — or `/_next`, which is the part that actually collides. `basePath` in
 * `next.config.mjs` moves the whole app, assets included, under this prefix.
 *
 * Next rewrites the paths it controls — `<Link>`, `redirect()`, `NextResponse.redirect(nextUrl)`,
 * every asset URL — so those stay written as if the app were at the root, and MUST NOT repeat this
 * prefix. What Next does not touch is anything handed to the browser or to `new URL()` as a raw
 * string: a plain `<form action>`, `window.location`, a `Response` redirect built from
 * `request.url`. Those are the call sites that import this.
 *
 * It is declared here AND in next.config.mjs because a config read at build time cannot import a
 * TypeScript module. The two must agree; the vitest case in `base-path.test.ts` is what makes sure
 * they do rather than leaving it to memory.
 */
export const BASE_PATH = '/admin';

/** A raw browser-facing path: the prefix plus an app-internal path written from the root. */
export function publicPath(path: string): string {
  return `${BASE_PATH}${path === '/' ? '' : path}`;
}
