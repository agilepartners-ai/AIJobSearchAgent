# Multi-stage build for Next.js application optimized for Cloud Run
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json pnpm-lock.yaml* ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build arguments for environment variables needed at build time
ARG NEXT_PUBLIC_FIREBASE_API_KEY
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID
ARG NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ARG NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ARG NEXT_PUBLIC_FIREBASE_APP_ID
ARG NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
ARG NEXT_PUBLIC_JSEARCH_API_KEY
ARG NEXT_PUBLIC_JSEARCH_API_HOST
ARG NEXT_PUBLIC_TAVUS_API_KEY
ARG NEXT_PUBLIC_RESUME_API_BASE_URL
ARG NEXT_PUBLIC_RESUME_API_MODEL_TYPE
ARG NEXT_PUBLIC_RESUME_API_MODEL
ARG NEXT_PUBLIC_OPENAI_API_KEY

# Set environment variables for build
ENV NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY
ENV NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ENV NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID
ENV NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ENV NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ENV NEXT_PUBLIC_FIREBASE_APP_ID=$NEXT_PUBLIC_FIREBASE_APP_ID
ENV NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=$NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
ENV NEXT_PUBLIC_JSEARCH_API_KEY=$NEXT_PUBLIC_JSEARCH_API_KEY
ENV NEXT_PUBLIC_JSEARCH_API_HOST=$NEXT_PUBLIC_JSEARCH_API_HOST
ENV NEXT_PUBLIC_TAVUS_API_KEY=$NEXT_PUBLIC_TAVUS_API_KEY
ENV NEXT_PUBLIC_RESUME_API_BASE_URL=$NEXT_PUBLIC_RESUME_API_BASE_URL
ENV NEXT_PUBLIC_RESUME_API_MODEL_TYPE=$NEXT_PUBLIC_RESUME_API_MODEL_TYPE
ENV NEXT_PUBLIC_RESUME_API_MODEL=$NEXT_PUBLIC_RESUME_API_MODEL
ENV NEXT_PUBLIC_OPENAI_API_KEY=$NEXT_PUBLIC_OPENAI_API_KEY

# Build the Next.js application
RUN corepack enable pnpm && pnpm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
# Disable telemetry during runtime
ENV NEXT_TELEMETRY_DISABLED=1

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy the public folder
COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Switch to non-root user
USER nextjs

# Expose port (Cloud Run will override this with PORT env var)
EXPOSE 8080

# Set environment variables for Cloud Run
ENV PORT=8080
ENV HOSTNAME="0.0.0.0"

# Start the application
CMD ["node", "server.js"]