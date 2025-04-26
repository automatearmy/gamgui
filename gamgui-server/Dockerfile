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

# Install kubectl
RUN curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl" && \
    chmod +x kubectl && \
    mv kubectl /usr/local/bin/

# Install Google Cloud SDK for authentication with GKE
RUN curl -O https://dl.google.com/dl/cloudsdk/channels/rapid/downloads/google-cloud-cli-latest-linux-x86_64.tar.gz && \
    tar -xf google-cloud-cli-latest-linux-x86_64.tar.gz && \
    ./google-cloud-sdk/install.sh --quiet && \
    rm google-cloud-cli-latest-linux-x86_64.tar.gz

# Add gcloud to PATH
ENV PATH="/google-cloud-sdk/bin:${PATH}"

# Set working directory
WORKDIR /app

# Create /gam directory for compatibility with the virtual terminal
RUN mkdir -p /gam

# Create temp-uploads directory with appropriate permissions
RUN mkdir -p temp-uploads && chmod 755 temp-uploads

# Copy package files for dependency installation
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application code
COPY . .

# Make scripts executable
RUN chmod +x scripts/*.sh

# Expose the server port
EXPOSE 3001

# Set environment variables
ENV PROJECT_ID=gamgui-tf-1
ENV PATH="/gam/gam7:${PATH}"

# Start the server
CMD ["node", "server.js"]
