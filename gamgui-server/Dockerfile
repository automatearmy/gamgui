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

# Download and install the latest GAM release
RUN mkdir -p /gam && \
    cd /gam && \
    wget -q https://github.com/GAM-team/GAM/releases/download/v6.80/gam-6.80-linux-x86_64.tar.xz && \
    tar -xf gam-6.80-linux-x86_64.tar.xz && \
    rm gam-6.80-linux-x86_64.tar.xz && \
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
