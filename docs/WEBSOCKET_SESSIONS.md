# WebSocket Sessions

This document explains how to solve the "Error joining session" problem that occurs when the client tries to connect to a session in Kubernetes.

## Problem

When the client tries to connect to a session in Kubernetes, it receives the error "Error joining session" and "Error: Not connected to a session". This happens because the client is trying to connect directly to the server, but the server is in Cloud Run and doesn't have direct access to the Kubernetes pods.

## Solution

The solution is to use a WebSocket proxy in Kubernetes to route WebSocket connections from the client to the Kubernetes pods. The client connects to the Cloud Run server, which in turn connects to the WebSocket proxy in Kubernetes, which routes the connection to the correct pod.

### Components

1. **WebSocket Proxy**: An Nginx proxy that routes WebSocket connections to Kubernetes pods.
2. **Session Template**: A template for creating new sessions in Kubernetes.
3. **Default Session**: A default session that is always available.
4. **Server Configuration**: Configuration of the server to use the WebSocket proxy.
5. **Client Configuration**: Configuration of the client to use the WebSocket proxy.

### Server Configuration

The server needs to be configured with the following environment variables:

```
WEBSOCKET_ENABLED=true
WEBSOCKET_PROXY_SERVICE_URL=websocket-proxy.gamgui.svc.cluster.local
WEBSOCKET_SESSION_CONNECTION_TEMPLATE=ws://websocket-proxy.gamgui.svc.cluster.local/ws/session/{{SESSION_ID}}/
WEBSOCKET_SESSION_PATH_TEMPLATE=/ws/session/{{SESSION_ID}}/
WEBSOCKET_MAX_SESSIONS=50
```

### Client Configuration

The client needs to be modified to use the WebSocket information returned by the server. The following changes were made:

1. Added `getSessionWebsocketInfo` to get WebSocket information from the server.
2. Modified `createSessionWebsocket` to use the WebSocket information.
3. Modified `connectToTerminal` to use the WebSocket connection if available.

### Infrastructure

The WebSocket infrastructure consists of the following components:

1. **WebSocket Proxy**: An Nginx proxy that routes WebSocket connections to the appropriate session.
2. **Session Template**: A template for creating new sessions.
3. **Default Session**: A default session that is always available.

### Scripts

The following scripts are available for managing the WebSocket infrastructure:

1. `apply-websocket-infrastructure.sh`: Applies the WebSocket infrastructure to Kubernetes.
2. `create-websocket-session.sh`: Creates a new WebSocket session.
3. `test-websocket-session.sh`: Tests a WebSocket session.
4. `test-websocket-proxy.sh`: Tests the WebSocket proxy.

## Implementation

### Server Side

1. Added WebSocket environment variables to the server's `.env` file.
2. Created a WebSocket proxy in Kubernetes.
3. Created a template for dynamic sessions.
4. Created a default session.

### Client Side

1. Modified the client to get WebSocket information from the server.
2. Modified the client to use the WebSocket connection if available.
3. Added error handling for WebSocket connections.

## Testing

To test the solution:

1. Apply the WebSocket infrastructure:
   ```bash
   cd gamgui-terraform
   ./apply-websocket-kubernetes.sh
   ```

2. Create a default session:
   ```bash
   cd gamgui-terraform
   ./scripts/create-websocket-session.sh --id default
   ```

3. Test the session:
   ```bash
   cd gamgui-terraform
   ./scripts/test-websocket-session.sh --id default
   ```

4. Start the server:
   ```bash
   cd gamgui-app/gamgui-server
   npm start
   ```

5. Start the client:
   ```bash
   cd gamgui-app/gamgui-client
   npm run dev
   ```

6. Open the client in a browser and create a new session.

## Troubleshooting

### Error: Error joining session

If you still see the "Error joining session" error, check the following:

1. Make sure the WebSocket proxy is running:
   ```bash
   kubectl get deployment websocket-proxy -n gamgui
   ```

2. Make sure the session exists:
   ```bash
   kubectl get deployment gam-session-<session-id> -n gamgui
   ```

3. Make sure the server is configured with the correct WebSocket environment variables.

4. Check the server logs for any errors:
   ```bash
   kubectl logs deployment/gamgui-server -n gamgui
   ```

5. Check the client console for any errors.

### Error: WebSocket connection failed

If the WebSocket connection fails, check the following:

1. Make sure the WebSocket proxy is running.
2. Make sure the session exists.
3. Make sure the WebSocket proxy is configured correctly.
4. Check the WebSocket proxy logs:
   ```bash
   kubectl logs deployment/websocket-proxy -n gamgui
   ```

## Conclusion

By using a WebSocket proxy in Kubernetes, we can solve the "Error joining session" problem that occurs when the client tries to connect to a session in Kubernetes. The client connects to the Cloud Run server, which in turn connects to the WebSocket proxy in Kubernetes, which routes the connection to the correct pod.
