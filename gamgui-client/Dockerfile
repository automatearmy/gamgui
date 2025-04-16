# Use Node 18 Alpine as the base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Define build arguments for API and Socket URLs
ARG VITE_API_URL
ARG VITE_SOCKET_URL

# Set environment variables for the build process
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_SOCKET_URL=${VITE_SOCKET_URL}
ENV NODE_ENV=production

# Copy package files for dependency installation
COPY package.json package-lock.json ./

# Install dependencies (including dev dependencies for build)
RUN npm ci --include=dev

# Copy the rest of the application code
COPY . .

# Build the application with the environment variables
RUN npm run build

# Install serve globally to serve the static files
RUN npm install -g serve

# Expose port 3000
EXPOSE 3000

# Start the serve command to serve files from the dist directory
CMD ["serve", "-s", "dist", "-l", "3000"]
