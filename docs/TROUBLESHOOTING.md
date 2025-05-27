# 🔧 Troubleshooting - GAMGUI Application

## 🚨 Common Issues

### 1. Environment Setup Issues

#### Node.js Version Mismatch
```
Error: Unsupported Node.js version
```

**Solution:**
```bash
# Check current version
node --version

# Install Node.js v14+ using nvm
nvm install 16
nvm use 16
```

#### Port Already in Use
```
Error: listen EADDRINUSE :::3001
```

**Solution:**
```bash
# Find process using port
lsof -i :3001

# Kill process
kill -9 <PID>

# Or change port in .env
PORT=3002
```

### 2. Docker Issues

#### Docker Not Running
```
Error: Cannot connect to the Docker daemon
```

**Solution:**
```bash
# Start Docker Desktop (macOS/Windows)
# Or start Docker service (Linux)
sudo systemctl start docker

# Verify Docker is running
docker ps
```

#### Permission Denied
```
Error: permission denied while trying to connect to Docker daemon
```

**Solution:**
```bash
# Add user to docker group (Linux)
sudo usermod -aG docker $USER
newgrp docker

# Or use sudo (temporary)
sudo docker ps
```

### 3. GAM Credentials Issues

#### Missing Credential Files
```
Error: ENOENT: no such file or directory 'gam-credentials/client_secrets.json'
```

**Solution:**
```bash
# Create credentials directory
mkdir -p gamgui-server/gam-credentials

# Copy your GAM files:
cp /path/to/client_secrets.json gamgui-server/gam-credentials/
cp /path/to/oauth2service.json gamgui-server/gam-credentials/
cp /path/to/oauth2.txt gamgui-server/gam-credentials/
```

#### Invalid Credentials
```
Error: Invalid client secrets file
```

**Solution:**
1. **Verify file format** - should be valid JSON
2. **Check file permissions** - should be readable
3. **Regenerate credentials** if corrupted
4. **Verify OAuth scopes** are correct

### 4. Kubernetes Issues

#### Cluster Connection Failed
```
Error: Unable to connect to the server
```

**Solution:**
```bash
# Configure kubectl
gcloud container clusters get-credentials gamgui-cluster \
  --region us-central1 --project gamgui-tf1-edu

# Verify connection
kubectl get nodes

# Check current context
kubectl config current-context
```

#### Namespace Not Found
```
Error: namespaces "gamgui" not found
```

**Solution:**
```bash
# Create namespace
kubectl create namespace gamgui

# Or apply from manifest
kubectl apply -f gamgui-server/kubernetes/
```

#### Pod Creation Failed
```
Error: pods is forbidden: failed quota
```

**Solution:**
```bash
# Check resource quotas
kubectl describe quota -n gamgui

# Check resource requests in pod spec
kubectl describe pod <pod-name> -n gamgui

# Adjust resource limits if needed
```

### 5. WebSocket Issues

#### Connection Failed
```
Error: WebSocket connection failed
```

**Solution:**
```bash
# Check server is running
curl http://localhost:3001/api/health

# Verify WebSocket endpoint
curl -i -N -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  http://localhost:3001/socket.io/

# Check firewall/proxy settings
```

#### Session Not Found
```
Error: Session not found or not running
```

**Solution:**
1. **Verify session exists**: Check active sessions in UI
2. **Check container status**: `docker ps` or `kubectl get pods`
3. **Restart session**: Delete and recreate session
4. **Check logs**: Server logs for session creation errors

### 6. Frontend Issues

#### Build Failures
```
Error: Failed to resolve import
```

**Solution:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache
rm -rf .vite
npm run dev
```

#### API Connection Issues
```
Error: Network Error / CORS Error
```

**Solution:**
```bash
# Check API base URL in .env.development
VITE_API_BASE_URL=http://localhost:3001

# Verify server is running
curl http://localhost:3001/api/health

# Check CORS configuration in server
```

### 7. Google Cloud Issues

#### Authentication Failed
```
Error: Application Default Credentials not found
```

**Solution:**
```bash
# Login to gcloud
gcloud auth login
gcloud auth application-default login

# Set project
gcloud config set project gamgui-tf1-edu

# Verify authentication
gcloud auth list
```

#### Project Access Denied
```
Error: User does not have permission to access project
```

**Solution:**
```bash
# Check current account
gcloud config list account

# Switch to correct account
gcloud config set account your-account@gedu.demo.automatearmy.com

