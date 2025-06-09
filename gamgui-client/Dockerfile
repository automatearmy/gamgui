# Build stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Add build metadata as labels
LABEL org.opencontainers.image.version=$BUILD_ID
LABEL org.opencontainers.image.revision=$BUILD_ID

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Expose the port the app runs on
EXPOSE 8080

# Start the application
CMD ["npm", "start"]
