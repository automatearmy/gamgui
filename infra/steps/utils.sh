#!/bin/bash

# This file contains utility functions used across all GAMGUI deployment scripts
# Provides functionality for logging, user interaction, and common operations

# --- Colors and Formatting ---
COLOR_RESET=$(tput sgr0)
COLOR_BOLD=$(tput bold)
COLOR_GREEN=$(tput setaf 2)
COLOR_YELLOW=$(tput setaf 3)
COLOR_BLUE=$(tput setaf 4)
COLOR_RED=$(tput setaf 1)
COLOR_PURPLE=$(tput setaf 5)
COLOR_CYAN=$(tput setaf 6)
COLOR_WHITE=$(tput setaf 7)

# --- Log Functions ---
# Print a step header
log_step() { echo -e "\n${COLOR_BOLD}${COLOR_BLUE}==> $1${COLOR_RESET}"; }

# Print an informational message
log_info() { echo -e "${COLOR_YELLOW}[INFO]${COLOR_RESET} $1"; }

# Print a success message
log_success() { echo -e "${COLOR_GREEN}[SUCCESS]${COLOR_RESET} $1"; }

# Print an error message
log_error() { echo -e "${COLOR_RED}[ERROR]${COLOR_RESET} $1"; }

# Print an error message and exit with error code 1
log_fatal() {
  log_error "$1"
  exit 1
}

# Print a warning message
log_warning() { echo -e "${COLOR_PURPLE}[WARNING]${COLOR_RESET} $1"; }

# Print a debug message (when DEBUG is set)
log_debug() {
  if [[ -n "$DEBUG" ]]; then
    echo -e "${COLOR_CYAN}[DEBUG]${COLOR_RESET} $1"
  fi
}

# --- Input Functions ---
# Ask for required input with validation
# Usage: ask_required "Enter value: " "Error message"
ask_required() {
  local prompt="$1"
  local error_msg="${2:-This field is required}"
  local input=""
  
  # Use stderr for all messages
  while [[ -z "$input" ]]; do
    echo -e "${COLOR_YELLOW}${prompt}${COLOR_RESET}" >&2
    read input
    if [[ -z "$input" ]]; then
      echo -e "${COLOR_RED}[ERROR]${COLOR_RESET} $error_msg" >&2
    fi
  done
  
  # Output only the clean input value to stdout
  echo "$input"
}

# Ask for input with a default value
# Usage: ask_with_default "Enter value: " "default" "Variable description"
ask_with_default() {
  local prompt="$1"
  local default="$2"
  local description="${3:-}"
  local input=""
  
  # Use stderr for all messages
  if [[ -n "$description" ]]; then
    echo -e "${COLOR_YELLOW}[INFO]${COLOR_RESET} $description" >&2
  fi
  
  echo -e "${COLOR_YELLOW}${prompt} (default: $default): ${COLOR_RESET}" >&2
  read input
  if [[ -z "$input" ]]; then
    input="$default"
  fi
  
  # Output only the clean input value to stdout
  echo "$input"
}

# Ask for confirmation (yes/no)
# Usage: ask_confirmation "Are you sure?"
# Returns 0 for yes, 1 for no
ask_confirmation() {
  local prompt="$1"
  local result=""
  
  while true; do
    read -p "$prompt (y/n): " yn
    case $yn in
      [Yy]* ) result="true"; break ;;
      [Nn]* ) result="false"; break ;;
      * ) log_error "Please answer y (yes) or n (no)." ;;
    esac
  done
  
  if [[ "$result" == "true" ]]; then
    return 0
  else
    return 1
  fi
}

# --- Project Functions ---
# Get the current project ID
get_project_id() {
  local project_id="$1"
  
  # If no project ID provided as argument, try to get from gcloud config
  if [[ -z "$project_id" ]]; then
    project_id=$(gcloud config get-value project 2>/dev/null)
    
    if [[ -z "$project_id" ]]; then
      log_fatal "Could not determine GCP Project ID. Please provide it as an argument or set it with 'gcloud config set project PROJECT_ID'."
    fi
  fi
  
  echo "$project_id"
}

# Get the project number for a given project ID
get_project_number() {
  local project_id="$1"
  local project_number
  
  project_number=$(gcloud projects describe "$project_id" --format="value(projectNumber)" 2>/dev/null)
  
  if [[ -z "$project_number" ]]; then
    log_fatal "Could not determine project number for project ID: $project_id"
  fi
  
  echo "$project_number"
}

# Get the user email
get_user_email() {
  local user_email
  
  user_email=$(gcloud config get-value account 2>/dev/null)
  
  if [[ -z "$user_email" ]]; then
    log_fatal "Could not determine user email. Make sure you're logged in to gcloud."
  fi
  
  echo "$user_email"
}

# --- Command Checker ---
# Check if a command exists
check_command() {
  local cmd="$1"
  
  if ! command -v "$cmd" &>/dev/null; then
    log_fatal "Required command '$cmd' not found. Please install it and ensure it's in your PATH."
  fi
  
  log_debug "Command '$cmd' found."
}

# --- Display Script Banner ---
# Display a banner for the script
display_banner() {
  local script_name="$1"
  local description="$2"
  
  echo -e "\n${COLOR_BOLD}${COLOR_BLUE}======================================${COLOR_RESET}"
  echo -e "${COLOR_BOLD}${COLOR_BLUE}    $script_name${COLOR_RESET}"
  echo -e "${COLOR_BOLD}${COLOR_BLUE}======================================${COLOR_RESET}"
  echo -e "${COLOR_YELLOW}$description${COLOR_RESET}\n"
}

# --- Final Message ---
# Display a final success message
display_success() {
  local message="$1"
  
  echo -e "\n${COLOR_BOLD}${COLOR_GREEN}======================================${COLOR_RESET}"
  echo -e "${COLOR_BOLD}${COLOR_GREEN}    SUCCESS!${COLOR_RESET}"
  echo -e "${COLOR_BOLD}${COLOR_GREEN}======================================${COLOR_RESET}"
  echo -e "${COLOR_GREEN}$message${COLOR_RESET}\n"
}

# --- Environment Validation ---
# Validate environment variable
validate_environment() {
  local env="$1"
  local valid_envs=("development" "staging" "production")
  
  for valid_env in "${valid_envs[@]}"; do
    if [[ "$env" == "$valid_env" ]]; then
      return 0
    fi
  done
  
  log_fatal "Invalid environment '$env'. Must be one of: ${valid_envs[*]}"
}

# --- Domain Validation ---
# Basic domain validation
validate_domain() {
  local domain="$1"
  
  if [[ ! "$domain" =~ ^[a-zA-Z0-9][a-zA-Z0-9\.-]*[a-zA-Z0-9]\.[a-zA-Z]{2,}$ ]]; then
    log_fatal "Invalid domain format: $domain"
  fi
}
