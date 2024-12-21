#!/bin/bash

npm install --workspaces
npm run build

docker build -t act-packages-action-dockeraction:latest -f ./action.Dockerfile .

act push --job  test-action-local --secret-file ./my.secrets \
 -e ./act-event.json --container-options "-v ${PWD}:/github/workspace"