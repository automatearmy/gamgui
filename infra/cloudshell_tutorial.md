<!-- This file contains the step-by-step tutorial for deploying GAMGUI to Google Cloud -->

<!-- #################### WELCOME #################### -->
<!-- #################### WELCOME #################### -->

# Welcome to GAMGUI Deployment

<walkthrough-tutorial-duration duration="45"></walkthrough-tutorial-duration>

GAMGUI is a powerful web application that provides a user-friendly interface for managing GAM. This tutorial will guide you through deploying GAMGUI to your Google Cloud project with a complete infrastructure setup.

## Prerequisites

Before you begin, you'll need:

- A Google Cloud project with billing enabled
- **Owner** or **Editor** permissions on the project
- Google Workspace domain for authentication

**Is This Safe?**

All scripts in this tutorial are designed with security in mind:

- Scripts are transparent and explain each action they take
- No sensitive data is transmitted outside your Google Cloud project
- All resources are created within your project's security boundaries
- You'll have full control and visibility throughout the process

Click the **Next** button to begin setting up your project.

<!-- #################### STEP 1 #################### -->
<!-- #################### STEP 1 #################### -->

## Project Selection and Setup

Let's start by selecting the Google Cloud project where you'll deploy GAMGUI.

<walkthrough-project-setup billing="true"></walkthrough-project-setup>

Your selected project is: **<walkthrough-project-id/>**

<walkthrough-footnote>
Selecting the right project is crucial as it will contain all the resources for GAMGUI. Make sure you choose a project where billing is enabled to ensure successful deployment.
</walkthrough-footnote>

<!-- #################### STEP 2 #################### -->
<!-- #################### STEP 2 #################### -->

## Project Configuration

Let's configure your selected project:

```sh
gcloud config set project <walkthrough-project-id/>
```

This command configures your Cloud Shell environment to use your selected project. All subsequent commands and deployments will target this project.

<walkthrough-footnote>
If you switch between multiple projects, you'll need to run this command again to target the correct project.
</walkthrough-footnote>

<!-- #################### STEP 3 #################### -->
<!-- #################### STEP 3 #################### -->

## Script Preparation

Let's prepare the deployment scripts by making them executable:

```sh
chmod +x steps/*.sh
```

This command makes all shell scripts (\*.sh files) in the steps/ directory executable by adding the execute (+x) permission.

<walkthrough-footnote>
These scripts are part of the GAMGUI deployment process and will help set up your infrastructure. 
Each script is designed to be idempotent, meaning it's safe to run multiple times if needed.
</walkthrough-footnote>

<!-- #################### STEP 4 #################### -->
<!-- #################### STEP 4 #################### -->

## Project Permissions Check

Now, let's make sure you have the necessary permissions on this project and enable required APIs:

```sh
./steps/01_check_project_setup.sh
```

This script will:

1. Verify you have the required Owner or Editor permissions
2. Check that billing is enabled
3. Enable the necessary Google Cloud APIs for GAMGUI bootstrap

<walkthrough-footnote>
If the script indicates any missing permissions or requirements, please address them before continuing. 
You need either Owner or Editor role on the project to deploy GAMGUI successfully.
</walkthrough-footnote>

<!-- #################### STEP 5 #################### -->
<!-- #################### STEP 5 #################### -->

## OAuth Consent Screen Configuration

Now we need to configure the OAuth consent screen for GAMGUI authentication.

First, let's configure the OAuth consent screen:

