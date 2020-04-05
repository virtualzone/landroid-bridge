FROM node:11-alpine AS prod

WORKDIR /usr/src/app

# Add package.json
COPY package*.json .

# Restore node modules
RUN npm install --production



## BUILD STEP
FROM prod AS build

# Add everything else not excluded by .dockerignore
COPY . .

# Build it
RUN npm install && \
    npm run build-prod



## FINAL STEP
FROM prod as final

COPY --from=build /usr/src/app/dist ./dist

EXPOSE 3000
CMD [ "node", "dist/server.js" ]
