FROM node:20-alpine AS deps
LABEL authors="cybersokari"
RUN apk add openjdk17-jre
#RUN npm i -g allure #Allure V3

FROM deps AS prod

RUN npm i -g allure-deployer
COPY packages/docker/start.sh /start.sh
RUN chmod +x /start.sh

ENTRYPOINT ["/start.sh"]