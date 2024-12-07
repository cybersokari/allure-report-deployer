#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

if [[ -z "$WEBSITE_ID" ]] && [[ -z "$STORAGE_BUCKET" ]]; then
    echo "Error: Either WEBSITE_ID or STORAGE_BUCKET must be set" >&2
    exit 1
fi

if [ -z "$GOOGLE_APPLICATION_CREDENTIALS" ]; then
  echo "GOOGLE_APPLICATION_CREDENTIALS env is not set."
  exit 1
else
  echo "GOOGLE_APPLICATION_CREDENTIALS env is set to: $GOOGLE_APPLICATION_CREDENTIALS"
fi

if [ ! -f "$GOOGLE_APPLICATION_CREDENTIALS" ]; then
  echo "No file exists at: $GOOGLE_APPLICATION_CREDENTIALS Please mount the GOOGLE_APPLICATION_CREDENTIALS file"
  exit 1
fi

if [[ ! "$GOOGLE_APPLICATION_CREDENTIALS" =~ \.json$ ]]; then
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
  echo "Running on GitHub. Summary will be available in a bit"
fi

if [ -n "$TTL_SECS" ]; then
  if ! [[ "$TTL_SECS" -eq "$TTL_SECS" && "$TTL_SECS" -ge 0 ]]; then
    echo "Error: $TTL_SECS must be a positive number"
    exit 1
  else
    echo "TTL_SECS set to $TTL_SECS"
  fi
fi
echo 'Starting the app'
node /app/lib/index.js