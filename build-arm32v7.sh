#!/bin/sh
docker pull arm32v6/node:12-alpine
docker build -t virtualzone/landroid-bridge:arm32v7 -f Dockerfile.rpi .
echo "Build finished, run the following command to push:"
echo "docker push virtualzone/landroid-bridge:arm32v7"
