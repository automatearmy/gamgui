# GAMGUI Infrastructure Deployment

Deploy GAMGUI to your Google Cloud project with a streamlined, guided process.

[![Open in Cloud Shell](https://gstatic.com/cloudssh/images/open-btn.svg)](https://shell.cloud.google.com/cloudshell/editor?cloudshell_git_repo=https://github.com/automatearmy/gamgui&cloudshell_workspace=infra&cloudshell_tutorial=cloudshell_tutorial.md)

## Overview

GAMGUI is a powerful web application that provides a user-friendly interface for managing GAM. This repository provides a guided deployment process using Cloud Shell tutorials and automated scripts.

## Prerequisites

- A Google Cloud project with billing enabled
- **Owner** or **Editor** permissions on the project
- Google Workspace domain

## Deployment Process

1. Click the "Open in Cloud Shell" button above.
2. The interactive tutorial will guide you through each step:
   - Select your Google Cloud project
   - Verify permissions and enable required APIs
   - Configure OAuth credentials for frontend and backend
   - Set up Terraform infrastructure
   - Deploy the application

The entire process takes approximately 30-45 minutes to complete.

## What Gets Deployed

The deployment creates the following resources in your Google Cloud project:

- **Cloud Run Services**: Frontend (with IAP) and Backend services
- **GKE Cluster**: For session management
- **Firestore Database**: For application data storage
- **VPC Network**: Private network with subnets and NAT gateway
- **Secret Manager**: Secure storage for OAuth credentials
- **Service Accounts**: With appropriate IAM permissions
- **Cloud DNS**: Private DNS zone for internal communication

## Configuration Options

During deployment, you'll be prompted for:

- **Domain**: Your Google Workspace domain (for authentication)
- **Environment**: deployment environment (development, staging, production)
- **Region**: Google Cloud region for resource deployment
- **Project ID**: Target Google Cloud project

## OAuth Setup

The deployment requires two OAuth clients:

1. **Frontend OAuth Client** (Web Application):
   - Used by the web UI for user authentication
   - Configured with IAP (Identity-Aware Proxy)

2. **Backend OAuth Client** (Desktop Application):
   - Used by backend services for API access
   - Handles server-to-server communication

## Post-Deployment

After successful deployment, you'll receive:

- URL to access your GAMGUI application
- Backend API endpoint (internal only)
- Instructions for accessing the deployed services
- Details about the deployed resources

## Security Features

- **Identity-Aware Proxy (IAP)**: Protects frontend access
- **Private VPC**: All internal communication is isolated
- **Secret Manager**: Secure credential storage
- **Service Accounts**: Minimal required permissions
- **Internal Load Balancing**: Backend services not publicly accessible

## Troubleshooting

If you encounter issues during deployment:

1. Ensure you have Owner or Editor permissions on the project
2. Verify billing is enabled for your project
3. Check that OAuth consent screen is properly configured
4. Make sure OAuth clients are created with correct settings

For technical support, contact team@automatearmy.com.

## About

GAMGUI is developed and maintained by Automate Army.
