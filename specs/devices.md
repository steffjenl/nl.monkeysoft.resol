# Devices

## Tested (reference installation)
KM2 + **DeltaSol MX**, address `0x7E11`, live packet `00_0010_7E11_10_0100`. Field offsets used by the PHP reader (int16 LE, factor 0.1 °C):

| Offset | Spec field | Meaning in this installation |
|---|---|---|
| 0 | Temperature sensor 1 | Zonnecollector |
| 2 | Temperature sensor 2 | Buffervat |
| 4 | Temperature sensor 3 | Houtkachel |
| 6 | Temperature sensor 4 | Retour CV water |
| 8 | Temperature sensor 5 | Buffervat boven |
| 10 | Temperature sensor 6 | Woonkamer |
| 12 | Temperature sensor 7 | Badkamer |
| 14 | Temperature sensor 8 | Buiten |

Suggested alias setting for this installation:
```
temperature_sensor_1=Zonnecollector
temperature_sensor_2=Buffervat
temperature_sensor_3=Houtkachel
temperature_sensor_4=Retour CV water
temperature_sensor_5=Buffervat boven
temperature_sensor_6=Woonkamer
temperature_sensor_7=Badkamer
temperature_sensor_8=Buiten
```
(verified against the spec in `test/test-field-mapper.js`).

## Other controllers
Anything in the `resol-vbus` default specification (DeltaSol BS/4, SLT, C, E, ...) should work through the same generic path, but is untested. Report devices that work or break.
