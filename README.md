# GamGUI - Google Admin Management GUI

GamGUI is a web-based graphical user interface for Google Admin Management (GAM), providing an easy-to-use interface for managing Google Workspace domains through containerized environments.

## Overview

GamGUI simplifies Google Workspace administration by:

1. Containerizing GAM tools in Docker containers
2. Providing a modern web interface for interaction
3. Allowing real-time terminal access to GAM commands
4. Supporting session management and persistence

## Architecture

The application consists of two main components:

### 1. Backend Server (gamgui-server)

An Express.js API server that provides:
- Docker container management
- Session handling
- Real-time terminal interaction via WebSockets
- Credential management
- File operations

### 2. Frontend Application (gamgui-app)

A React-based web application that offers:
- User-friendly interface for GAM operations
- Terminal emulation using xterm.js
- Session management UI
- Responsive design with Tailwind CSS

## Prerequisites

- Docker installed and running
- Node.js (v14+)
- Google Workspace Administrator access
- GAM credentials:
  - `oauth2service.json`
  - `oauth2.txt`
  - `client_secrets.json`

## Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd gamgui
```

### 2. Set up the server

```bash
cd gamgui-server
npm install
cp .env.example .env
```

Edit the `.env` file with your configuration.

### 3. Set up credentials

Place your GAM credential files in the `gamgui-server/gam-credentials` directory:
- `oauth2service.json`
- `oauth2.txt`
- `client_secrets.json`

### 4. Set up the frontend

```bash
cd ../gamgui-app
npm install
```

### 5. Start the server

```bash
cd ../gamgui-server
npm run dev
```

### 6. Start the frontend

```bash
cd ../gamgui-app
npm run dev
```

Access the application at: http://localhost:5173

## Features

### Docker Image Management
- Create Docker images with GAM capabilities
- Execute one-off commands in Docker images
- View available images

### Session Management
- Create persistent sessions with running containers
- Connect to active sessions
- Manage multiple concurrent sessions

### Terminal Interaction
- Real-time command execution via WebSocket
- Terminal emulation in the browser
- Command history and output viewing

### Credential Management
- Securely use GAM credentials in Docker containers
- Support for multiple credential sets

## Development

### Server Structure
- Express.js with RESTful API endpoints
- Socket.io for real-time communication
- Dockerode for Docker API integration

### Frontend Structure
- React with React Router
- Tailwind CSS for styling
- xterm.js for terminal emulation

## API Documentation

The application provides a RESTful API for interacting with GAM containers. Key endpoints include:

- **Images**: `/api/images` - Manage Docker images
- **Sessions**: `/api/sessions` - Manage container sessions
- **Credentials**: `/api/credentials` - Manage GAM credentials
- **Files**: `/api/sessions/:id/files` - File operations within sessions

For detailed API documentation, see the [Server README](gamgui-server/README.md).

## WebSocket Integration

Real-time terminal interaction is facilitated through WebSockets:

- **Namespace**: `/terminal`
- **Events**:
  - `join-session`: Connect to a session
  - `terminal-input`: Send commands
  - `terminal-output`: Receive command output

## License

[Add your license here] 