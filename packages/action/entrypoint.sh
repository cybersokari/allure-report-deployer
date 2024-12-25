#!/bin/sh

set -e

# Set environment variables by stripping "key=" and keeping only the value
export STORAGE_BUCKET="${1#*=}"
export REPORT_ID="${2#*=}"
export KEEP_HISTORY="${3#*=}"
export KEEP_RESULTS="${4#*=}"
export SLACK_CHANNEL="${5#*=}"
export ALLURE_RESULTS_PATH="${6#*=}"
export SHOW_RETRIES="${7#*=}"
export SHOW_HISTORY="${8#*=}"
export PREFIX="${9#*=}"


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

echo "Deploying Allure report from: $ALLURE_RESULTS_PATH"
# Construct the command with all optional variables
deploy_command="allure-deployer deploy \"$ALLURE_RESULTS_PATH\""

[ -n "$REPORT_ID" ] && deploy_command="$deploy_command $REPORT_ID"
[ -n "$GOOGLE_APPLICATION_CREDENTIALS" ] && deploy_command="$deploy_command --gcp-json $GOOGLE_APPLICATION_CREDENTIALS"
[ -n "$STORAGE_BUCKET" ] && deploy_command="$deploy_command --bucket $STORAGE_BUCKET"
[ "$KEEP_HISTORY" = "true" ] && deploy_command="$deploy_command --keep-history"
[ "$KEEP_RESULTS" = "true" ] && deploy_command="$deploy_command --keep-results"
[ "$SHOW_RETRIES" = "true" ] && deploy_command="$deploy_command --show-retries"
[ "$SHOW_HISTORY" = "true" ] && deploy_command="$deploy_command --show-history"
[ -n "$SLACK_CHANNEL" ] && deploy_command="$deploy_command --slack-channel $SLACK_CHANNEL"
[ -n "$SLACK_TOKEN" ] && deploy_command="$deploy_command --slack-token $SLACK_TOKEN"
[ -n "$PREFIX" ] && deploy_command="$deploy_command --prefix $PREFIX"

# Execute the constructed command
eval "$deploy_command"
