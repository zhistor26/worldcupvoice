# ── deps ──────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app

RUN npm install -g pnpm@9

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ── build ─────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app

RUN npm install -g pnpm@9

ARG NEXT_PUBLIC_AGORA_APP_ID
ARG NEXT_AGORA_APP_CERTIFICATE
ARG NEXT_PUBLIC_LAZYCAT_DEPLOYED=false
ARG NEXT_PUBLIC_REQUIRE_ACCESS_PASSWORD=true
ENV NEXT_PUBLIC_AGORA_APP_ID=$NEXT_PUBLIC_AGORA_APP_ID
ENV NEXT_AGORA_APP_CERTIFICATE=$NEXT_AGORA_APP_CERTIFICATE
ENV NEXT_PUBLIC_LAZYCAT_DEPLOYED=$NEXT_PUBLIC_LAZYCAT_DEPLOYED
ENV NEXT_PUBLIC_REQUIRE_ACCESS_PASSWORD=$NEXT_PUBLIC_REQUIRE_ACCESS_PASSWORD

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN pnpm run build

# ── runner ────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
