# Generation service for the VM: the same Next app, but only /api/documents/* and /api/health are ever called
# (the public site runs on Cloudflare Workers and forwards generation here). Runs on real Node, so there is
# no CPU limit and the LaTeX templates can be read from disk.
#
# Build it on a machine with RAM to spare (not the 2 GB VM), then ship the image:
#   docker build -f deploy/vm/Dockerfile -t ajsa-generate:latest \
#     --build-arg NEXT_PUBLIC_SUPABASE_URL=... --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=... .
#   docker save ajsa-generate:latest | gzip | gcloud compute ssh notera-app --tunnel-through-iap --zone us-central1-a \
#     --project medproject-506019 --command "gunzip | sudo docker load"
FROM node:22-slim AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
# Public values, inlined into the client bundle at build time (the server also reads them at runtime).
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
    NEXT_TELEMETRY_DISABLED=1
# `pnpm build` regenerates robots/sitemap/llms.txt and runs next build (standalone output on Linux).
RUN pnpm build

FROM node:22-slim AS run
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 NEXT_TELEMETRY_DISABLED=1
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
