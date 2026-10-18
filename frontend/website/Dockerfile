FROM node:22-slim AS builder
WORKDIR /app

# The image ships npm 10; this lockfile is written by npm 11, which records optional peers
# differently. `npm ci` then refuses with "Missing: utf-8-validate from lock file" — a failure that
# appears only in the container and only for whoever runs the build, never on the machine that
# generated the lockfile. Pin the tool to the lockfile rather than the other way round.
RUN npm install -g npm@11

COPY package.json package-lock.json ./
# --ignore-scripts: nothing here needs a postinstall, and a build that runs arbitrary package
# scripts is a supply-chain surface for no benefit.
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build

FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=5173
RUN npm install -g npm@11
COPY --from=builder /app/package.json /app/package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
# .mjs, not .ts: a TypeScript config makes Next reach for the compiler at startup, and this
# stage has no devDependencies to find one in.
COPY --from=builder /app/next.config.mjs ./

USER node
EXPOSE 5173
# API_TARGET is read PER REQUEST by the proxy route, never baked in, so one image runs anywhere.
CMD ["npx", "next", "start", "-p", "5173"]
