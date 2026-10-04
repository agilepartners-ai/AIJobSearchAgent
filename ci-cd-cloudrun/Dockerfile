# Stage 1: Build the application 
FROM node:20-alpine AS build

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies (including dev dependencies for build)
RUN npm install

# Copy the rest of the application source code
COPY . .

# Build arguments for environment variables needed at build time
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_JSEARCH_API_KEY
ARG NEXT_PUBLIC_JSEARCH_API_HOST

# Set environment variables for build
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_JSEARCH_API_KEY=$NEXT_PUBLIC_JSEARCH_API_KEY
ENV NEXT_PUBLIC_JSEARCH_API_HOST=$NEXT_PUBLIC_JSEARCH_API_HOST

# NOTE: GEMINI_API_KEY, TEXAPI_KEY, DATABASE_URL, PG_SSL_CA, DOCUMENT_SIGNING_SECRET and TAVUS_API_KEY are
# deliberately NOT build args. They are server-side secrets read at request
# time and must be supplied as Cloud Run runtime environment variables — baking
# them into the image would leak them to anyone who can pull it.

# Build the Next.js application
RUN npm run build

# Stage 2: Use Node.js to serve the Next.js application
FROM node:20-alpine AS runtime

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app directory
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy the built application from build stage
COPY --from=build /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static

# Switch to non-root user
USER nextjs

# Expose the port (Cloud Run will override this with PORT env var)
EXPOSE 8080

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080
ENV HOSTNAME="0.0.0.0"

# Use dumb-init to handle signals properly
CMD ["dumb-init", "node", "server.js"]
