#!/bin/bash
# Bootstrap script for gamgui-registry infrastructure

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if gsutil is installed
if ! command -v gsutil &>/dev/null; then
  echo -e "${RED}Error: gsutil is not installed. Please install the Google Cloud SDK first.${NC}"
  echo "Visit: https://cloud.google.com/sdk/docs/install"
  exit 1
fi

# Check if terraform is installed
if ! command -v terraform &>/dev/null; then
  echo -e "${RED}Error: terraform is not installed. Please install Terraform first.${NC}"
  echo "Visit: https://developer.hashicorp.com/terraform/downloads"
  exit 1
fi

echo -e "${BLUE}=== GAMGUI Registry Infrastructure Bootstrap ===${NC}"

# Get or use default project ID
DEFAULT_PROJECT="gamgui-registry"
read -p "Enter GCP Project ID [$DEFAULT_PROJECT]: " PROJECT_ID
PROJECT_ID=${PROJECT_ID:-$DEFAULT_PROJECT}

# Get or use default region
DEFAULT_REGION="us-central1"
read -p "Enter GCP Region [$DEFAULT_REGION]: " REGION
REGION=${REGION:-$DEFAULT_REGION}

# Confirm if we should proceed
echo -e "${YELLOW}This script will:"
echo "1. Enable Secret Manager API"
echo "2. Create/update GitHub PAT secret"
echo "3. Create a GCS bucket for Terraform state"
echo "4. Copy terraform.tfvars.example to terraform.tfvars"
echo -e "Using project: ${PROJECT_ID} and region: ${REGION}${NC}"
read -p "Do you want to continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo -e "${RED}Bootstrap cancelled.${NC}"
  exit 1
fi

# Enable Secret Manager API
echo -e "${BLUE}Enabling Secret Manager API...${NC}"
gcloud services enable secretmanager.googleapis.com --project=${PROJECT_ID}
echo -e "${GREEN}Secret Manager API enabled.${NC}"

# Handle GitHub PAT secret
echo -e "${BLUE}Checking GitHub PAT secret...${NC}"
if gcloud secrets describe github-pat --project=${PROJECT_ID} &>/dev/null; then
  echo -e "${YELLOW}GitHub PAT secret already exists.${NC}"
  read -p "Do you want to update the GitHub PAT secret? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -s -p "Enter your GitHub Personal Access Token: " GITHUB_PAT
    echo
    echo -n "${GITHUB_PAT}" | gcloud secrets versions add github-pat --data-file=- --project=${PROJECT_ID}
    echo -e "${GREEN}GitHub PAT secret updated.${NC}"
  fi
else
  echo -e "${YELLOW}GitHub PAT secret does not exist. Creating...${NC}"
  read -s -p "Enter your GitHub Personal Access Token: " GITHUB_PAT
  echo
  echo -n "${GITHUB_PAT}" | gcloud secrets create github-pat --data-file=- --project=${PROJECT_ID}
  echo -e "${GREEN}GitHub PAT secret created.${NC}"
fi

# Create the GCS bucket for Terraform state if it doesn't exist
echo -e "${BLUE}Creating GCS bucket for Terraform state...${NC}"
if gsutil ls -b gs://${PROJECT_ID}-terraform-state &>/dev/null; then
  echo -e "${YELLOW}Bucket gs://${PROJECT_ID}-terraform-state already exists.${NC}"
else
  gsutil mb -c standard -l ${REGION} gs://${PROJECT_ID}-terraform-state
  gsutil versioning set on gs://${PROJECT_ID}-terraform-state
  echo -e "${GREEN}Created bucket gs://${PROJECT_ID}-terraform-state with versioning enabled.${NC}"
fi

# Create terraform.tfvars if it doesn't exist
echo -e "${BLUE}Creating Terraform variables file...${NC}"
if [ ! -f terraform.tfvars ]; then
  cp terraform.tfvars.example terraform.tfvars
  echo -e "${GREEN}Created terraform.tfvars from terraform.tfvars.example${NC}"
  echo -e "${YELLOW}Please edit terraform.tfvars to set your specific values.${NC}"
else
  echo -e "${YELLOW}File terraform.tfvars already exists. Skipping.${NC}"
fi

echo -e "${BLUE}Initializing Terraform...${NC}"
terraform init -backend-config="bucket=${PROJECT_ID}-terraform-state"

echo -e "${GREEN}=== Bootstrap Complete ===${NC}"
echo -e "${YELLOW}Next steps:"
echo "1. Edit terraform.tfvars with your specific project and configuration values"
echo "2. Update the github_app_installation_id if different from the default"
echo "3. Run terraform plan to preview changes"
echo "4. Run terraform apply to apply the infrastructure${NC}"
