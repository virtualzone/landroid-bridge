## Installation of the systemctl script

This script is used in conjunction with the nodejs source installation to run as a service. 
It is not intended for use with the docker container.

Adjust the username and paths in the file, and copy it to /lib/systemd/system/

```
cp landroid-bridge /lib/systemd/system/
```

Run systemctl daemon-reload to refresh services:

```
systemctl daemon-reload
```

Enable the service

```
systemctl enable landroid-bridge.service
```
