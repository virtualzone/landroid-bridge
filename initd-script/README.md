## Installation of the init.d script

This script is used in conjunction with the nodejs source installation. 
It is not intended for use with the docker container.

Adjust the username and path in the file, and copy it to /etc/init.d/

```
cp landroid-bridge /etc/init.d/
```

Run update-rc.d to load the bridge upon startup:

```
update-rc.d landroid-bridge defaults
```