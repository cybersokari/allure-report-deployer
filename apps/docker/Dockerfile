FROM node:20-alpine AS deps
LABEL authors="cybersokari"
RUN apk add openjdk17-jre

FROM deps AS prod

ARG CLI_VERSION=1.0.6
RUN npm i -g allure-deployer@$CLI_VERSION
COPY start.sh /start.sh
RUN chmod +x /start.sh

ENTRYPOINT ["/start.sh"]