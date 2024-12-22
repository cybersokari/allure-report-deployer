#!/bin/sh

set -e

# Set environment variables by stripping "key=" and keeping only the value
export STORAGE_BUCKET="${1#*=}"
export REPORT_ID="${2#*=}"
export WEBSITE_EXPIRES="${3#*=}"
export KEEP_HISTORY="${4#*=}"
export KEEP_RESULTS="${5#*=}"
export SLACK_CHANNEL_ID="${6#*=}"
export ALLURE_RESULTS_PATH="${7#*=}"
export SHOW_RETRIES="${8#*=}"
export SHOW_HISTORY="${9#*=}"


if [ -z "$GOOGLE_CREDENTIALS_JSON" ]; then
  echo "Provide a valid Firebase GCP JSON "
  exit 1
else
  # Create directory for the JSON file
  DIR=$(mkdir "/credentials")
  JSON_FILE="$DIR/credentials/gcp_credentials.json"
  # Write the $GOOGLE_CREDENTIALS_JSON content to the JSON file
  echo "$GOOGLE_CREDENTIALS_JSON" > "$JSON_FILE" # No cleanup needed, in non mounted Docker path
  # Export as GOOGLE_APPLICATION_CREDENTIALS for Firebase CLI auto auth
  export GOOGLE_APPLICATION_CREDENTIALS="$JSON_FILE"
fi

echo "Starting Allure Deployer..."
echo "Deploying Allure report from: $ALLURE_RESULTS_PATH"

node /app/packages/action/dist/index.js

echo "Report deployed successfully."