FROM node:20-alpine AS deps
LABEL authors="cybersokari"
RUN apk add --no-cache openjdk17-jre

FROM deps AS prod

ARG CLI_VERSION=1.0.6
RUN npm i -g allure-deployer@$CLI_VERSION
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]