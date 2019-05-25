#!/bin/sh
docker pull arm32v7/node:11
docker build -t virtualzone/landroid-bridge:arm32v7 -f Dockerfile.rpi .
echo "Build finished, run the following command to push:"
echo "docker push virtualzone/landroid-bridge:arm32v7"