1. Open the [OAuth consent screen](https://console.cloud.google.com/auth/overview?project=<walkthrough-project-id/>) in the Google Cloud Console
2. Click "Get started"
3. Fill in the App Information:
   - App name: "GAMGUI"
   - User support email: Your email address
4. In Audience, select "Internal"
5. Under contact information: Your email address
5. Check "I agree to the Google..." and continue
6. Return to the consent screen overview

<walkthrough-footnote>
The OAuth consent screen must be configured before creating OAuth clients. Internal is recommended for organizational use, while External allows any Google user to authenticate.
</walkthrough-footnote>

<!-- #################### STEP 6 #################### -->
<!-- #################### STEP 6 #################### -->

## Create Frontend OAuth Client

First, let's create the OAuth client for the frontend web application:

1. Go to [Credentials](https://console.cloud.google.com/apis/credentials?project=<walkthrough-project-id/>) in the Google Cloud Console
2. Click "Create Credentials" > "OAuth client ID"
3. Select "Web application" as the application type
4. Name: "GAMGUI Frontend"
5. Get your project number by running:
   ```sh
   gcloud projects describe <walkthrough-project-id/> --format="value(projectNumber)"
   ```
6. Using your project number from above, add the following URLs:
   - **Authorized JavaScript origins**: `https://gamgui-frontend-PROJECT_NUMBER.us-central1.run.app`
   - **Authorized redirect URIs**: `https://gamgui-frontend-PROJECT_NUMBER.us-central1.run.app`
   (Replace PROJECT_NUMBER with the number from step 5)
7. Click "Create"
8. **Keep the credentials dialog open** - you'll need these values in the next step

<walkthrough-footnote>
The frontend OAuth client will be used by the web UI for user authentication and is configured with IAP (Identity-Aware Proxy) for secure access.
</walkthrough-footnote>

<!-- #################### STEP 7 #################### -->
<!-- #################### STEP 7 #################### -->

## Create Backend OAuth Client

Next, let's create the OAuth client for the backend services:

1. In the same [Credentials](https://console.cloud.google.com/apis/credentials?project=<walkthrough-project-id/>) page
2. Click "Create Credentials" > "OAuth client ID"
3. Select "Desktop application" as the application type
4. Name: "GAMGUI Backend"
5. Click "Create"
6. **Keep the credentials dialog open** - you'll need these values in the next step

<walkthrough-footnote>
The backend OAuth client will be used by backend services for API access and server-to-server communication. Desktop application type is used for non-interactive authentication.
</walkthrough-footnote>

<!-- #################### STEP 8 #################### -->
<!-- #################### STEP 8 #################### -->

## Store OAuth Credentials

Now, run the script to securely store your OAuth credentials in Secret Manager:

```sh
./steps/02_store_oauth_credentials.sh <walkthrough-project-id/>
```

The script will:

1. Prompt you to enter the Client ID and Client Secret for the Frontend OAuth client
2. Prompt you to enter the Client ID and Client Secret for the Backend OAuth client
3. Store these credentials securely in Secret Manager
4. Make them available for the deployment process

<walkthrough-footnote>
The OAuth clients you created will allow GAMGUI to securely authenticate with Google APIs and services. Keep your client secrets secure and do not share them.
</walkthrough-footnote>

<!-- #################### STEP 9 #################### -->
<!-- #################### STEP 9 #################### -->

## Setup Terraform State Bucket

Let's set up the Google Cloud Storage bucket that will store Terraform's state files:

```sh
./steps/03_setup_terraform_state.sh <walkthrough-project-id/>
```

This script will:

1. Create a Cloud Storage bucket named `<walkthrough-project-id/>-gamgui-terraform-state`
2. Enable versioning on the bucket for state file history
3. Configure the bucket for Terraform state management

<walkthrough-footnote>
The Terraform state bucket tracks what resources have been created and their current state. Versioning ensures you can recover from any state file issues and track changes over time.
</walkthrough-footnote>

<!-- #################### STEP 10 #################### -->
<!-- #################### STEP 10 #################### -->

## Create Terraform Configuration

Now, let's create the Terraform configuration file that defines your deployment settings:

```sh
./steps/04_create_terraform_tfvars.sh <walkthrough-project-id/>
```

This script will:

1. Prompt you for necessary configuration values:
   - Google Workspace domain
   - Environment (development/staging/production)
   - Deployment region
2. Create a `terraform.tfvars` file with your settings
3. Store the configuration securely in Secret Manager for future reference

<walkthrough-footnote>
The script creates both a local terraform.tfvars file for immediate use and stores a copy in Secret Manager for future deployments and reference.
</walkthrough-footnote>

<!-- #################### STEP 11 #################### -->
<!-- #################### STEP 11 #################### -->

## Run Terraform Deployment

Now you're ready to deploy GAMGUI! This is the main deployment step:

```sh
./steps/05_run_terraform.sh <walkthrough-project-id/>
```

This script will:

1. Initialize Terraform with your state bucket
2. Generate a deployment plan showing all resources to be created
3. Ask for your confirmation before proceeding
4. Create all required infrastructure (this may take 15-20 minutes)
5. Display the URLs and details of your deployed GAMGUI application

**What gets deployed:**
- Cloud Run services (frontend with IAP, backend)
- GKE cluster for session management
- VPC network with private subnets
- Firestore database
- Service accounts with appropriate permissions
- Secret Manager integration
- DNS configuration

<walkthrough-footnote>
The deployment process will create all necessary GCP resources. The frontend service will be accessible via IAP, while the backend service remains internal-only for security. The process typically takes 15-20 minutes to complete.
</walkthrough-footnote>

<!-- #################### FINAL STEP #################### -->
<!-- #################### FINAL STEP #################### -->

## Congratulations!

<walkthrough-conclusion-trophy></walkthrough-conclusion-trophy>

You've successfully deployed GAMGUI to your Google Cloud project! Here's what you can do next:

### Access Your Application

1. **Frontend URL**: Use the frontend service URL from the Terraform output to access GAMGUI
2. **IAP Protection**: The frontend is protected by Identity-Aware Proxy for secure access
3. **Authentication**: Sign in with your Google Workspace account

### Support

For technical support or questions:
- Email: team@automatearmy.com

Thank you for using GAMGUI!

<walkthrough-footnote>
If you need to redeploy or make changes in the future, you can always return to the Cloud Shell and run the deployment scripts again. 
All resources are managed by Terraform, ensuring consistent and repeatable deployments.
</walkthrough-footnote>
