The mower can be incorporated into Home Assistant as a Vacuum, here is the example configuration:


# Home Assistant config:
```
...
vacuum:
        - platform: mqtt
          name: "My Landroid"
          command_topic: "mylandroid/set/mow"
          payload_turn_on: "start"
          payload_turn_off: "stop"
          battery_level_topic: "mylandroid/status/batteryLevel"
          battery_level_template: "{{ value }}"
          charging_topic: "mylandroid/status/batteryCharging"
          charging_template: "{{ value }}"
          docked_topic: "mylandroid/status/statusDescription"
          docked_template: "{{ true if value == 'Home' else false }}"
          error_topic: "mylandroid/status/statusDescription"
          error_template: "{{ value }}"
          json_attributes_topic: "mylandroid/status/jsonData"
...
```

# Corresponding landroid-bridge config:
```
...
    "mqtt": {
        "enable": true,
        "url": "mqtt://<yourbroker>",
        "topic": "mylandroid"
    },
...
```
