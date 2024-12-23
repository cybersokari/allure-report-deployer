# This image npm pack the CLI for testing
FROM node:20-alpine AS javanode
RUN apk add openjdk17-jre

FROM node:22-alpine AS testdeps
WORKDIR /app
COPY packages/shared ./packages/shared
COPY packages/cli ./packages/cli
COPY package.json package-lock.json ./
COPY tsconfig.base.json ./

RUN npm install --workspaces
RUN npm run build
WORKDIR /app/packages/cli
RUN npm publish --dry-run
RUN npm pack
RUN mv allure-deployer*.tgz allure-deployer.tgz

FROM javanode AS testbuild
COPY --from=testdeps /app/packages/cli/allure-deployer.tgz allure-deployer.tgz

RUN npm i -g allure-deployer.tgz

RUN allure-deployer -V