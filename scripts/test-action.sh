#!/bin/bash

pushd ..
# Install deps
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
# Trigger 'test-action-local' job in .github/workflows/example.yaml
act push --job test-action-local --secret-file ./config/act.secrets \
 -e ./config/act.event.json \
  --container-architecture linux/amd64 --rm --rebuild --pull=false

popd || exit
