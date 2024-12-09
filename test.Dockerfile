FROM node:22-alpine@sha256:adeb6d34aff46b81fb1dcf746961b6363180c53a91741c3c5c5db926c8df576c
#WORK_DIR env is used in code to manage files
ENV WORK_DIR=/app
WORKDIR $WORK_DIR
USER root
# JRE for Allure commandline
RUN apk add openjdk17-jre
# Firebase Hosting
RUN npm install -g firebase-tools
# Mount dir /allure-results
# Staging dir /app/allure-results
RUN mkdir "allure-results" # create staging
# Copy app files and install deps
COPY worker/.  /app/
RUN npm install -g typescript
RUN npm install

CMD ["npm", "run", "test"]