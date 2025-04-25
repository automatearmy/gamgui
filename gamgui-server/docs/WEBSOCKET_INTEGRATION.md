# WebSocket Integration Guide

This document provides a guide on how to integrate the WebSocket infrastructure with the gamgui server.

## Overview

The WebSocket infrastructure allows the server to create and connect to WebSocket sessions in Kubernetes. Each session runs in a separate pod and can be accessed through a WebSocket proxy.

## Configuration

The WebSocket infrastructure is configured through environment variables in the `.env` file:

```
# WebSocket configuration
WEBSOCKET_ENABLED=true
WEBSOCKET_PROXY_SERVICE_URL=websocket-proxy.gamgui.svc.cluster.local
WEBSOCKET_SESSION_CONNECTION_TEMPLATE=ws://websocket-proxy.gamgui.svc.cluster.local/ws/session/{{SESSION_ID}}/
WEBSOCKET_SESSION_PATH_TEMPLATE=/ws/session/{{SESSION_ID}}/
WEBSOCKET_MAX_SESSIONS=50
```

- `WEBSOCKET_ENABLED`: Whether WebSocket sessions are enabled
- `WEBSOCKET_PROXY_SERVICE_URL`: The URL of the WebSocket proxy service
- `WEBSOCKET_SESSION_CONNECTION_TEMPLATE`: The template for WebSocket session connections
- `WEBSOCKET_SESSION_PATH_TEMPLATE`: The template for WebSocket session paths
- `WEBSOCKET_MAX_SESSIONS`: The maximum number of WebSocket sessions

## Infrastructure

The WebSocket infrastructure consists of the following components:

1. **WebSocket Proxy**: A Nginx proxy that routes WebSocket connections to the appropriate session
2. **Session Template**: A template for creating new sessions
3. **Default Session**: A default session that is always available

## Scripts

The following scripts are available for managing the WebSocket infrastructure:

1. `apply-websocket-infrastructure.sh`: Applies the WebSocket infrastructure to Kubernetes
2. `create-websocket-session.sh`: Creates a new WebSocket session
3. `test-websocket-session.sh`: Tests a WebSocket session
4. `test-websocket-proxy.sh`: Tests the WebSocket proxy

## Usage

### Applying the WebSocket Infrastructure

To apply the WebSocket infrastructure, run:

```bash
./scripts/apply-websocket-infrastructure.sh
```

This will create the WebSocket proxy, the session template, and a default session.

### Creating a Session

To create a new session, run:

```bash
./scripts/create-websocket-session.sh --id <session-id>
```

This will create a new session with the specified ID.

### Testing a Session

To test a session, run:

```bash
./scripts/test-websocket-session.sh --id <session-id>
```

This will create a test pod that connects to the session and tests the HTTP connection.

## Integration with the Server

The server uses the `KubernetesWebSocketAdapter` class to interact with the WebSocket infrastructure. This class provides methods for creating, connecting to, and managing WebSocket sessions.

### Creating a Session

```javascript
const sessionInfo = await kubernetesWebSocketAdapter.createSession(sessionId, {
  command: 'info domain',
  credentialsSecret: 'gam-credentials'
});
```

### Connecting to a Session

```javascript
const ws = await kubernetesWebSocketAdapter.connectToSession(sessionId);
```

### Sending a Command

```javascript
await kubernetesWebSocketAdapter.sendCommand(sessionId, command);
```

### Closing a Session

```javascript
await kubernetesWebSocketAdapter.closeSession(sessionId);
```

## Troubleshooting

### Error: Error joining session

If you encounter the error "Error joining session", check the following:

1. Make sure the WebSocket infrastructure is applied
2. Make sure the session exists
3. Make sure the WebSocket proxy is running
4. Make sure the server is configured to use the WebSocket infrastructure

### Error: WebSocket sessions are disabled

If you encounter the error "WebSocket sessions are disabled", make sure the `WEBSOCKET_ENABLED` environment variable is set to `true`.

### Error: Failed to connect to session

If you encounter the error "Failed to connect to session", check the following:

1. Make sure the session exists
2. Make sure the WebSocket proxy is running
3. Make sure the session is running
4. Make sure the WebSocket URL is correct

## Conclusion

The WebSocket infrastructure provides a way for the server to create and connect to WebSocket sessions in Kubernetes. By following this guide, you should be able to integrate the WebSocket infrastructure with the server and resolve any issues that may arise.
