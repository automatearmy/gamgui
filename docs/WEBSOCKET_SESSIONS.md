# Websocket Sessions for GAM

This document describes how to use the websocket session feature in the GAM application.

## Overview

The application has been enhanced to support websocket connections to GAM sessions. This allows real-time interaction with GAM commands through a websocket connection, which is particularly useful for building interactive web applications that need to communicate with GAM in real-time.

## How It Works

When a new session is created:

1. A dedicated Kubernetes deployment is created with a unique session ID
2. A session-specific service is created to route traffic to the pod
3. An ingress rule is added to expose the websocket endpoint
4. The websocket connection is proxied to the GAM container

The websocket connection is available at the path `/ws/session/{SESSION_ID}/` on the ingress host.

## Server-Side Implementation

### Kubernetes Resources

The Terraform configuration creates the following Kubernetes resources for each session:

1. **Deployment**: A deployment with the session ID in the name and labels
2. **Service**: A service that routes traffic to the deployment
3. **Ingress Rule**: An ingress rule that exposes the websocket endpoint

### Server API

The server API has been enhanced with the following endpoints:

1. **POST /api/sessions**: Creates a new session and returns websocket information
2. **GET /api/sessions/:id/websocket**: Gets websocket information for a session

### Websocket Server

The server uses Socket.io to handle websocket connections. The following namespaces are available:

1. **/terminal**: The existing namespace for terminal connections
2. **/ws/session/:sessionId/**: A new namespace for session-specific websocket connections

## Client-Side Implementation

### API Functions

The client API has been enhanced with the following functions:

1. **createSession**: Creates a new session and returns websocket information
2. **getSessionWebsocketInfo**: Gets websocket information for a session

### Websocket Client

The client uses Socket.io to connect to the websocket server. The following functions are available:

1. **createTerminalConnection**: Creates a connection to the terminal namespace
2. **createSessionWebsocket**: Creates a connection to a session-specific namespace

## Usage

### Creating a New Session

```javascript
import { createSession, getSessionWebsocketInfo } from './api';
import { createSessionWebsocket } from './socket';

// Create a new session
const response = await createSession('My Session', 'default-gam-image');
const { session, websocketInfo } = response;

// Connect to the session
const socket = createSessionWebsocket(session.id);

// Listen for messages
socket.on('output', (data) => {
  console.log('Received output:', data);
});

// Send commands
socket.emit('input', 'gam info domain');
```

### Getting Websocket Information for an Existing Session

```javascript
import { getSessionWebsocketInfo } from './api';
import { createSessionWebsocket } from './socket';

// Get websocket information for a session
const websocketInfo = await getSessionWebsocketInfo('session-id');

// Connect to the session
const socket = createSessionWebsocket('session-id');

// Listen for messages
socket.on('output', (data) => {
  console.log('Received output:', data);
});

// Send commands
socket.emit('input', 'gam info domain');
```

## Websocket Events

### Client to Server

1. **input**: Send a command to the session

```javascript
socket.emit('input', 'gam info domain');
```

### Server to Client

1. **output**: Receive output from the session

```javascript
socket.on('output', (data) => {
  console.log('Received output:', data);
});
```

2. **connected**: Receive a connection confirmation

```javascript
socket.on('connected', (data) => {
  console.log('Connected to session:', data.sessionId);
});
```

3. **error**: Receive an error message

```javascript
socket.on('error', (data) => {
  console.error('Error:', data.message);
});
```

## Example: Creating a Simple Terminal

```javascript
import React, { useEffect, useState } from 'react';
import { createSession } from './api';
import { createSessionWebsocket } from './socket';

function Terminal() {
  const [sessionId, setSessionId] = useState(null);
  const [socket, setSocket] = useState(null);
  const [output, setOutput] = useState('');
  const [input, setInput] = useState('');

  useEffect(() => {
    async function createNewSession() {
      const response = await createSession('My Session', 'default-gam-image');
      const { session } = response;
      setSessionId(session.id);

      const newSocket = createSessionWebsocket(session.id);
      setSocket(newSocket);

      newSocket.on('output', (data) => {
        setOutput((prev) => prev + data);
      });

      newSocket.on('connected', (data) => {
        console.log('Connected to session:', data.sessionId);
      });

      newSocket.on('error', (data) => {
        console.error('Error:', data.message);
      });
    }

    createNewSession();

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (socket && input) {
      socket.emit('input', input);
      setInput('');
    }
  };

  return (
    <div>
      <div
        style={{
          height: '400px',
          overflow: 'auto',
          backgroundColor: '#000',
          color: '#fff',
          padding: '10px',
          fontFamily: 'monospace',
          whiteSpace: 'pre-wrap',
        }}
      >
        {output}
      </div>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          style={{ width: '100%', padding: '5px' }}
        />
      </form>
    </div>
  );
}

export default Terminal;
```

## Security Considerations

1. **Authentication**: The websocket endpoint should be protected with authentication to prevent unauthorized access.
2. **Rate Limiting**: Implement rate limiting to prevent abuse of the websocket API.
3. **Session Isolation**: Each session is isolated in its own pod to prevent interference between sessions.
4. **Resource Limits**: Set appropriate resource limits to prevent a single session from consuming too many resources.
5. **Session Cleanup**: Inactive sessions are automatically cleaned up to prevent resource leaks.

## Troubleshooting

### Common Issues

1. **Connection Refused**: Make sure the ingress is properly configured and the service is running.
2. **Connection Closed**: Check the pod logs for errors.
3. **Session Not Found**: Make sure the session ID is correct and the session is still active.

### Debugging

To debug a websocket session:

1. Check the pod logs:
   ```bash
   kubectl logs -n gamgui -l session_id=my-session-123
   ```

2. Check the service:
   ```bash
   kubectl describe service gam-service-my-session-123 -n gamgui
   ```

3. Check the ingress:
   ```bash
   kubectl describe ingress gam-ingress -n gamgui
   ```

4. Test the websocket connection:
   ```bash
   # Using wscat (install with: npm install -g wscat)
   wscat -c wss://gamgui.example.com/ws/session/my-session-123/
   ```

## Future Improvements

1. **Session Authentication**: Add support for authenticating websocket sessions.
2. **Session Metrics**: Collect metrics on session usage and performance.
3. **Session Logs**: Provide access to session logs through the websocket connection.
4. **Session Events**: Send events to the client when the session state changes.
5. **Session Reconnection**: Add support for reconnecting to a session if the connection is lost.
