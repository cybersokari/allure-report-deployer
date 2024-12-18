FROM node:22-alpine AS deps
RUN apk add openjdk17-jre
RUN npm install -g firebase-tools

FROM deps AS prod
USER root
WORKDIR /app

COPY packages/shared ./packages/shared
COPY packages/docker ./packages/docker
COPY package.json package-lock.json ./
COPY tsconfig.base.json ./
COPY node_modules ./node_modules

CMD ["/bin/sh", "./packages/docker/start.sh"]