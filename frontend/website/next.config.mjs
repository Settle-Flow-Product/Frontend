/** @type {import("next").NextConfig} */
const config = {
  // Everything is read server-side at runtime, so one image runs against any environment. There
  // is no NEXT_PUBLIC_* variable anywhere in this app, deliberately: a value baked in at build
  // time is a value that is wrong in every environment except the one that built it.
  reactStrictMode: true,
};

export default config;
