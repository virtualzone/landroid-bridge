FROM multiarch/alpine:armhf-v3.8
RUN apk add --update nodejs npm

WORKDIR /usr/src/app

# Add package.json
COPY package*.json .

# Restore node modules
RUN npm install

# Add everything else not excluded by .dockerignore
COPY . .

# Build it
RUN npm run build-prod

EXPOSE 3000
CMD [ "node", "dist/server.js" ]