# Verify project access
gcloud projects describe gamgui-tf1-edu
```

## 🔍 Debugging Commands

### Application Health Checks
```bash
# Backend health
curl http://localhost:3001/api/health

# Frontend accessibility
curl -I http://localhost:5173

# WebSocket connectivity
curl -i -N -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  http://localhost:3001/socket.io/
```

### Container Debugging
```bash
# List running containers
docker ps

# Check container logs
docker logs <container-id>

# Enter container shell
docker exec -it <container-id> /bin/bash

# Inspect container
docker inspect <container-id>
```

### Kubernetes Debugging
```bash
# Check cluster status
kubectl cluster-info

# List all resources
kubectl get all -n gamgui

# Check pod logs
kubectl logs -f <pod-name> -n gamgui

# Describe problematic resources
kubectl describe pod <pod-name> -n gamgui
kubectl describe service <service-name> -n gamgui

# Check events
kubectl get events -n gamgui --sort-by='.lastTimestamp'
```

### Network Debugging
```bash
# Check port availability
netstat -tulpn | grep :3001

# Test connectivity
telnet localhost 3001

# Check DNS resolution
nslookup gamgui-server-1381612022.us-central1.run.app
```

## 📊 Log Analysis

### Server Logs
```bash
# Development logs
cd gamgui-server
npm run dev  # Watch console output

# Production logs (Docker)
docker logs -f <container-id>

# Production logs (Kubernetes)
kubectl logs -f deployment/gamgui-server -n gamgui
```

### Client Logs
- **Browser Console**: F12 → Console tab
- **Network Tab**: Check API requests/responses
- **React DevTools**: Component state and props

### Common Log Patterns
```bash
# Authentication errors
grep -i "auth" logs/*.log

# Database connection issues
grep -i "connection" logs/*.log

# WebSocket errors
grep -i "websocket\|socket.io" logs/*.log
```

## 🔄 Recovery Procedures

### Reset Development Environment
```bash
# Stop all services
pkill -f "node.*server.js"
pkill -f "vite"

# Clean dependencies
cd gamgui-server && rm -rf node_modules package-lock.json
cd ../gamgui-client && rm -rf node_modules package-lock.json

# Reinstall
cd ../gamgui-server && npm install
cd ../gamgui-client && npm install

# Restart services
cd ../gamgui-server && npm run dev &
cd ../gamgui-client && npm run dev &
```

### Reset Docker Environment
```bash
# Stop all containers
docker stop $(docker ps -q)

# Remove containers
docker rm $(docker ps -aq)

# Remove images (optional)
docker rmi gamgui-client gamgui-server

# Rebuild images
docker build -t gamgui-client ./gamgui-client
docker build -t gamgui-server ./gamgui-server
```

### Reset Kubernetes Resources
```bash
# Delete all resources in namespace
kubectl delete all --all -n gamgui

# Recreate namespace
kubectl delete namespace gamgui
kubectl create namespace gamgui

# Reapply manifests
kubectl apply -f gamgui-server/kubernetes/
```

## 🆘 Getting Help

### Information to Collect
When reporting issues, include:

1. **Environment details**:
   ```bash
   node --version
   npm --version
   docker --version
   kubectl version --client
   ```

2. **Error messages**: Full error output
3. **Steps to reproduce**: Exact sequence of actions
4. **Configuration**: Relevant .env variables (redacted)
5. **Logs**: Recent application logs

### Log Collection Script
```bash
#!/bin/bash
echo "=== GAMGUI Debug Information ==="
echo "Date: $(date)"
echo "Node: $(node --version)"
echo "NPM: $(npm --version)"
echo "Docker: $(docker --version)"
echo ""
echo "=== Server Logs ==="
docker logs gamgui-server 2>&1 | tail -50
echo ""
echo "=== Kubernetes Status ==="
kubectl get all -n gamgui
echo ""
echo "=== Recent Events ==="
kubectl get events -n gamgui --sort-by='.lastTimestamp' | tail -10
```

### Support Channels
1. **Check documentation** first
2. **Search existing issues** in repository
3. **Create detailed issue** with debug information
4. **Include reproduction steps** and environment details

## 📚 Related Documentation

- [Getting Started](GETTING_STARTED.md) - Initial setup
- [Development Guide](DEVELOPMENT.md) - Development workflow
- [Deployment Guide](DEPLOYMENT.md) - Production deployment
- [API Reference](API_REFERENCE.md) - API documentation
