# WebSocket Integration

This document describes how to use the WebSocket integration in the GAMGUI server.

## Overview

The WebSocket integration allows you to create dynamic sessions for GAM commands. Each session is a separate pod in Kubernetes, and you can connect to it using WebSockets. This enables real-time communication between the client and the GAM sessions.

## Architecture

The WebSocket infrastructure consists of the following components:

1. **WebSocket Proxy**: A Nginx proxy that routes WebSocket connections to the appropriate GAM session pod.
2. **GAM Session Pods**: Pods running the GAM container that handle GAM commands.
3. **Session Manager**: A CronJob that cleans up inactive sessions.
4. **WebSocket Adapter**: A class that provides methods for creating, connecting to, and managing WebSocket sessions.

## Setup

### Prerequisites

- A Kubernetes cluster
- `kubectl` command-line tool
- GAM credentials (oauth2.txt, client_secrets.json, oauth2service.json)

### Installation

To deploy the WebSocket infrastructure, run the following script:

```bash
./scripts/apply-websocket-infrastructure.sh
```

This script will:
1. Create the `gamgui` namespace if it doesn't exist
2. Create the `gam-service-account` service account if it doesn't exist
3. Create the `gam-credentials` secret if it doesn't exist
4. Apply the WebSocket infrastructure
5. Create a default session

### Configuration

The WebSocket integration is configured through environment variables:

- `WEBSOCKET_ENABLED`: Whether WebSocket sessions are enabled (true/false)
- `WEBSOCKET_PROXY_SERVICE_URL`: The URL of the WebSocket proxy service
- `WEBSOCKET_SESSION_CONNECTION_TEMPLATE`: The template for WebSocket session connections
- `WEBSOCKET_SESSION_PATH_TEMPLATE`: The template for WebSocket session paths
- `WEBSOCKET_MAX_SESSIONS`: The maximum number of concurrent WebSocket sessions
- `WEBSOCKET_SESSION_TIMEOUT`: The timeout for inactive sessions in milliseconds
- `WEBSOCKET_CLEANUP_INTERVAL`: The interval for cleaning up inactive sessions in milliseconds

## Usage

### Creating a Session

To create a new session, use the `create-websocket-session.sh` script:

```bash
./scripts/create-websocket-session.sh --id <session-id>
```

This will create a new GAM session pod with the specified ID.

### Testing a Session

To test a session, use the `test-websocket-session.sh` script:

```bash
./scripts/test-websocket-session.sh --id <session-id>
```

This will create a temporary pod that connects to the session and tests it.

### Testing the WebSocket Proxy

To test the WebSocket proxy, use the `test-websocket-proxy.sh` script:

```bash
./scripts/test-websocket-proxy.sh
```

This will create a temporary pod that connects to the WebSocket proxy and tests it.

## Integration with the Server

The server integrates with the WebSocket infrastructure through the `KubernetesWebSocketAdapter` class. This class provides methods for creating, connecting to, and managing WebSocket sessions.

### KubernetesWebSocketAdapter

The `KubernetesWebSocketAdapter` class is initialized in the `ContainerFactory` class and passed to the `KubernetesAdapter` class. The `KubernetesAdapter` class uses the adapter to create and manage WebSocket sessions.

```javascript
// Create WebSocket adapter if enabled
let websocketAdapter = null;
if (websocketEnabled) {
  websocketAdapter = new KubernetesWebSocketAdapter(config, logger);
  logger.info('Kubernetes WebSocket adapter created');
}

// Create Kubernetes adapter with WebSocket adapter
return new KubernetesAdapter(config, logger, websocketAdapter);
```

### Creating a Session

To create a session, the `KubernetesAdapter` class calls the `createSession` method of the `KubernetesWebSocketAdapter` class:

```javascript
// Create WebSocket session
const sessionInfo = await this.websocketAdapter.createSession(sessionId, {
  command: options.command || 'info domain',
  credentialsSecret: options.credentialsSecret || 'gam-credentials'
});
```

### Connecting to a Session

To connect to a session, the `KubernetesAdapter` class calls the `connectToSession` method of the `KubernetesWebSocketAdapter` class:

```javascript
// Connect to the session
const ws = await this.websocketAdapter.connectToSession(sessionId);
```

### Sending Commands

To send a command to a session, the `KubernetesAdapter` class calls the `sendCommand` method of the `KubernetesWebSocketAdapter` class:

```javascript
// Send the command
await this.websocketAdapter.sendCommand(sessionId, command);
```

### Closing a Session

To close a session, the `KubernetesAdapter` class calls the `closeSession` method of the `KubernetesWebSocketAdapter` class:

```javascript
// Close WebSocket session
await this.websocketAdapter.closeSession(sessionId);
```

## WebSocket URLs

The WebSocket URLs have the following format:

```
ws://websocket-proxy.gamgui.svc.cluster.local/ws/session/<session-id>/
```

For example, to connect to the default session:

```
ws://websocket-proxy.gamgui.svc.cluster.local/ws/session/default/
```

## Session Lifecycle

Sessions are automatically cleaned up after 1 hour of inactivity. The last activity time is stored in the `last_activity` annotation of the deployment.

## Troubleshooting

### Checking Logs

To check the logs of a session pod:

```bash
kubectl logs -n gamgui -l session_id=<session-id>
```

To check the logs of the WebSocket proxy:

```bash
kubectl logs -n gamgui -l app=websocket-proxy
```

### Restarting a Session

To restart a session, delete it and create it again:

```bash
kubectl delete deployment -n gamgui gam-session-<session-id>
kubectl delete service -n gamgui gam-session-<session-id>
./scripts/create-websocket-session.sh --id <session-id>
```

### Restarting the WebSocket Proxy

To restart the WebSocket proxy:

```bash
kubectl delete deployment -n gamgui websocket-proxy
kubectl apply -f kubernetes/websocket-infrastructure.yaml
