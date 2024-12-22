#!/bin/bash

npm install --workspaces
npm run build
# Build docker image for Act
docker-compose build test-action -f ../docker-compose.yaml
# Trigger 'test-action-local' job in .github/workflows/example.yaml
cd ..
act push --job test-action-local --secret-file ./config/act.secrets \
 -e ./config/act.event.json --container-options "-v ${PWD}:/github/workspace"