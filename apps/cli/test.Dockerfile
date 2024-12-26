# This image npm pack the CLI for testing
FROM node:20-alpine AS javanode
RUN apk add openjdk17-jre

FROM node:20-alpine AS testdeps
WORKDIR /app
COPY src src
COPY package*.json .
COPY tsconfig.json .
COPY version-update.cjs .

RUN npm install
RUN npm run build
RUN npm publish --dry-run
RUN npm pack
RUN mv allure-deployer*.tgz allure-deployer.tgz

FROM javanode AS testbuild
COPY --from=testdeps /app/allure-deployer.tgz allure-deployer.tgz

RUN npm i -g allure-deployer.tgz

RUN allure-deployer -V