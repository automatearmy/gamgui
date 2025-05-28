# GAMGUI Registry Infrastructure

This directory contains Terraform configuration for managing the GCP infrastructure for the GAMGUI application's CI/CD pipeline and artifact registry repositories.

## Overview

The Terraform configuration sets up:

1. **Google Cloud APIs**: Automatically enables required APIs for the registry
2. **Artifact Registry Repositories**: Production and staging Docker repositories
3. **Cloud Build Triggers**: CI/CD pipelines for GAMGUI components
4. **IAM Configuration**: Service accounts and customer access permissions

## GAMGUI Components

The CI/CD pipeline supports three main components:

1. **gamgui-client**: React frontend application
2. **gamgui-server**: Node.js backend API
3. **gamgui-gam-docker**: Docker container for Google Apps Manager (GAM) commands

Each component has dedicated Cloud Build triggers for production deployments, staging deployments, and PR validation.

## Quick Start

### 1. Bootstrap the Infrastructure

Run the bootstrap script to set up the initial infrastructure:

```bash
./bootstrap.sh
```

This script will:
- Create GCS buckets for Terraform state, build logs, and version tracking
- Copy `terraform.tfvars.example` to `terraform.tfvars`
- Initialize Terraform

### 2. Configure Variables

Edit `terraform.tfvars` to set your specific project values, GitHub configuration, and customer access settings.

### 3. Deploy the Infrastructure

```bash
# Preview changes
terraform plan

# Apply changes
terraform apply
```

## Adding Customer Access

To grant a customer access to the artifact registry, add their service account email to the `customer_service_accounts` variable in `terraform.tfvars` and apply the changes.

## State Management

The Terraform state is stored in Google Cloud Storage buckets for collaboration and includes separate buckets for build logs and version tracking.

## Authentication

The infrastructure uses GitHub App authentication for Cloud Build connections.

## Git Configuration

The `.gitignore` file includes necessary Terraform exclusions. Only commit example files, never commit `terraform.tfvars` as it may contain sensitive information.
