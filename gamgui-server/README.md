# GamGUI Server

Express API server for the GamGUI application.

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Create a `.env` file based on the `.env.example`:
   ```
   cp .env.example .env
   ```

3. Start the development server:
   ```
   npm run dev
   ```

## Docker Support

The server includes functionality to build and run Docker images with GAM (Google Admin Management) capabilities using the Dockerode library. To use this functionality:

1. Make sure Docker is installed and running on your system
2. Ensure Docker API is accessible (Dockerode connects to the Docker socket)
3. Place the required GAM credential files in the `gamgui-server/gam-credentials` directory:
   - `oauth2service.json`
   - `oauth2.txt`
   - `client_secrets.json`

## API Endpoints

### Images

- **Create a new Docker image**
  - POST `/api/images`
  - This endpoint will:
    1. Verify the GAM credentials exist in the `gam-credentials` directory
    2. Build a Docker image using the Dockerfile in the server directory
    3. Return details about the created image
  - Request Body:
    ```json
    {
      "name": "Image Name",
      "data": {}, // Optional additional data
      "metadata": {
        "property": "value" // Optional metadata
      }
    }
    ```
  - Response:
    ```json
    {
      "message": "Image created successfully",
      "image": {
        "id": "unique-uuid",
        "name": "Image Name",
        "imageName": "gam-image-name-12345678",
        "data": {},
        "metadata": {},
        "dockerBuildOutput": "Docker build output...",
        "createdAt": "2023-04-07T12:00:00.000Z"
      }
    }
    ```

- **Run a command in a Docker image**
  - POST `/api/images/:id/run`
  - Executes a command in the specified Docker container
  - Request Body:
    ```json
    {
      "command": "gam info domain"
    }
    ```
  - Response:
    ```json
    {
      "message": "Command executed successfully",
      "output": "Command output...",
      "exitCode": 0
    }
    ```

- **Get all images**
  - GET `/api/images`

- **Get image by ID**
  - GET `/api/images/:id`

### Sessions

- **Create a new session with a Docker container**
  - POST `/api/sessions`
  - Creates a new session with a running Docker container based on the specified image
  - Request Body:
    ```json
    {
      "name": "Session Name",
      "imageId": "image_id",
      "config": {
        "property": "value" // Optional configuration
      }
    }
    ```
  - Response:
    ```json
    {
      "message": "Session created successfully",
      "session": {
        "id": "unique-uuid",
        "name": "Session Name",
        "containerId": "docker-container-id",
        "containerName": "gam-session-12345678",
        "imageId": "image_id",
        "imageName": "gam-image-name-12345678",
        "config": {},
        "createdAt": "2023-04-07T12:00:00.000Z",
        "lastModified": "2023-04-07T12:00:00.000Z",
        "status": "active"
      }
    }
    ```

- **Get all sessions**
  - GET `/api/sessions`

- **Get session by ID**
  - GET `/api/sessions/:id`

- **Delete a session**
  - DELETE `/api/sessions/:id`
  - Stops and removes the Docker container associated with the session

## WebSocket Integration

The server provides real-time terminal interaction with Docker containers through WebSockets.

### Connecting to a Session Terminal

- **Namespace**: `/terminal`
- **Connection Steps**:
  1. Connect to the WebSocket server
  2. Join a session by emitting a `join-session` event with a session ID
  3. Send commands via `terminal-input` events
  4. Receive container output via `terminal-output` events

### WebSocket Events

- **Client to Server**:
  - `join-session`: Join a container session
    ```json
    { "sessionId": "session_id" }
    ```
  - `terminal-input`: Send terminal input to the container
    ```
    "command string\n"
    ```
  - `leave-session`: Disconnect from a session
    ```json
    { "sessionId": "session_id" }
    ```

- **Server to Client**:
  - `terminal-output`: Container terminal output
  - `session-joined`: Confirmation that client has joined the session
  - `terminal-closed`: Notification that the terminal session has ended
  - `error`: Error information

### Example (Using socket.io-client):

```javascript
import io from 'socket.io-client';

// Connect to socket
const socket = io('http://localhost:3001/terminal');

// Join a session
socket.emit('join-session', { sessionId: 'your-session-id' });

// Handle terminal output
socket.on('terminal-output', (data) => {
  console.log('Output:', data);
});

// Handle errors
socket.on('error', (data) => {
  console.error('Error:', data.message);
});

// Send commands
socket.emit('terminal-input', 'gam info domain\n');

// Leave session
socket.emit('leave-session', { sessionId: 'your-session-id' });
```
