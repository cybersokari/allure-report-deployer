#!/bin/sh

set -e

# Set environment variables by stripping "key=" and keeping only the value
export STORAGE_BUCKET="${1#*=}"
export WEBSITE_ID="${2#*=}"
export WEBSITE_EXPIRES="${3#*=}"
export KEEP_HISTORY="${4#*=}"
export KEEP_RESULTS="${5#*=}"
export SLACK_CHANNEL_ID="${6#*=}"
export ALLURE_RESULTS_PATH="${7#*=}"
export SHOW_RETRIES="${8#*=}"
export SHOW_HISTORY="${9#*=}"


if [ -z "$WEBSITE_ID" ] && [ -z "$STORAGE_BUCKET" ]; then
    echo "Error: Either website_id or storage_bucket must be set" >&2
    exit 1
fi

if [ -z "$GOOGLE_CREDENTIALS_JSON" ]; then
  echo "Provide a valid Firebase GCP JSON "
  exit 1
else
  # Create directory for the JSON file
  TMP_DIR=$(mkdir "/credentials")
  JSON_FILE="$TMP_DIR/credentials/gcp_credentials.json"
  # Write the $GOOGLE_CREDENTIALS_JSON content to the JSON file
  echo "$GOOGLE_CREDENTIALS_JSON" > "$JSON_FILE" #TODO: Find out if clean up is needed
  # Export as GOOGLE_APPLICATION_CREDENTIALS for Firebase CLI auto auth
  export GOOGLE_APPLICATION_CREDENTIALS="$JSON_FILE"
fi

echo "Starting Allure Deployer..."
echo "Deploying Allure report from: $ALLURE_RESULTS_PATH"

node /app/packages/action/dist/index.js

echo "Allure Deployer finished successfully."