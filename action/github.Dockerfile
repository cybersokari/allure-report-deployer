FROM node:22-alpine AS deps
RUN apk add openjdk17-jre
RUN npm install -g firebase-tools

FROM deps AS prod

COPY ../worker/lib  ./lib
COPY ../worker/node_modules ./node_modules

COPY entrypoint.sh /
ENTRYPOINT ["/bin/sh", "/entrypoint.sh"]