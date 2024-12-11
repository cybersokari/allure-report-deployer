FROM node:22-alpine
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