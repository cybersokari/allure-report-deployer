# This image npm pack the CLI for testing
FROM node:20-alpine AS javanode
RUN apk add openjdk17-jre

FROM node:20-alpine AS build
WORKDIR /app
ENV CLI_DIR=/apps/cli
COPY $CLI_DIR/src src
COPY $CLI_DIR/package*.json /app/
COPY $CLI_DIR/tsconfig.json .
COPY $CLI_DIR/version-update.cjs .

RUN npm install
RUN npm run build
RUN npm publish --dry-run
RUN npm pack
RUN mv allure-deployer*.tgz allure-deployer.tgz

FROM javanode AS install
COPY --from=build /app/allure-deployer.tgz allure-deployer.tgz

RUN npm i -g allure-deployer.tgz

RUN allure-deployer -V

COPY apps/docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]

