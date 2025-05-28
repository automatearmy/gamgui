#!/bin/bash

# Create credentials directory if it doesn't exist
CRED_DIR="$(pwd)/credentials"
mkdir -p "$CRED_DIR"

# Check if client_secrets.json exists
if [ ! -f "$CRED_DIR/client_secrets.json" ]; then
    echo "Warning: $CRED_DIR/client_secrets.json does not exist"
    echo "You will need to create or copy this file to the gam-credentials directory"
    echo "Continuing with build anyway..."
fi

# Build the Docker image
echo "Building GAM Docker image..."
docker build -t docker-gam7:latest .

# Check if container already exists and remove it
CONTAINER_NAME="docker-gam7-container"
if docker ps -a | grep -q $CONTAINER_NAME; then
    echo "Removing existing container..."
    docker rm $CONTAINER_NAME
fi

# Run the container in interactive mode with credentials mounted
echo "Starting GAM container..."
docker run -it --name $CONTAINER_NAME \
    --rm \
    -v "$CRED_DIR:/root/.gam" \
    docker-gam7:latest

echo "Container stopped." 