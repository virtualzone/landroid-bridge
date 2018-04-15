# Landroid Bridge
Publishes readings from the Worx Landroid S Lawn Mower via HTTP (REST, JSON) and MQTT.

## Setup
### Prerequisites
* If you want to use MQTT instead of HTTP, you need to have an MQTT Broker like [Eclipse Mosquitto](http://mosquitto.org/) installed.
* If you want to build from source, make sure you have [Node.js](https://nodejs.org/en/) installed.
* If you want to use the pre-built Docker image, you need to have [Docker](https://www.docker.com/) up and running.

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

## Connecting to OpenHAB
To connect this Landroid Bridge to [OpenHAB](http://www.openhab.org/), add the following configurations to your OpenHAB installation after Landroid Bridge is up and running successfully (see above):
1. Install the [MQTT Binding](https://docs.openhab.org/addons/bindings/mqtt1/readme.html) in OpenHAB (e.g. using the Paper UI).
1. Add an MQTT configuration in ```services/mqtt.cfg```:
    ```
    mqtt.url=tcp://mqtt:1883
    mqtt.user=MQTT_USERNAME
    mqtt.pwd=MQTT_PASSWORD
    ```
1. Add items (e.g. in ```items/mower.items```):
    ```
    Number Landroid_ErrorCode "Error Code [%d]" <lawnmower> {mqtt="<[mqtt:landroid/status/errorCode:state:default]"}
    String Landroid_ErrorDescription "Error [%s]" <lawnmower> {mqtt="<[mqtt:landroid/status/errorDescription:state:default]"}
    Number Landroid_StatusCode "Status Code [%d]" <lawnmower> {mqtt="<[mqtt:landroid/status/statusCode:state:default]"}
    String Landroid_StatusDescription "Status [%s]" <lawnmower> {mqtt="<[mqtt:landroid/status/statusDescription:state:default]"}
    String Landroid_DateTime "Last Update [%s]" <calendar> {mqtt="<[mqtt:landroid/status/dateTime:state:default]"}
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