FROM timbru31/java-node:8-iron
#WORK_DIR env is used in code to manage files
ENV WORK_DIR=/app
WORKDIR $WORK_DIR
USER root

# Install tools for Firebase Hosting
RUN npm install -g firebase-tools
# Create resuls staging directory
RUN mkdir "allure-results"
# Copy app files and install deps
COPY worker/.  /app/
RUN npm install && npm run build

COPY scripts/. /
CMD ["/bin/sh", "/start.sh"]