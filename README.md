# Landroid Bridge
Publishes readings from the Worx Landroid S Lawn Mower via HTTP (REST, JSON) and MQTT. Allows for modifying settings via HTTP and MQTT.

Provides an intelligent automatic scheduler, taking the hourly weather forecast and schedules your mower according to the weather forecast, history data and individual mower/garden profile.

You can see the current readings and scheduler results on an integrated web interface.

![](./res/screenshot.png)

## Setup
### Prerequisites
* If you want to use MQTT instead of HTTP, you need to have an MQTT Broker like [Eclipse Mosquitto](http://mosquitto.org/) installed.
* If you want to build from source, make sure you have [Node.js](https://nodejs.org/en/) installed.
* If you want to use the pre-built Docker image, you need to have [Docker](https://www.docker.com/) up and running.

### Using Docker
1. Create a ```config.json``` file (see template in source).
1. Run the image like this (assuming you want to link it with your MQTT container, such as one based on the [eclipse-mosquitto](https://hub.docker.com/_/eclipse-mosquitto/) image):
    ```
    docker run \
        -p 3000:3000 \
        --name landroid_bridge \
        --link mqtt:mqtt \
        -v /tmp/config.json:/usr/src/app/config.json \
        virtualzone/landroid-bridge
    ```

There is also a pre-built arm32v7 image for Raspberry Pi: ```virtualzone/landroid-bridge:arm32v7```

### Building from source
1. Make sure you have [Node.js](https://nodejs.org) installed (tested with Node.js v11).
1. Check out the source code and build it:
    ```
    git clone https://github.com/virtualzone/landroid-bridge.git
    cd landroid-bridge
    npm install
    npm run grunt
    ```
1. Update ```config.json``` to match your environment.
1. Run the server:
    ```
    node dist/server.js
    ```
1. Optional (Linux only): 
    1. Set up an init.d script to start the bridge on system startup (see example in initd-script folder).
    1. Set up a systemctl script to start the bridge on system startup (see example in systemctl-script folder).

### Security
Landroid Bridge does not feature any authentication or authorization right now. If you're using MQTT to communicate with the bridge, make sure to use strong passwords to authenticate with your MQTT broker. If you're using HTTP/REST, use a proxy server like nginx or HAProxy that handles the authentication/authorization in front of the bridge.

## Web interface
You can access the web interface at:

http://localhost:3000

## Setting up MQTT
To connect to an MQTT broker without any authentication, please modify your config.json like this:

```
"mqtt": {
    "enable": true,
    "url": "mqtt://localhost",
    "topic": "landroid"
}
```

If your MQTT broker requires username/password authentication:

```
"mqtt": {
    "enable": true,
    "url": "mqtt://username:password@localhost",
    "topic": "landroid"
}
```

To use SSL/TLS, specify the paths to the CA, Key and Cert files (paths relative to the bridge's working directory). You can optionally allow self-signed certificates:

```
"mqtt": {
    "enable": true,
    "url": "mqtts://localhost",
    "topic": "landroid",
    "caFile": "./optional_path_to_ca_file.crt",
    "keyFile": "./optional_path_to_key_file.key",
    "certFile": "./optional_path_to_cert_file.crt",
    "allowSelfSigned": true
}
```

## Configuring the scheduler
To enable and configure the scheduler modify your config.json:

```
"scheduler": {
    "enable": false,
    "cron": false,
    "weather": {
        "provider": "wunderground",
        "apiKey": "YOUR_API_KEY",
        "latitude": 50.0982164,
        "longitude": 8.221404
    },
    "db": "./scheduler.db",
    "earliestStart": 11,
    "latestStop": 21,
    "startEarly": false,
    "offDays": 2,
    "squareMeters": 300,
    "perHour": 50,
    "mowTime": 75,
    "chargeTime": 75,
    "daysForTotalCut": 2,
    "rainDelay": 120,
    "threshold": 30
}
```

The meaning of these settings:
* enable: true enables the integrated scheduler
* cron: true enables automatic cron-based scheduling (once per hour) - if false, scheduling must be triggered manually, see below
* weather.provider: One of ["wunderground"](https://www.wunderground.com/weather/api/d/docs?d=data/history&MR=1) or ["darksky"](https://darksky.net/dev/)
* weather.apiKey: Your Wunderground/Dark Sky API key
* weather.latitude: Your location's latitude
* weather.longitude: Your location's longitude
* db: Location of the SQLite3 database file (created automatically)
* earliestStart: The earliest hour of the day the mower will start
* latestStop: The latest hour of the day the mower will stop
* startEarly: true schedules for the earliest start possible, whereas false schedules for the latest start possible
* offDays: Number of days per week your mower won't mow
* squareMeters: Square meters of lawn
* perHour: Square meters your mower will mow per hour
* mowTime: Minutes your mower will mow before returning to the basis for charging
* chargeTime: Minutes your mower needs to charge its batteries
* daysForTotalCut: Number of days you allow your mower for completely cutting your lawn
* rainDelay: Minutes of standby after a rain shower
* threshold: The minimum chance of rain (percentage) considered as "don't mow"

### Manually triggering the scheduler
If scheduler.cron is set to false in your config.json, no scheduling is performed automatically. You can trigger scheduling by firing an HTTP POST request to scheduler/apply (i.e. via your home automation system):

```
curl -X POST http://localhost:3000/scheduler/apply
```

## Managing multiple mowers
If you have more than one mower connected to your Landroid Account, you can set the mower to be selected by changing the ```dev_sel``` value in the ```config.json``` file. The default value is 0 (zero-based for the first mower in your account).

If you want to manage more than one mower with this Landroid Bridge, please start multiple instances of the bridge, each with a differnt ```dev_sel``` value. You'll need to set a unique HTTP Port and MQTT Topic per instance then.

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
* Send mower home: POST /landroid-s/stop
* Pause mower: POST /landroid-s/pause
* Set rain delay: PUT /landroid-s/set/rainDelay/x (where 0 <= x <= 300)
* Set time extension: PUT /landroid-s/set/timeExtension/x (where -100 <= x <= 100)
* Set work time schedule: PUT /landroid-s/set/schedule/n (where 0 <= n <= 6, 0 is Sunday)
* Poll landroid cloud: POST /landroid-s/poll

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
* landroid/status/pitch
* landroid/status/roll
* landroid/status/yaw
* landroid/status/errorCode
* landroid/status/errorDescription: 
* landroid/status/statusCode
* landroid/status/statusDescription
* landroid/status/schedule/n (where n is the weekday, 0 is Sunday)

### Published by your application (the bridge will perform updates)
* landroid/set/start (starts the mower)
* landroid/set/stop (stops the mower and sends it home)
* landroid/set/pause (stops the mower)
* landroid/set/mow (payload "start" starts the mower, "stop" sends the mover home, "pause" stops the mower)
* landroid/set/rainDelay (sets rain delay in minutes, supply delay value as payload)
* landroid/set/timeExtension (sets time extension in percent, supply percentage value as payload)
* landroid/set/schedule/n (sets work time for weekday n, where 0 is Sunday – see examples below)
* landroid/set/poll (polls data from landroid cloud)

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
