# Solving Connection Issues in GamGUI Application

This document explains how to solve the connection issues that occur after recreating the infrastructure with Terraform.

## The Problem

After running `terraform destroy` and `terraform apply`, the client application deployed to Cloud Run shows connection errors in the browser console:

```
GET http://localhost:3001/api/credentials/check net::ERR_CONNECTION_REFUSED
Failed to check credentials status: TypeError: Failed to fetch
```

The client is trying to connect to `localhost:3001` instead of the deployed server URL.

## Why This Happens

This issue occurs because of how environment variables are handled in React/Vite applications:

1. **Build-time vs. Runtime Variables**: In React/Vite applications, environment variables are substituted during the build process, not at runtime.

2. **Terraform Recreation**: When you run `terraform destroy` and `terraform apply`, the infrastructure is recreated with potentially new URLs.

3. **Baked-in URLs**: The client application has the old URLs (or localhost URLs) "baked into" the code during the build process.

## The Solution

The solution is to rebuild the client application with the correct server URL after recreating the infrastructure:

### Step 1: Deploy Infrastructure with Terraform

```bash
# In gamgui-terraform repository
terraform apply
```

### Step 2: Get the Server URL

```bash
# In gamgui-terraform repository
terraform output server_url
# Example output: "https://gamgui-server-2fdozy6y5a-uc.a.run.app"
```

### Step 3: Build and Deploy the Client with the Correct URL

```bash
# In gamgui-app repository
./build-and-push-client.sh
# When prompted, enter the server URL from step 2
```

### Step 4: Update Infrastructure with the New Image

```bash
# In gamgui-terraform repository
terraform apply
```

## Technical Details

### How Environment Variables Work in React/Vite

1. **During Development**: Environment variables are loaded from `.env.development` or `.env.local` files.

2. **During Build**: Environment variables are substituted in the code. For example, `import.meta.env.VITE_API_URL` is replaced with the actual value.

3. **After Deployment**: The application uses the values that were substituted during the build process. It cannot access new environment variables.

### Our Solution

We've implemented a solution that:

1. **Uses Build Arguments**: The Dockerfile accepts build arguments for the API and Socket URLs.

2. **Passes URLs During Build**: The build script passes the correct server URL as build arguments.

3. **Local Build Process**: We build the Docker image locally to avoid issues with Cloud Build.

4. **Documentation**: We've updated the deployment documentation to explain the process.

## Preventing This Issue in the Future

To prevent this issue in the future:

1. **Always Rebuild the Client**: After recreating the infrastructure, always rebuild the client with the new server URL.

2. **Use the Provided Scripts**: Use the `build-and-push-client.sh` script to simplify the process.

3. **Follow the Deployment Guide**: Follow the steps in the `DEPLOYMENT.md` and `DEPLOYMENT_QUICK_START.md` files.

## Alternative Approaches

There are alternative approaches to solving this issue:

1. **Runtime Configuration**: Implement a runtime configuration endpoint that the client can fetch on startup.

2. **Environment Variables in Cloud Run**: Set environment variables in the Cloud Run service, but this would require code changes to use them at runtime.

3. **Proxy Configuration**: Use a proxy or API gateway with a stable URL.

We've chosen the build-time approach because it's the most compatible with the current architecture and requires minimal code changes.
