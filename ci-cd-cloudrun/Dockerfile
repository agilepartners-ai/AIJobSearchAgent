# Stage 1: Build the application
FROM node:20-alpine AS build

# Set the working directory
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
RUN npm run build

# Stage 2: Serve the application with Nginx
FROM nginx:1.25-alpine

# Copy the build output from the build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy the nginx configuration file
# We will create this file next if it doesn't exist
COPY ci-cd-cloudrun/nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
