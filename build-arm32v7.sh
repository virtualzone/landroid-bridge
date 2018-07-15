#!/bin/sh
docker pull arm32v7/node:8
docker build -t weweave/landroid-bridge:arm32v7 -f Dockerfile.rpi .
echo "Build finished, run the following command to push:"
echo "docker push weweave/landroid-bridge:arm32v7"