# Capability mapping

Key = lowercase slug of the spec field name (`Temperature sensor 1` -> `temperature_sensor_1`). Capability id = `<base>.<key>`.

| Spec unit | Capability | Conversion |
|---|---|---|
| DegreesCelsius | measure_temperature | none; 888.8 / >=3276 -> no value |
| Percent (pump speed, outputs) | measure_percent (custom) | none |
| WattsPerSquareMeter | measure_irradiance (custom) | none |
| LitersPerHour | measure_flow_rate (custom) | none |
| Bars / Hectopascals | measure_pressure | bar x1000 -> mbar |
| Hours | measure_hours (custom) | none |
| Watts / Kilowatts | measure_power | kW x1000 |
| WattHours / KilowattHours / MegawattHours | meter_power | -> kWh |
| field "Error mask" | alarm_generic | value != 0 |

Skipped: dates, individual error-bit fields, units without a mapping (Seconds, Volts, ...), non-number types.

Rules
- A capability is added only once a valid value was seen (unconnected sensors never appear).
- Titles come from the spec (`name`); overridden by the *Sensor names* setting.
- Updates: only on change and at most every `update_interval` s.
- Triggers: `value_changed` per field (not for the first value), `controller_error` when error mask turns true.
