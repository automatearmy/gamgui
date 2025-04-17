# Use Node.js 18 as the base image
FROM node:18-alpine

# Install required packages
RUN apk add --no-cache \
    bash \
    curl \
    python3

# Set working directory
WORKDIR /app

# Create temp-uploads directory with appropriate permissions
RUN mkdir -p temp-uploads && chmod 755 temp-uploads

# Copy package files for dependency installation
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application code
COPY . .

# Expose the server port
EXPOSE 3001

# Set environment variables
ENV PROJECT_ID=gamgui-tf-1

# Start the server
CMD ["node", "server.js"]
