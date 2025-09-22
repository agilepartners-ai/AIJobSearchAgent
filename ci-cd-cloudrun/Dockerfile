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
