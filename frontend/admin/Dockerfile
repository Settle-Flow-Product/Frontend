FROM node:22-slim AS builder
WORKDIR /app

# The image ships npm 10; this lockfile is written by npm 11, which records optional peers
# differently. Pin the tool to the lockfile rather than the other way round.
RUN npm install -g npm@11

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build

FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=5174
RUN npm install -g npm@11
COPY --from=builder /app/package.json /app/package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
# .mjs, not .ts: a TypeScript config makes Next reach for the compiler at startup, and this
# stage has no devDependencies to find one in.
COPY --from=builder /app/next.config.mjs ./
COPY --from=builder /app/scripts ./scripts

USER node
EXPOSE 5174
CMD ["npx", "next", "start", "-p", "5174"]
