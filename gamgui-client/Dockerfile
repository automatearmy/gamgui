# Use Node 18 Alpine as the base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files for dependency installation
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application code
COPY . .

# Build the application with production environment
ENV NODE_ENV=production
RUN npm run build

# Install serve globally to serve the static files
RUN npm install -g serve

# Expose port 3000
EXPOSE 3000

# Start the serve command to serve files from the dist directory
CMD ["serve", "-s", "dist", "-l", "3000"]
