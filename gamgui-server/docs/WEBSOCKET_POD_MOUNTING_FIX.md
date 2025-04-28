# WebSocket Pod Mounting Fix

## Issue

We identified an issue with the Kubernetes pod configuration for GAM sessions. The pods were failing to start with the following error:

```
Error: failed to create containerd task: failed to create shim task: OCI runtime create failed: runc create failed: unable to start container process: error during container init: error mounting "/var/lib/kubelet/pods/.../volume-subpaths/gam-config/gam-container/2" to rootfs at "/root/.gam/gam.cfg": mount /var/lib/kubelet/pods/.../volume-subpaths/gam-config/gam-container/2:/root/.gam/gam.cfg (via /proc/self/fd/6), flags: 0x5001: not a directory: unknown
```

The issue was caused by a conflict in the volume mounts. The pod configuration was trying to mount both:

1. The `gam-credentials` secret at `/root/.gam`
2. The `gam-config` ConfigMap at `/root/.gam/gam.cfg`

This creates a conflict because you can't mount a file at a path that's already mounted as a directory.

## Solution

We modified the pod configuration to use the same approach as the default session, which works correctly:

1. Mount the `gam-credentials` secret at `/root/.gam/credentials` instead of `/root/.gam`
2. Remove the `gam-config` ConfigMap mount
3. Create the `gam.cfg` file directly in the container using a bash script

### Changes Made

1. Created a fixed version of the `manage-websocket-sessions.sh` script that uses the correct volume mounts
2. Created a fixed version of the `KubernetesAdapter.js` file that uses the correct volume mounts

### Implementation Details

#### Volume Mounts - Before

```javascript
volumeMounts: [
  {
    name: 'gam-credentials',
    mountPath: '/root/.gam'
  },
  {
    name: 'gam-uploads',
    mountPath: '/gam/uploads'
  },
  {
    name: 'gam-config',
    mountPath: '/root/.gam/gam.cfg',
    subPath: 'gam.cfg'
  }
]
```

#### Volume Mounts - After

```javascript
volumeMounts: [
  {
    name: 'gam-credentials',
    mountPath: '/root/.gam/credentials',
    readOnly: true
  },
  {
    name: 'gam-uploads',
    mountPath: '/gam/uploads'
  }
]
```

#### Container Configuration - Before

```javascript
command: ['/bin/bash', '-c', 'while true; do sleep 30; done'],
```

#### Container Configuration - After

```javascript
command: ['/bin/bash', '-c'],
args: [
  `echo "Starting GAM session ${sessionId}..."

  # Create GAM config directory
  mkdir -p /root/.gam

  # Create a new gam.cfg file with correct paths
  cat > /root/.gam/gam.cfg << GAMCFG
  [DEFAULT]
  customer_id = my_customer
  domain = automatearmy.com
  oauth2_txt = /root/.gam/oauth2.txt
  oauth2service_json = /root/.gam/oauth2service.json
  client_secrets_json = /root/.gam/client_secrets.json
  GAMCFG

  # Copy credentials to the expected location
  cp /root/.gam/credentials/oauth2.txt /root/.gam/oauth2.txt
  cp /root/.gam/credentials/oauth2service.json /root/.gam/oauth2service.json
  cp /root/.gam/credentials/client_secrets.json /root/.gam/client_secrets.json

  # Make sure permissions are correct
  chmod 600 /root/.gam/oauth2.txt
  chmod 600 /root/.gam/oauth2service.json
  chmod 600 /root/.gam/client_secrets.json

  # Test GAM command
  echo "Testing GAM command: info domain"
  /gam/gam7/gam info domain || echo "Command failed"

  # Start a simple HTTP server to handle WebSocket requests
  echo "Starting HTTP server on port 8080..."
  cd /gam
  python3 -m http.server 8080 &

  # Keep the container running
  echo "GAM session is ready. Waiting for commands..."
  while true; do sleep 30; done`
],
```

## Testing

To test the fix, we created a new session using the fixed script and verified that the pod started successfully:

```bash
cd /Users/brunoregesdeoliveira/Documents/workspace/gamgui-terraform && ./scripts/manage-websocket-sessions-fixed.sh create test-fixed-new "info domain"
```

The pod was created successfully and is running:

```
gam-session-test-fixed-new-595c589dd5-hqgb5   1/1     Running     0          20s
```

## Next Steps

To fully implement this fix, we need to:

1. Replace the original `KubernetesAdapter.js` file with the fixed version
2. Replace the original `manage-websocket-sessions.sh` script with the fixed version
3. Deploy the updated server to Cloud Run

This will ensure that all new sessions created through the API will use the correct pod configuration and will start successfully.
