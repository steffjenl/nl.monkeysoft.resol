# Architecture

Push model: controllers broadcast, we listen. No polling timers.

```
KM2/DL2 --TCP 7053--> VBusConnection (lib/vbus-connection.js)
                         |  resol-vbus TcpConnection + default Specification
                         |  packet -> getPacketFieldsForHeaders -> field-mapper
                         v  emit 'values'(address, Map<capabilityId, mapped>)
VBusManager (lib/vbus-manager.js)  one shared connection per host:port:channel (refcount)
                         v
ResolControllerDevice (one per VBus source address)
   - dynamic capabilities (addCapability on first valid value)
   - throttle (setting update_interval) + only on change
   - stale watchdog -> setUnavailable / connection_lost, recovery -> connection_restored
```

## Pairing
`pair/connection.html` -> handler `connect` -> `VBusManager#probe` (temporary connection, waits for packets, 20 s max, 4 s settle so several controllers can announce) -> `list_devices` returns one device per source address with the capabilities already seen.
Device identity: `data.id = host:port:channel:ADDR`; connection details in settings (password field), VBus address in store.

## Reconnect
`TcpConnection` reconnects on its own (10 s, up to 60 s back-off). Device-level failures on first connect retry every 30 s.

## Writes
`lib/writer.js` + flow action `set_controller_value`, gated by setting `allow_write` (default off).

## Why resol-vbus
Contains the complete Resol specification (all controllers, field names, units, factors). Pure JS for the TCP path; `serialport` is optional and not installed. Pinned `0.29.0`. If the library is abandoned, only `vbus-connection.js` and `field-mapper.js` depend on it.

## Drivers
- `resol-controller`: one device per VBus controller, dynamic capabilities, flow cards, optional write.
- `resol-sensor`: one device per temperature sensor (`measure_temperature` only). Identity `host:port:channel:ADDR:key`, store `{address,key}`. List built by `lib/sensor-list.js`.
- Both extend `lib/base-device.js` (shared connection, throttle, stale watchdog).
