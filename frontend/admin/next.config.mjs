/** @type {import("next").NextConfig} */
const config = {
  // Everything is read server-side at runtime, so one image runs against any environment. There is
  // no NEXT_PUBLIC_* variable anywhere in this app: a database URL baked in at build time would be
  // both wrong everywhere and a credential in a bundle.
  reactStrictMode: true,

  // The console shares one origin with the website, behind nginx. Two Next apps cannot both serve
  // `/_next`, so this app moves under a prefix — routes and assets together.
  //
  // basePath is a BUILD-time value: `next build` writes it into every asset URL, which is why it is
  // a literal here and not read from the environment. It is duplicated in lib/base-path.ts, for the
  // raw paths Next does not rewrite; base-path.test.ts asserts the two still agree.
  //
  // It applies in development too, on purpose. An app reachable at `/` locally and `/admin` in
  // production is an app whose links are only tested in one of them.
  basePath: '/admin',
};

export default config;
