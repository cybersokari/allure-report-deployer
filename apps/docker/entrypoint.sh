#!/bin/sh

# Exit immediately if a command exits with a non-zero status
set -e

GOOGLE_APPLICATION_CREDENTIALS="/credentials/key.json"
if [ -f "$GOOGLE_APPLICATION_CREDENTIALS" ]; then
  # Running as an bare container
  export GOOGLE_APPLICATION_CREDENTIALS
  ALLURE_RESULTS_PATH="/allure-results"
  # Check if /allure-results directory is mounted
  if [ ! -d "$ALLURE_RESULTS_PATH" ]; then
    echo "Error: $ALLURE_RESULTS_PATH directory is not mounted"
    exit 1
  fi

elif [ -d "/github/workspace" ]; then
  #Running as a GitHub Action container
  if [ -z "$GOOGLE_CREDENTIALS_JSON" ]; then
    echo "Error: Provide a Firebase Google JSON credential "
    exit 1
  else
    # Create directory for the JSON file
    DIR="/credentials"
    mkdir -p "$DIR"
    JSON_FILE="$DIR/key.json"
    # Write the $GOOGLE_CREDENTIALS_JSON content to the JSON file
    echo "$GOOGLE_CREDENTIALS_JSON" > "$JSON_FILE" # No cleanup needed, in non mounted Docker path
    # Export as GOOGLE_APPLICATION_CREDENTIALS for Firebase CLI auto auth
    export GOOGLE_APPLICATION_CREDENTIALS="$JSON_FILE"
  fi

   # Create variables by stripping "key=" and keeping only the value from
   # GitHub action arguments
    STORAGE_BUCKET="${1#*=}"
    REPORT_NAME="${2#*=}"
    SLACK_CHANNEL="${3#*=}"
    ALLURE_RESULTS_PATH="${4#*=}"
    RETRIES="${5#*=}"
    SHOW_HISTORY="${6#*=}"
    PREFIX="${7#*=}"
    UPDATE_PR="${8#*=}"
    OUTPUT="${9#*=}"
    [ -n "$OUTPUT" ] && OUTPUT="/github/workspace/$OUTPUT"
else
  echo "Error: No credential file exists at $GOOGLE_APPLICATION_CREDENTIALS. Please mount a Firebase Google JSON file"
  exit 1
fi

# Construct the command with all optional variables
if [ -n "$OUTPUT" ]; then
  deploy_command="allure-deployer generate \"$ALLURE_RESULTS_PATH\""
  [ -n "$REPORT_NAME" ] && deploy_command="$deploy_command $REPORT_NAME"
  [ -n "$GOOGLE_APPLICATION_CREDENTIALS" ] && deploy_command="$deploy_command --gcp-json $GOOGLE_APPLICATION_CREDENTIALS"
  [ -n "$STORAGE_BUCKET" ] && deploy_command="$deploy_command --bucket $STORAGE_BUCKET"
  [ "$RETRIES" ] && deploy_command="$deploy_command --retries $RETRIES"
  [ "$SHOW_HISTORY" = "true" ] && deploy_command="$deploy_command --show-history"
  [ -n "$PREFIX" ] && deploy_command="$deploy_command --prefix $PREFIX"
  [ -n "$UPDATE_PR" ] && deploy_command="$deploy_command --update-pr $UPDATE_PR"
  [ -n "$OUTPUT" ] && deploy_command="$deploy_command --output $OUTPUT"
else
  deploy_command="allure-deployer deploy \"$ALLURE_RESULTS_PATH\""
  [ -n "$REPORT_NAME" ] && deploy_command="$deploy_command $REPORT_NAME"
  [ -n "$GOOGLE_APPLICATION_CREDENTIALS" ] && deploy_command="$deploy_command --gcp-json $GOOGLE_APPLICATION_CREDENTIALS"
  [ -n "$STORAGE_BUCKET" ] && deploy_command="$deploy_command --bucket $STORAGE_BUCKET"
  [ "$RETRIES" ] && deploy_command="$deploy_command --retries $RETRIES"
  [ "$SHOW_HISTORY" = "true" ] && deploy_command="$deploy_command --show-history"
  [ -n "$SLACK_CHANNEL" ] && deploy_command="$deploy_command --slack-channel $SLACK_CHANNEL"
  [ -n "$SLACK_TOKEN" ] && deploy_command="$deploy_command --slack-token $SLACK_TOKEN"
  [ -n "$PREFIX" ] && deploy_command="$deploy_command --prefix $PREFIX"
  [ -n "$UPDATE_PR" ] && deploy_command="$deploy_command --update-pr $UPDATE_PR"
fi

# Execute the constructed command
eval "$deploy_command"
#tail -f /dev/null