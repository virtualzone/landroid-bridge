FROM arm32v7/node:8 as node_cache

WORKDIR /usr/src/app

# Add package.json
COPY package*.json .

# Restore node modules
RUN npm install

# Add everything else not excluded by .dockerignore
COPY . .

# Build it
RUN npm run build-prod

#2nd stage
FROM node:8-alpine
WORKDIR /usr/src/app
USER root

COPY --from=node_cache /usr/src/app .

# Copy source files, and possibily invalidate so we have to rebuild
COPY . . 

EXPOSE 3000
CMD [ "node", "dist/server.js" ]
