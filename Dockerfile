FROM node:8-alpine

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

RUN apk update && \
    apk add git

COPY *.js /usr/src/app/
COPY *.json /usr/src/app/
COPY src/ /usr/src/app/src/

RUN npm install && \
    npm run build-prod

EXPOSE 3000
CMD [ "node", "dist/server.js" ]