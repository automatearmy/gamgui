# 🔧 Development Guide - GAMGUI Application

## 🏗️ Development Environment Setup

### Prerequisites Verification
```bash
# Check Node.js version
node --version  # Should be v14+

# Check Docker
docker --version
docker ps  # Should connect without errors

# Check gcloud
gcloud --version
gcloud auth list  # Should show authenticated account

# Check kubectl (optional)
kubectl version --client
```

## 📁 Project Structure Deep Dive

### Frontend (gamgui-client)
```
gamgui-client/
├── src/
│   ├── components/          # Reusable UI components
│   ├── pages/              # Page components
│   ├── lib/                # Utility functions
│   ├── assets/             # Static assets
│   └── App.tsx             # Main application
├── public/                 # Public assets
├── package.json            # Dependencies and scripts
├── vite.config.ts          # Vite configuration
└── Dockerfile              # Container build
```

### Backend (gamgui-server)
```
gamgui-server/
├── routes/                 # API route handlers
├── middleware/             # Express middleware
├── services/               # Business logic
├── utils/                  # Utility functions
├── config/                 # Configuration files
├── kubernetes/             # K8s resource definitions
├── gam-credentials/        # GAM credential files (local only)
├── temp-uploads/           # Temporary file uploads
├── server.js               # Main server file
└── Dockerfile              # Container build
```

## 🔄 Development Workflow

### Starting Development
```bash
# 1. Start backend with hot reload
cd gamgui-server
npm run dev  # Uses nodemon for auto-restart

# 2. Start frontend with hot reload
cd gamgui-client
npm run dev  # Uses Vite dev server
```

### Code Quality
```bash
# Linting
cd gamgui-client
npm run lint
npm run lint:fix

# Type checking (TypeScript)
npm run type-check

# Formatting
npm run format
```

### Testing
```bash
# Unit tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

## 🔌 API Development

### Adding New Endpoints
1. **Create route handler** in `routes/`
2. **Add middleware** if needed
3. **Update server.js** to register route
4. **Add tests** for the endpoint
5. **Update API documentation**

### Example Route
```javascript
// routes/exampleRoutes.js
const express = require('express');
const router = express.Router();

router.get('/example', async (req, res) => {
  try {
    // Business logic here
    res.json({ message: 'Success' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

## 🎨 Frontend Development

### Component Structure
```typescript
// src/components/ExampleComponent.tsx
import React from 'react';

interface ExampleProps {
  title: string;
  onAction: () => void;
}

export const ExampleComponent: React.FC<ExampleProps> = ({ 
  title, 
  onAction 
}) => {
  return (
    <div className="p-4 border rounded">
      <h2 className="text-xl font-bold">{title}</h2>
      <button 
        onClick={onAction}
        className="mt-2 px-4 py-2 bg-blue-500 text-white rounded"
      >
        Action
      </button>
    </div>
  );
};
```

### State Management
- **Local state**: React useState/useReducer
- **Global state**: Context API or external library
- **Server state**: React Query or SWR

### Styling
- **Framework**: Tailwind CSS
- **Components**: Custom components with Tailwind
- **Responsive**: Mobile-first approach

## 🐳 Container Development

### Building Images
```bash
# Build development images
docker build -t gamgui-client:dev ./gamgui-client
docker build -t gamgui-server:dev ./gamgui-server

# Build production images
docker build -t gamgui-client:prod ./gamgui-client --target production
docker build -t gamgui-server:prod ./gamgui-server --target production
```

### Local Container Testing
```bash
# Run server container
docker run -p 3001:3001 \
  -e PROJECT_ID=your-project \
  -v $(pwd)/gamgui-server/gam-credentials:/app/gam-credentials \
  gamgui-server:dev

# Run client container
docker run -p 5173:5173 \
  -e VITE_API_BASE_URL=http://localhost:3001 \
  gamgui-client:dev
```

## ☸️ Kubernetes Development

### Local K8s Testing
```bash
# Apply development manifests
kubectl apply -f gamgui-server/kubernetes/

# Port forward for testing
kubectl port-forward service/gamgui-server 3001:3001

# Check logs
kubectl logs -f deployment/gamgui-server
```

### Development Namespace
```bash
# Create development namespace
kubectl create namespace gamgui-dev

# Set as default
kubectl config set-context --current --namespace=gamgui-dev
```

## 🔧 Environment Configuration

### Development Environment
```bash
# gamgui-server/.env
NODE_ENV=development
PORT=3001
PROJECT_ID=gamgui-tf1-edu
GKE_CLUSTER_NAME=gamgui-cluster
GKE_CLUSTER_LOCATION=us-central1
K8S_NAMESPACE=gamgui
GAM_IMAGE=gcr.io/gamgui-registry/docker-gam7:latest
WEBSOCKET_ENABLED=true
USE_MOCK_CONTAINER_ADAPTER=false
```

```bash
# gamgui-client/.env.development
VITE_API_BASE_URL=http://localhost:3001
VITE_WEBSOCKET_URL=ws://localhost:3001
VITE_ENVIRONMENT=development
```

## 🧪 Testing Strategy

### Unit Tests
- **Frontend**: Jest + React Testing Library
- **Backend**: Jest + Supertest
- **Coverage**: Aim for >80%

### Integration Tests
- **API endpoints**: Full request/response cycle
- **WebSocket**: Real-time communication
- **Container operations**: Docker/K8s integration

### E2E Tests
- **User workflows**: Complete user journeys
- **Cross-browser**: Chrome, Firefox, Safari
- **Mobile**: Responsive design testing

## 🔍 Debugging

### Backend Debugging
```bash
# Debug mode with inspector
npm run debug

# Attach debugger (VS Code)
# Use "Attach to Node" configuration
```

### Frontend Debugging
- **Browser DevTools**: React Developer Tools
- **Network tab**: API request inspection
- **Console**: Error tracking and logging

### Container Debugging
```bash
# Enter running container
docker exec -it <container-id> /bin/bash

# Check container logs
docker logs <container-id>

# Debug Kubernetes pods
kubectl exec -it <pod-name> -- /bin/bash
kubectl describe pod <pod-name>
```

## 📊 Performance Monitoring

### Frontend Performance
- **Lighthouse**: Performance audits
- **Bundle analysis**: Webpack Bundle Analyzer
- **Core Web Vitals**: LCP, FID, CLS

### Backend Performance
- **Response times**: API endpoint monitoring
- **Memory usage**: Node.js heap monitoring
- **Database queries**: Query performance

## 🔄 Hot Reload Configuration

### Backend (Nodemon)
```json
// nodemon.json
{
  "watch": ["*.js", "routes/", "middleware/", "services/"],
  "ext": "js,json",
  "ignore": ["node_modules/", "temp-uploads/"],
  "exec": "node server.js"
}
```

### Frontend (Vite)
```typescript
// vite.config.ts
export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001'
    }
  }
});
```

## 📚 Development Resources

### Documentation
- [React Documentation](https://reactjs.org/docs)
- [Express.js Guide](https://expressjs.com/en/guide)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Socket.io Documentation](https://socket.io/docs)

### Tools
- **VS Code Extensions**: ES7+ React snippets, Tailwind IntelliSense
- **Browser Extensions**: React Developer Tools, Redux DevTools
- **CLI Tools**: gcloud, kubectl, docker

## 🚀 Next Steps

- [Deployment Guide](DEPLOYMENT.md) - Production deployment
- [API Reference](API_REFERENCE.md) - Complete API documentation
- [Troubleshooting](TROUBLESHOOTING.md) - Common development issues
