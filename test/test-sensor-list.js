'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { VBusManager } = require('../lib/vbus-manager');
const { buildSensorDevices } = require('../lib/sensor-list');
const { mxPacket, startFakeKm2 } = require('./helpers');

test('lists connected temperature sensors as separate devices', async () => {
  const km2 = await startFakeKm2({ packets: [mxPacket([215, -35, 466, 8888, 100])] });
  const mgr = new VBusManager();
  try {
    const conn = { host: '127.0.0.1', port: km2.port, password: 'vbus', channel: 0 };
    const { controllers, latest } = await mgr.probe(conn, { timeout: 5000, settle: 200 });
    const devices = buildSensorDevices(conn, controllers, latest);
    const keys = devices.map((d) => d.store.key);
    assert.ok(keys.includes('temperature_sensor_1'));
    assert.ok(keys.includes('temperature_sensor_3'));
    assert.ok(!keys.includes('temperature_sensor_4'), 'sentinel sensor not offered');
    const d1 = devices.find((d) => d.store.key === 'temperature_sensor_1');
    assert.strictEqual(d1.store.address, 0x7E11);
    assert.strictEqual(d1.data.id, `127.0.0.1:${km2.port}:0:7E11:temperature_sensor_1`);
    assert.match(d1.name, /Temperature sensor 1 – DeltaSol MX/);
    assert.strictEqual(d1.settings.host, '127.0.0.1');
    assert.strictEqual(new Set(devices.map((d) => d.data.id)).size, devices.length, 'ids unique');
  } finally {
    await mgr.destroy();
    await km2.close();
  }
});
