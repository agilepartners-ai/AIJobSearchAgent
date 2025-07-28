# Stage 1: Build the application 
FROM node:20-alpine AS build

# Set the working directory hello
WORKDIR /app

# Copy package.json and package-lock.json (or yarn.lock, or pnpm-lock.yaml)
COPY package*.json ./

# Install dependencies
# Use 'npm ci' for reproducible builds if you have a package-lock.json
RUN npm install

# Copy the rest of the application source code
COPY . .

# Run the build script
# The `VITE_` prefix is important for environment variables to be exposed to the browser
RUN npm run build --legacy-peer-deps

# Stage 2: Serve the application with Nginx
FROM nginx:1.25-alpine

# Install envsubst for environment variable substitution
RUN apk add --no-cache gettext

# Copy the build output from the build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy the nginx configuration template
COPY ci-cd-cloudrun/nginx.conf /etc/nginx/conf.d/default.conf.template

# Create a startup script to handle environment variable substitution
RUN echo '#!/bin/sh' > /docker-entrypoint.sh && \
    echo 'export PORT=${PORT:-8080}' >> /docker-entrypoint.sh && \
    echo 'envsubst < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf' >> /docker-entrypoint.sh && \
    echo 'exec nginx -g "daemon off;"' >> /docker-entrypoint.sh && \
    chmod +x /docker-entrypoint.sh

# Expose the port (Cloud Run will override this with PORT env var)
EXPOSE 8080

# Use the startup script
CMD ["/docker-entrypoint.sh"]
