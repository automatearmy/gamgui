#!/bin/zsh

# GAMGUI Session Startup Script

# Check required environment variables
if [ -z "$USER_ID" ]; then
    echo "ERROR: USER_ID environment variable is required"
    exit 1
fi

if [ -z "$PROJECT_ID" ]; then
    echo "ERROR: PROJECT_ID environment variable is required"
    exit 1
fi

# Only run setup once - check if GAM config already exists
if [ ! -f "/root/.gam/client_secrets.json" ]; then
    echo "Setting up GAM configuration for user: $USER_ID"
    
    # Set project for gcloud
    gcloud config set project "$PROJECT_ID"
    
    # Create GAM directory
    mkdir -p /root/.gam
    
    # Fetch secrets from Secret Manager
    echo "Fetching GAM secrets..."
    gcloud secrets versions access latest --secret="client_secrets___${USER_ID}" > /root/.gam/client_secrets.json
    gcloud secrets versions access latest --secret="oauth2___${USER_ID}" > /root/.gam/oauth2.txt
    gcloud secrets versions access latest --secret="oauth2service___${USER_ID}" > /root/.gam/oauth2service.json
    
    # Set permissions
    chmod 600 /root/.gam/*
    
    echo "GAM configuration completed"
fi

# Start or attach to tmux session
if tmux has-session -t main 2>/dev/null; then
  tmux attach-session -t main
else
  tmux new-session -d -s main
  tmux attach-session -t main
fi
