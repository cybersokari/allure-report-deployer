#!/bin/sh

# Exit immediately if a command exits with a non-zero status
set -e

GOOGLE_APPLICATION_CREDENTIALS="/credentials/key.json"
if [ ! -f "$GOOGLE_APPLICATION_CREDENTIALS" ]; then
  echo "No file exists at: $GOOGLE_APPLICATION_CREDENTIALS Please mount the GOOGLE_APPLICATION_CREDENTIALS file"
  exit 1
fi

case "$GOOGLE_APPLICATION_CREDENTIALS" in
  *.json)
    export GOOGLE_APPLICATION_CREDENTIALS
    ;;
  *)
    echo "$GOOGLE_APPLICATION_CREDENTIALS"
    exit 1
    ;;
esac

# Check if /allure-results directory exists
ALLURE_RESULTS_PATH="/allure-results"
if [ ! -d "$ALLURE_RESULTS_PATH" ]; then
    echo "Error: $ALLURE_RESULTS_PATH directory is not mounted"
    exit 1
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
#tail -f /dev/null