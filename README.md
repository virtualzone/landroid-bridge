# Landroid Bridge
Publishes readings from the Worx Landroid S Lawn Mower via HTTP (REST, JSON) and MQTT.

## Setup
### Using Docker
1. Create a ```config.json``` file (see template in source).
1. Run the image like this (assuming you want to link it with your MySQL container):
    ```
    docker run \
        -p 3000:3000 \
        --name landroid_bridge \
        --link mqtt:mqtt \
        -v /tmp/config.json:/usr/src/app/config.json \
        weweave/landroid-bridge
    ```

### Building from source
1. Make sure you have [Node.js](https://nodejs.org) installed (tested with Node.js v8).
1. Check out the source code and build it:
    ```
    git clone https://github.com/weweave/landroid-bridge.git
    cd landroid-bridge
    npm install
    npm run build-prod
    ```
1. Update ```config.json``` to match your environment.
1. Run the server:
    ```
    node dist/server.js
    ```

## HTTP REST URLs
* Get status: /landroid-s/status

## MQTT Topics
* landroid/status/language
* landroid/status/dateTime
* landroid/status/macAddress
* landroid/status/firmware
* landroid/status/wifiQuality
* landroid/status/active
* landroid/status/rainDelay
* landroid/status/timeExtension
* landroid/status/serialNumber
* landroid/status/totalTime
* landroid/status/totalDistance
* landroid/status/totalBladeTime
* landroid/status/batteryChargeCycle
* landroid/status/batteryCharging
* landroid/status/batteryVoltage
* landroid/status/batteryTemperature
* landroid/status/batteryLevel
* landroid/status/errorCode
* landroid/status/errorDescription: 
* landroid/status/statusCode
* landroid/status/statusDescription