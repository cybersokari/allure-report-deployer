#!/bin/sh

# Exit immediately if a command exits with a non-zero status
set -e

GOOGLE_APPLICATION_CREDENTIALS="/credentials/key.json"
if [ -f "$GOOGLE_APPLICATION_CREDENTIALS" ]; then
  # Running as an bare container
  export GOOGLE_APPLICATION_CREDENTIALS
  ALLURE_RESULTS_PATH="/allure-results"
else
  echo "Error: No credential file exists at $GOOGLE_APPLICATION_CREDENTIALS. Please mount a Firebase Google JSON file"
  exit 1
fi
# Check if /allure-results directory is mounted
if [ ! -d "$ALLURE_RESULTS_PATH" ]; then
  echo "Error: $ALLURE_RESULTS_PATH directory is not mounted"
  exit 1
fi


# Construct the command with all optional variables
deploy_command="allure-deployer deploy \"$ALLURE_RESULTS_PATH\""
[ -n "$REPORT_NAME" ] && deploy_command="$deploy_command $REPORT_NAME"
[ -n "$GOOGLE_APPLICATION_CREDENTIALS" ] && deploy_command="$deploy_command --gcp-json $GOOGLE_APPLICATION_CREDENTIALS"
[ -n "$STORAGE_BUCKET" ] && deploy_command="$deploy_command --bucket $STORAGE_BUCKET"
[ "$RETRIES" ] && deploy_command="$deploy_command --retries $RETRIES"
[ "$SHOW_HISTORY" = "true" ] && deploy_command="$deploy_command --show-history"
[ -n "$SLACK_CHANNEL" ] && deploy_command="$deploy_command --slack-channel $SLACK_CHANNEL"
[ -n "$SLACK_TOKEN" ] && deploy_command="$deploy_command --slack-token $SLACK_TOKEN"
[ -n "$PREFIX" ] && deploy_command="$deploy_command --prefix $PREFIX"

# Execute the constructed command
eval "$deploy_command"
#tail -f /dev/null