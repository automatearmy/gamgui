# Use Node.js 18 as the base image
FROM node:18-alpine

# Install required packages
RUN apk add --no-cache \
    bash \
    curl \
    python3 \
    py3-pip \
    git \
    wget \
    xz

# Set working directory
WORKDIR /app

# Download and install the latest GAM release (7.06.04)
RUN mkdir -p /gam && \
    cd /gam && \
    wget -q "https://github.com/GAM-team/GAM/releases/download/v7.06.04/gam-7.06.04-linux-x86_64-legacy.tar.xz" && \
    tar -xf "gam-7.06.04-linux-x86_64-legacy.tar.xz" && \
    rm "gam-7.06.04-linux-x86_64-legacy.tar.xz" && \
    ln -s /gam/gam/gam /usr/local/bin/gam

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
ENV PATH="/gam/gam:${PATH}"

# Start the server
CMD ["node", "server.js"]
