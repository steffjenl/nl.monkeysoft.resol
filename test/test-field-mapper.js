'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { Specification } = require('resol-vbus');
const { mapPacketFields, mapField, parseAliases, slugify, isLiveDataPacket } = require('../lib/field-mapper');
const { mxPacket } = require('./helpers');

const spec = Specification.getDefaultSpecification();

// 8 temps like the PHP reader (offsets 0..14) + a not-connected sensor (8888)
const VALUES = [215, -35, 466, 8888, 100, 200, 300, 400];

test('slugify', () => {
  assert.strictEqual(slugify('Temperature sensor 1'), 'temperature_sensor_1');
  assert.strictEqual(slugify('Pump speed relay 1'), 'pump_speed_relay_1');
});

test('maps MX temperatures to sub-capabilities, drops 888.8 sentinel', () => {
  const mapped = mapPacketFields(spec.getPacketFieldsForHeaders([mxPacket(VALUES)]));
  assert.strictEqual(mapped.get('measure_temperature.temperature_sensor_1').value, 21.5);
  assert.strictEqual(mapped.get('measure_temperature.temperature_sensor_2').value, -3.5);
  assert.strictEqual(mapped.get('measure_temperature.temperature_sensor_3').value, 46.6);
  assert.ok(!mapped.has('measure_temperature.temperature_sensor_4'), 'sentinel dropped');
  assert.strictEqual(mapped.get('measure_temperature.temperature_sensor_8').value, 40);
});

test('PHP offsets match spec field ids (offset = payload byte offset)', () => {
  const fields = spec.getPacketFieldsForHeaders([mxPacket(VALUES)]);
  const byOffset = (o) => fields.find((f) => f.id.endsWith(`_${String(o).padStart(3, '0')}_2_0`));
  assert.strictEqual(byOffset(0).name, 'Temperature sensor 1'); // Zonnecollector
  assert.strictEqual(byOffset(14).name, 'Temperature sensor 8'); // Buiten
});

test('percent, irradiance and unit conversion', () => {
  const mk = (unitCode, rawValue, name = 'x') => mapField({
    name, rawValue, id: name, packetFieldSpec: { type: { rootTypeId: 'Number', unit: { unitCode } } },
  });
  assert.strictEqual(mk('Percent', 80, 'Pump speed relay 1').capabilityId, 'measure_percent.pump_speed_relay_1');
  assert.strictEqual(mk('Bars', 1.5, 'Pressure sensor 17').value, 1500);
  assert.strictEqual(mk('MegawattHours', 2, 'Heat quantity').value, 2000);
  assert.strictEqual(mk('WattHours', 5000, 'Heat quantity').value, 5);
  assert.strictEqual(mk('Seconds', 5, 'x'), null);
  assert.strictEqual(mk('None', 4, 'Error mask').value, true);
  assert.strictEqual(mk('None', 0, 'Error mask').value, false);
  assert.strictEqual(mk('DegreesCelsius', 3276.7, 'T').value, null);
});

test('only broadcast v1.0 packets are live data', () => {
  assert.ok(isLiveDataPacket(mxPacket([1])));
  const p = mxPacket([1]);
  p.destinationAddress = 0x7E11;
  assert.ok(!isLiveDataPacket(p));
});

test('parseAliases', () => {
  assert.deepStrictEqual(parseAliases('temperature_sensor_1=Zonnecollector\n bad\nB = Buffer \n'), {
    temperature_sensor_1: 'Zonnecollector', b: 'Buffer',
  });
});
