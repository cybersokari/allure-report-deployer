FROM node:22-alpine AS deps
USER root
RUN apk add openjdk17-jre
RUN npm install -g firebase-tools

FROM deps AS prod
WORKDIR /app

COPY worker/lib  ./lib
COPY worker/node_modules ./node_modules

COPY start.sh /
CMD ["/bin/sh", "/start.sh"]