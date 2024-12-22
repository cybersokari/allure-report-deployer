FROM node:22-alpine AS deps
RUN apk add openjdk17-jre

FROM deps AS prod
USER root
WORKDIR /app

ENV SHARED_DIR=packages/shared
ENV DOCKER_DIR=packages/docker

COPY $SHARED_DIR/dist $SHARED_DIR/dist
COPY $SHARED_DIR/package*.json $SHARED_DIR

COPY $DOCKER_DIR/dist $DOCKER_DIR/dist
COPY $DOCKER_DIR/package*.json $DOCKER_DIR

COPY package*.json ./
COPY tsconfig.base.json ./
COPY node_modules ./node_modules

CMD ["/bin/sh", "./packages/docker/start.sh"]