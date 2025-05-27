# 🚀 Getting Started - GAMGUI Application

## 📋 Prerequisites

### Required Tools
```bash
- Node.js (v14+)
- Docker
- Google Cloud SDK (gcloud)
- kubectl (for Kubernetes integration)
```

### Required Credentials
- **Google Workspace Administrator** access
- **GAM credentials**:
  - `client_secrets.json`
  - `oauth2service.json`
  - `oauth2.txt`

## 🏗️ Project Structure

### Components
- **gamgui-client/**: React frontend application
- **gamgui-server/**: Express.js backend API
- **config/**: Environment configurations
- **scripts/**: Deployment and build scripts

### Architecture
- **Frontend**: React + Tailwind CSS + xterm.js
- **Backend**: Express.js + Socket.io + Docker/Kubernetes
- **Container Management**: Docker + Kubernetes pods
- **Real-time Communication**: WebSockets

## 🚀 Quick Setup

### 1. Clone and Install
```bash
git clone <repository-url>
cd gamgui-app

# Install server dependencies
cd gamgui-server
npm install

# Install client dependencies
cd ../gamgui-client
npm install
```

### 2. Setup Environment Files
```bash
# Server environment
cd ../gamgui-server
cp .env.example .env
# Edit .env with your configuration

# Client environment
cd ../gamgui-client
cp .env.example .env.development
# Edit .env.development with your settings
```

### 3. Setup GAM Credentials
```bash
# Create credentials directory
mkdir -p gamgui-server/gam-credentials

# Copy your GAM credential files:
# - client_secrets.json
# - oauth2service.json  
# - oauth2.txt
```

### 4. Start Development Servers
```bash
# Terminal 1: Start backend
cd gamgui-server
npm run dev

# Terminal 2: Start frontend
cd gamgui-client
npm run dev
```

### 5. Access Application
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001

## ⚙️ Configuration

### Environment Variables

#### Server (.env)
```bash
PORT=3001
PROJECT_ID=your-gcp-project
GKE_CLUSTER_NAME=your-cluster
GKE_CLUSTER_LOCATION=us-central1
K8S_NAMESPACE=gamgui
GAM_IMAGE=gcr.io/your-project/docker-gam7:latest
```

#### Client (.env.development)
```bash
VITE_API_BASE_URL=http://localhost:3001
VITE_WEBSOCKET_URL=ws://localhost:3001
```

## 🔧 Development Workflow

### Running Tests
```bash
# Server tests
cd gamgui-server
npm test

# Client tests
cd gamgui-client
npm test
```

### Building for Production
```bash
# Build client
cd gamgui-client
npm run build

# Build server (if needed)
cd gamgui-server
npm run build
```

## 🐳 Docker Development

### Build Images
```bash
# Build client image
cd gamgui-client
docker build -t gamgui-client .

# Build server image
cd gamgui-server
docker build -t gamgui-server .
```

## ☸️ Kubernetes Integration

### Prerequisites
```bash
# Configure kubectl
gcloud container clusters get-credentials your-cluster \
  --region us-central1 --project your-project

# Verify connection
kubectl get nodes
```

### Features
- **Isolated GAM sessions** in Kubernetes pods
- **Automatic fallback** to Docker if K8s unavailable
- **Resource management** and scalability
- **Session persistence** and cleanup

## 🔍 Verification

### Test Backend
```bash
curl http://localhost:3001/api/health
```

### Test Frontend
- Open http://localhost:5173
- Check console for errors
- Verify WebSocket connection

### Test GAM Integration
1. **Upload credentials** via Settings page
2. **Create new session**
3. **Execute GAM command**: `gam info domain`

## 📚 Next Steps

- [Development Guide](DEVELOPMENT.md) - Detailed development workflow
- [Deployment Guide](DEPLOYMENT.md) - Production deployment
- [API Reference](API_REFERENCE.md) - Complete API documentation
- [Troubleshooting](TROUBLESHOOTING.md) - Common issues and solutions

## 🆘 Quick Troubleshooting

### Common Issues
- **Port conflicts**: Change ports in .env files
- **Credential errors**: Verify GAM files are in correct location
- **Docker issues**: Ensure Docker is running
- **Kubernetes errors**: Check cluster connectivity

### Getting Help
1. Check the [Troubleshooting Guide](TROUBLESHOOTING.md)
2. Verify all prerequisites are installed
3. Check environment variable configuration
4. Review application logs
