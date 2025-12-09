# Multi-stage Dockerfile for Next.js (standalone) on Cloud Run

# -------- Base image (defines Node version)
FROM node:20-bookworm-slim AS base

# -------- Dependencies layer
FROM base AS deps
WORKDIR /app

# Install pnpm (preferred since pnpm-lock.yaml is present)
RUN corepack enable && corepack prepare pnpm@latest --activate

# Only copy lockfiles and package manifest for dependency install caching
COPY package.json pnpm-lock.yaml ./

# Install dependencies (production and dev for build)
RUN pnpm install --frozen-lockfile

# -------- Build layer
FROM deps AS build
WORKDIR /app

# Accept Firebase envs at build time
ARG NEXT_PUBLIC_FIREBASE_API_KEY
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID

# Make them available to Next.js during build
ENV NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY
ENV NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ENV NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID

# Copy the full project for build
COPY . .

# Ensure Next.js uses standalone output (configured in next.config.mjs)
# Keep NODE_ENV unset here so devDependencies are available while building
# ENV NODE_ENV=production

# Build the Next.js application
RUN pnpm build

# -------- Runtime layer
FROM base AS runner
WORKDIR /app

# Create non-root user
RUN groupadd -g 1001 nodejs \
  && useradd -u 1001 -g nodejs -m nodeuser

ENV NODE_ENV=production \
    PORT=8080 \
    HOSTNAME=0.0.0.0

# Copy the standalone server and required assets from the build stage
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

# Optional: copy package.json for metadata (not strictly required)
COPY --from=build /app/package.json ./package.json

# Cloud Run listens on $PORT
EXPOSE 8080

# Use non-root user
USER nodeuser

# Start the Next.js standalone server
CMD ["node", "server.js"]


