FROM node:22-alpine
#WORK_DIR env is used in code to manage files
ENV WORK_DIR=/app
WORKDIR $WORK_DIR
USER root
# JRE for Allure commandline
RUN apk add openjdk17-jre
# Firebase Hosting
RUN npm install -g firebase-tools
# Create resuls staging directory
RUN mkdir "allure-results"
# Copy app files and install deps
COPY worker/.  /app/
RUN npm install && npm run build
# Remove .ts files
RUN rm -rf app

COPY start.sh /
CMD ["/bin/sh", "/start.sh"]