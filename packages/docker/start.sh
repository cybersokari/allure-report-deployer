#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

if [[ -z "$WEBSITE_ID" ]] && [[ -z "$STORAGE_BUCKET" ]]; then
    echo "Error: Either WEBSITE_ID or STORAGE_BUCKET must be set" >&2
    exit 1
fi

GOOGLE_APPLICATION_CREDENTIALS="/credentials/key.json"
if [ ! -f "$GOOGLE_APPLICATION_CREDENTIALS" ]; then
  echo "No file exists at: $GOOGLE_APPLICATION_CREDENTIALS Please mount the GOOGLE_APPLICATION_CREDENTIALS file"
  exit 1
fi

if [[ "$GOOGLE_APPLICATION_CREDENTIALS" =~ \.json$ ]]; then
  export GOOGLE_APPLICATION_CREDENTIALS
else
  echo "$GOOGLE_APPLICATION_CREDENTIALS is not a Google credential json file"
  exit 1
fi

# Check if /allure-results directory exists
MOUNT_POINT="/allure-results"
if [ ! -d "$MOUNT_POINT" ]; then
    echo "Error: $MOUNT_POINT directory is not mounted"
    exit 1
fi

GITHUB_STEP_SUMMARY="/github/summary.txt"
if [ -f "$GITHUB_STEP_SUMMARY" ]; then
  export GITHUB_STEP_SUMMARY
  echo "Running on GitHub. Summary will be available"
fi

node --disable-warning=ExperimentalWarning /app/packages/docker/dist/index.js
#tail -f /dev/null