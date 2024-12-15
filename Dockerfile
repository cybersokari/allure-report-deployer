FROM node:22-alpine AS deps
USER root
RUN apk add openjdk17-jre
RUN npm install -g firebase-tools

FROM deps AS prod
WORKDIR /app

COPY packages ./packages
COPY package.json package-lock.json ./
COPY tsconfig.base.json ./
COPY node_modules ./node_modules

CMD ["/bin/sh", "./packages/docker/start.sh"]