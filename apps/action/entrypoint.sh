#!/bin/sh

set -e

# Set environment variables by stripping "key=" and keeping only the value
export STORAGE_BUCKET="${1#*=}"
export REPORT_NAME="${2#*=}"
export SLACK_CHANNEL="${3#*=}"
export ALLURE_RESULTS_PATH="${4#*=}"
export SHOW_RETRIES="${5#*=}"
export SHOW_HISTORY="${6#*=}"
export PREFIX="${7#*=}"
export UPDATE_PR="${8#*=}"


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

[ -n "$REPORT_NAME" ] && deploy_command="$deploy_command $REPORT_NAME"
[ -n "$GOOGLE_APPLICATION_CREDENTIALS" ] && deploy_command="$deploy_command --gcp-json $GOOGLE_APPLICATION_CREDENTIALS"
[ -n "$STORAGE_BUCKET" ] && deploy_command="$deploy_command --bucket $STORAGE_BUCKET"
[ "$SHOW_RETRIES" = "true" ] && deploy_command="$deploy_command --show-retries"
[ "$SHOW_HISTORY" = "true" ] && deploy_command="$deploy_command --show-history"
[ -n "$SLACK_CHANNEL" ] && deploy_command="$deploy_command --slack-channel $SLACK_CHANNEL"
[ -n "$SLACK_TOKEN" ] && deploy_command="$deploy_command --slack-token $SLACK_TOKEN"
[ -n "$PREFIX" ] && deploy_command="$deploy_command --prefix $PREFIX"
[ "$UPDATE_PR" = "true" ] && deploy_command="$deploy_command --update-pr"

# Execute the constructed command
eval "$deploy_command"
