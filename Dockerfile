FROM amd64/node:12-alpine AS prod
RUN apk --update add --no-cache git
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
ARG BUILD_DATE
ARG VCS_REF
LABEL org.label-schema.build-date=$BUILD_DATE \
        org.label-schema.name="Landroid Bridge" \
        org.label-schema.description="Bridge for connecting the Worx Landroid S Lawn Mower to home automation systems like OpenHAB or FHEM." \
        org.label-schema.vcs-ref=$VCS_REF \
        org.label-schema.vcs-url="https://github.com/virtualzone/landroid-bridge" \
        org.label-schema.schema-version="1.0"
COPY --from=build /usr/src/app/dist ./dist
EXPOSE 3000
CMD [ "node", "dist/server.js" ]
