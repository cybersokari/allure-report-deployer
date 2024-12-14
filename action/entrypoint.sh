#!/bin/bash

set -e

export STORAGE_BUCKET="$1"
export WEBSITE_ID="$2"
export WEBSITE_EXPIRES="$3"
export KEEP_HISTORY="$4"
export KEEP_RESULTS="$5"
export SLACK_TOKEN="$6"
export SLACK_CHANNEL_ID="$7"
export CREDENTIALS_FILE_PATH="$8"
export ALLURE_RESULTS_PATH="$9"
export SHOW_RETRIES="${10}"
export SHOW_HISTORY="${11}"


node --disable-warning=ExperimentalWarning /app/lib/index.js