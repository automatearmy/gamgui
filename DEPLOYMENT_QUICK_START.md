# GamGUI Deployment Quick Start

This guide provides a quick reference for deploying the GamGUI application after making changes.

## Deployment Workflow

### Option A: Automated Deployment (Recommended)

Use the automated deployment script in the gamgui-terraform repository:

```bash
# In gamgui-terraform repository
./deploy.sh /path/to/gamgui-app
```

This script will:
1. Deploy the infrastructure with Terraform
2. Get the server URL
3. Build and push the client image with the correct server URL
4. Update the infrastructure with the new image

### Option B: Manual Deployment

If you prefer to deploy manually, follow these steps:

#### 1. Deploy Infrastructure (Terraform)

```bash
# In gamgui-terraform repository
terraform apply

# Get the server URL
SERVER_URL=$(terraform output -raw server_url)
echo $SERVER_URL
# Example output: https://gamgui-server-2fdozy6y5a-uc.a.run.app
```

#### 2. Deploy Server

```bash
# In gamgui-app repository
gcloud builds submit --config=gamgui-server/cloudbuild.yaml
```

#### 3. Build and Push Client with Server URL

```bash
# In gamgui-app repository
./build-and-push-client.sh
# When prompted, enter the server URL from step 1
```

#### 4. Update Infrastructure with New Images

```bash
# In gamgui-terraform repository
terraform apply
```

### Verify Deployment

1. Access the client URL: `https://gamgui-client-2fdozy6y5a-uc.a.run.app`
2. Check that the client can connect to the server
3. Test the application functionality

## Common Issues

### Client Can't Connect to Server

If the client shows connection errors:

1. Check that you used the correct server URL in the deployment script
2. Verify that the server is running and accessible
3. Check the browser console for specific error messages

### Build Failures

If the build fails:

1. Check the Cloud Build logs for specific error messages
2. Verify that the cloudbuild.yaml file is correctly formatted
3. Ensure you have the necessary permissions for Cloud Build

## Deployment After Infrastructure Changes

If you've made changes to the infrastructure (e.g., `terraform destroy` followed by `terraform apply`):

1. The server URL may have changed
2. You need to redeploy the client with the new server URL
3. Use the automated deployment script in the gamgui-terraform repository or the `./build-and-push-client.sh` script

For more detailed instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md).
