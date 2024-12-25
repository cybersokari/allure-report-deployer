FROM node:20-alpine AS deps
LABEL authors="cybersokari"
RUN apk add openjdk17-jre
#RUN npm i -g allure #Allure V3

FROM deps AS prod

ENV APP_HOME=/app
ENV SHARED_DIR=packages/shared
ENV ACTION_DIR=packages/action

COPY $SHARED_DIR/dist $APP_HOME/$SHARED_DIR/dist
COPY $SHARED_DIR/package*.json $APP_HOME/$SHARED_DIR

COPY $ACTION_DIR/dist $APP_HOME/$ACTION_DIR/dist
COPY $ACTION_DIR/package*.json $APP_HOME/$ACTION_DIR

COPY package*.json tsconfig.base.json $APP_HOME
COPY node_modules $APP_HOME/node_modules

COPY $ACTION_DIR/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]