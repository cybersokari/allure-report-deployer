#!/bin/bash

pushd ../..
# Build docker image for Act
docker-compose build test-action

docker tag act-github-actions-dockeraction:latest sokari/act-github-actions-dockeraction:latest
docker push sokari/act-github-actions-dockeraction:latest

# Trigger 'test-action-local' job in .github/workflows/example.yaml
act push --job test-action-local --secret-file ./config/act.secrets \
 -e ./config/act.event.json --rebuild

popd || exit
