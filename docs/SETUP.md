# Setup

## Requirements
- Homey Pro (local app, firmware >= 12) on the same network as the Resol module.
- A KM2, DL2, DL3 or VBus/LAN adapter connected to the controller's VBus.
- The module's **VBus password** (default `vbus`; KM2/DL2: web interface, "Settings").

## Pairing
1. Add device > Resol VBus > Resol Controller.
2. Enter host/IP, port (7053), password, channel (0, only DL3/VBus.net use others).
3. Homey connects and listens up to 20 s for controllers on the bus.
4. Select the controller(s) and add them. Sensors that are not connected (888.8 °C) are skipped.

## Controller device or single sensors
- **Resol Controller**: one device per controller with all sensors, pumps, hours etc.
- **Resol Temperature Sensor**: one device per temperature sensor (native `measure_temperature`), so each can be placed in its own zone and used in Homey's climate tiles/Insights.
Both can be used together; they share one connection to the module.

## Sensor names
Sensors are named after the Resol specification (`Temperature sensor 1`). To use your own names, open device settings > *Sensor names* and add one line per sensor:

```
temperature_sensor_1=Zonnecollector
temperature_sensor_2=Buffervat
temperature_sensor_3=Houtkachel
```
The key is the part after the dot in the capability id (visible in Homey developer tools).

## Notes
- The controller pushes data every few seconds. Homey keeps **one TCP connection** per module, shared by all controllers on it.
- Many modules only accept a few simultaneous TCP clients. If another system (script, Resol VBus Logger) also connects, it may be refused while Homey is connected. Test accordingly.
- A device becomes unavailable when no data arrives for the configured timeout (default 120 s) and recovers automatically.

## Writing values (experimental)
Enable *Allow writing values* in device settings, then use the action *Set controller value* with a controller-specific VBus value id. Wrong ids can change controller configuration; values are read back and verified. Not verified on hardware yet.

## Troubleshooting
| Symptom | Cause |
|---|---|
| "The VBus password was rejected" | wrong password on the module |
| "no controller data within 20 seconds" | wrong module/channel, controller not on that VBus, or the module's single client slot is taken |
| "Could not connect" | wrong IP/port, firewall, module offline |
| Device flaps unavailable | network issues or stale timeout too low |
