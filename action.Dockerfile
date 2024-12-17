FROM node:22-alpine AS deps
LABEL authors="cybersokari"
RUN apk add openjdk17-jre
RUN npm install -g firebase-tools

FROM deps AS prod

ENV APP_HOME=/app

COPY packages/shared $APP_HOME/packages/shared
COPY packages/action $APP_HOME/packages/action
COPY package*.json tsconfig.base.json $APP_HOME
COPY node_modules $APP_HOME/node_modules


COPY packages/action/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]