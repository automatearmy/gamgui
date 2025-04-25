# GAMGUI Server

The GAMGUI Server provides a backend for the GAMGUI application, which allows users to interact with GAM (Google Apps Manager) through a web interface.

## Code Structure

The server code has been refactored to follow a modular, service-oriented architecture with clear separation of concerns. The main components are:

### Services

Services are organized into logical modules with clear responsibilities:

- **Session Service**: Manages user sessions
- **Container Service**: Provides an abstraction for container operations (Docker and Kubernetes)
- **Terminal Service**: Handles terminal operations and command execution
- **WebSocket Service**: Manages WebSocket connections and events

### Configuration

- **config/**: Contains configuration settings for the application

### Utilities

- **utils/**: Contains utility functions and classes
  - **logger.js**: Logging utility
  - **errorHandler.js**: Error handling utilities
  - **dockerGam.js**: Utility for executing GAM commands in Docker
  - **kubernetesClient.js**: Utility for interacting with Kubernetes

### Routes

- **routes/**: Contains HTTP route handlers
  - **socketHandler.js**: Main entry point for WebSocket connections

## Architecture

The application follows these architectural principles:

1. **Dependency Injection**: Services accept dependencies through constructors
2. **Adapter Pattern**: For container implementations (Kubernetes, Docker)
3. **Repository Pattern**: For session data access
4. **Factory Pattern**: For creating appropriate service instances
5. **Observer Pattern**: For WebSocket event handling
6. **Strategy Pattern**: For command execution strategies
7. **Single Responsibility Principle**: Each class has one reason to change

## Class Diagram

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ WebSocketService│────▶│  SocketManager  │     │  EventHandlers  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                                              ▲
         │                                              │
         ▼                                              │
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ SessionService  │────▶│SessionRepository│     │ TerminalService │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                                              ▲
         │                                              │
         ▼                                              │
┌─────────────────┐                            ┌─────────────────┐
│ContainerService │◀───┐                       │ CommandService  │
└─────────────────┘    │                       └─────────────────┘
         ▲             │                              ▲
         │             │                              │
┌────────┴────────┐    │                     ┌────────┴────────┐
│KubernetesAdapter│    │                     │VirtualFileSystem│
└─────────────────┘    │                     └─────────────────┘
                       │
                       │
               ┌───────┴───────┐
               │ DockerAdapter │
               └───────────────┘
```

## WebSocket Communication

The server supports two types of WebSocket connections:

1. **Terminal Namespace** (`/terminal`): For terminal connections
   - Events: `join-session`, `leave-session`, `terminal-input`, `terminal-output`

2. **Session Namespace** (`/ws/session/:sessionId/`): For session-specific connections
   - Events: `input`, `output`, `connected`, `error`

## Container Support

The server supports two types of containers:

1. **Docker**: Uses Docker containers for GAM commands
2. **Kubernetes**: Uses Kubernetes pods for GAM commands

The appropriate container implementation is selected based on configuration.

## Error Handling

The application uses a consistent error handling approach:

1. **Custom Error Classes**: For different types of errors
2. **Error Propagation**: Errors are propagated up the call stack
3. **Error Logging**: Errors are logged with context
4. **Client Notification**: Clients are notified of errors via WebSocket events

## Logging

The application uses a consistent logging approach:

1. **Log Levels**: Debug, Info, Warning, Error
2. **Context**: Logs include context information
3. **Timestamps**: Logs include timestamps

## Configuration

The application is configured via environment variables and a configuration file:

1. **Environment Variables**: For sensitive information
2. **Configuration File**: For application settings

## Usage

To start the server:

```bash
npm start
```

To run in development mode:

```bash
npm run dev
```

## Dependencies

- **Socket.IO**: For WebSocket communication
- **Express**: For HTTP routing
- **@kubernetes/client-node**: For Kubernetes integration
- **uuid**: For generating unique IDs
