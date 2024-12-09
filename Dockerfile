FROM node:22-alpine AS deps
USER root
RUN apk add openjdk17-jre
RUN npm install -g firebase-tools
RUN npm install -g typescript

FROM deps AS prod
WORKDIR /app

COPY worker/.  /app/
RUN npm install --omit=dev && npm run build
RUN npm uninstall -g typescript
## Remove .ts files
RUN rm -rf app

COPY start.sh /
CMD ["/bin/sh", "/start.sh"]