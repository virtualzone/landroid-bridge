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
1. Optional: Set up an init.d script to start the bridge on system startup (Linux only, see example in initd-script folder).

### Security
Landroid Bridge does not feature any authentication or authorization right now. If you're using MQTT to communicate with the bridge, make sure to use strong passwords to authenticate with your MQTT broker. If you're using HTTP/REST, use a proxy server like nginx or HAProxy that handles the authentication/authorization in front of the bridge.

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
* Get status as JSON: GET /landroid-s/status
* Start mower: POST /landroid-s/start
* Stop mower: POST /landroid-s/stop
* Set rain delay: PUT /landroid-s/set/rainDelay/x (where 0 <= x <= 300)
* Set time extension: PUT /landroid-s/set/timeExtension/x (where -100 <= x <= 100)
* Set work time schedule: PUT /landroid-s/set/schedule/n (where 0 <= n <= 6, 0 is Sunday)

### Examples
The following examples use the cURL command line util.

Getting the status (current settings):
```
curl -X GET http://localhost:3000/landroid-s/status
```

Starting the mower:
```
curl -X POST http://localhost:3000/landroid-s/start
```

Setting rain delay to 120 minutes:
```
curl -X PUT http://localhost:3000/landroid-s/set/rainDelay/120
```

Setting Saturday's work time to start at 10:30 for 60 minutes with no edge cut:
```
curl -X PUT -H "Content-Type: application/json" -d '{"startHour":10,"startMinute":30,"durationMinutes":60,"cutEdge":false}' http://localhost:3000/landroid-s/set/schedule/6
```

## MQTT Topics
## Published by the bridge (you can listen on these topics with your application)
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
* landroid/status/schedule/n (where n is the weekday, 0 is Sunday)

### Published by your application (the bridge will perform updates)
* landroid/set/start (starts the mower)
* landroid/set/stop (stops the mower)
* landroid/set/rainDelay (sets rain delay in minutes, supply delay value as payload)
* landroid/set/timeExtension (sets time extension in percent, supply percentage value as payload)
* landroid/set/schedule/n (sets work time for weekday n, where 0 is Sunday – see examples below)

### Examples
The following examples use the mosquitto_pub command line util of the Mosquitto MQTT broker.

Starting the mower:
```
mosquitto_pub -t landroid/set/start
```

Setting rain delay to 120 minutes:
```
mosquitto_pub -t landroid/set/rainDelay -m 120
```

Setting Saturday's work time to start at 10:30 for 60 minutes with no edge cut:
```
mosquitto_pub -t landroid/set/schedule/6 -m '{"startHour":10,"startMinute":30,"durationMinutes":60,"cutEdge":false}'
```