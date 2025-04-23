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
- Kubernetes pod management (NEW)
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

### 3. Kubernetes Integration (NEW)

The application now supports running GAM sessions in Kubernetes pods:
- Isolated execution environment for each session
- Better resource management and scalability
- Automatic fallback to Docker if Kubernetes is not available
- Seamless user experience regardless of the backend

## Prerequisites

- Docker installed and running
- Node.js (v14+)
- Google Workspace Administrator access
- GAM credentials:
  - `oauth2service.json`
  - `oauth2.txt`
  - `client_secrets.json`
- For Kubernetes integration (optional):
  - Access to a Kubernetes cluster (e.g., GKE)
  - `kubectl` command-line tool configured
  - Kubernetes namespace and service account

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
- Create persistent sessions with running containers or Kubernetes pods
- Connect to active sessions
- Manage multiple concurrent sessions
- Automatic fallback between Kubernetes and Docker

### Terminal Interaction
- Real-time command execution via WebSocket
- Terminal emulation in the browser
- Command history and output viewing
- Execute commands in Kubernetes pods or Docker containers

### Credential Management
- Securely use GAM credentials in Docker containers and Kubernetes pods
- Support for multiple credential sets

### Kubernetes Integration (NEW)
- Run GAM sessions in isolated Kubernetes pods
- Better resource management and scalability
- Seamless user experience regardless of the backend
- Automatic pod cleanup when sessions end

### Terraform Integration (NEW)
- Support for Terraform-managed infrastructure
- Custom credential secrets for different sessions
- Improved error reporting for missing secrets
- Full session ID for better traceability

## Development

### Server Structure
- Express.js with RESTful API endpoints
- Socket.io for real-time communication
- Dockerode for Docker API integration
- Kubernetes client for pod management

### Frontend Structure
- React with React Router
- Tailwind CSS for styling
- xterm.js for terminal emulation

### Kubernetes Integration
- @kubernetes/client-node for Kubernetes API integration
- Pod templates for GAM sessions
- Fallback mechanism for environments without Kubernetes

## API Documentation

The application provides a RESTful API for interacting with GAM containers and Kubernetes pods. Key endpoints include:

- **Images**: `/api/images` - Manage Docker images
- **Sessions**: `/api/sessions` - Manage container sessions and Kubernetes pods
- **Credentials**: `/api/credentials` - Manage GAM credentials
- **Files**: `/api/sessions/:id/files` - File operations within sessions

For detailed API documentation, see the [Server README](gamgui-server/README.md), [Kubernetes Integration](gamgui-server/KUBERNETES_INTEGRATION.md), and [Terraform Integration](docs/TERRAFORM_INTEGRATION.md).

## WebSocket Integration

Real-time terminal interaction is facilitated through WebSockets:

- **Namespace**: `/terminal`
- **Events**:
  - `join-session`: Connect to a session (Docker container or Kubernetes pod)
  - `terminal-input`: Send commands to the session
  - `terminal-output`: Receive command output from the session
  - `session-joined`: Confirmation that the session was joined successfully
  - `session-left`: Confirmation that the session was left successfully
  - `error`: Error messages from the session

## License

[Add your license here]
