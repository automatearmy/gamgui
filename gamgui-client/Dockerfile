# Use Node 18 Alpine as the base image
FROM node:18-alpine

# Install build tools needed for some npm packages
RUN apk add --no-cache --virtual .gyp \
    python3 \
    make \
    g++

# Set working directory
WORKDIR /app

# Define build arguments for API, Socket URLs and Google OAuth Client ID
ARG VITE_API_URL
ARG VITE_SOCKET_URL
ARG VITE_GOOGLE_CLIENT_ID

# Set environment variables for the build process
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_SOCKET_URL=${VITE_SOCKET_URL}
ENV VITE_GOOGLE_CLIENT_ID=${VITE_GOOGLE_CLIENT_ID}
ENV NODE_ENV=production

# Copy package files for dependency installation
COPY package.json package-lock.json ./

# Install dependencies (including dev dependencies for build)
# Use --ignore-scripts to prevent potential issues during install
# and run rebuild scripts separately if needed (though often not for frontends)
RUN npm ci --include=dev --ignore-scripts

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

# Optional: Clean up build tools if image size is critical
# RUN apk del .gyp
