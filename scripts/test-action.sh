#!/bin/bash
# Install deps
pushd ..
npm install --workspace=allure-deployer-shared
npm install --workspace=@allure/action
# build
npm run build --workspace=packages/shared
npm run build --workspace=packages/action
# Remove devDeps
npm install --workspace=allure-deployer-shared --omit=dev
npm install --workspace=@allure/action --omit=dev
# Build docker image for Act
docker-compose build test-action
#docker build -t act-packages-action:latest -f ./dockerfiles/action.Dockerfile .
# Trigger 'test-action-local' job in .github/workflows/example.yaml
act push --job test-action-local --secret-file ./config/act.secrets \
 -e ./config/act.event.json --container-options "-v ${PWD}:/github/workspace" \
  --container-architecture linux/amd64 --rebuild

popd || exit
