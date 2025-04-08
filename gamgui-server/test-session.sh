#!/bin/bash

# First, create an image
echo "Creating a new Docker image..."
IMAGE_RESPONSE=$(curl -s -X POST \
  http://localhost:3001/api/images \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "TestGAMImage",
    "metadata": {
      "description": "Test GAM Docker image"
    }
  }')

# Extract the image ID from the response
IMAGE_ID=$(echo $IMAGE_RESPONSE | grep -o '"id":"[^"]*"' | cut -d'"' -f4)

if [ -z "$IMAGE_ID" ]; then
  echo "Failed to create image or get image ID"
  echo "Response: $IMAGE_RESPONSE"
  exit 1
fi

echo "Image created with ID: $IMAGE_ID"

# Now create a session with that image
echo "Creating a new session with the image..."
SESSION_RESPONSE=$(curl -s -X POST \
  http://localhost:3001/api/sessions \
  -H 'Content-Type: application/json' \
  -d "{
    \"name\": \"TestSession\",
    \"imageId\": \"$IMAGE_ID\",
    \"config\": {
      \"description\": \"Test session\"
    }
  }")

# Extract the session ID from the response
SESSION_ID=$(echo $SESSION_RESPONSE | grep -o '"id":"[^"]*"' | cut -d'"' -f4)

if [ -z "$SESSION_ID" ]; then
  echo "Failed to create session or get session ID"
  echo "Response: $SESSION_RESPONSE"
  exit 1
fi

echo "Session created with ID: $SESSION_ID"
echo "To connect via WebSocket, use the session ID: $SESSION_ID"
echo "You can use a WebSocket client to connect to: ws://localhost:3001/terminal"
echo "And emit a 'join-session' event with: { \"sessionId\": \"$SESSION_ID\" }" 