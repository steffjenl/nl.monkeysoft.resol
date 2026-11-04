'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { VBusManager } = require('../lib/vbus-manager');
const { mxPacket, startFakeKm2 } = require('./helpers');

const VALUES = [215, -35, 466, 8888];

test('connects, handshakes and discovers controller + values', async () => {
  const km2 = await startFakeKm2({ packets: [mxPacket(VALUES)] });
  const mgr = new VBusManager();
  try {
    const { controllers, latest } = await mgr.probe(
      { host: '127.0.0.1', port: km2.port, password: 'vbus' },
      { timeout: 5000, settle: 200 },
    );
    assert.strictEqual(controllers.length, 1);
    assert.strictEqual(controllers[0].address, 0x7E11);
    assert.match(controllers[0].name, /DeltaSol MX/);
    assert.strictEqual(latest.get(0x7E11).get('measure_temperature.temperature_sensor_1').value, 21.5);
  } finally {
    await mgr.destroy();
    await km2.close();
  }
});

test('discovers two controllers on one bus', async () => {
  const km2 = await startFakeKm2({ packets: [mxPacket(VALUES), mxPacket(VALUES, 0x7E12)] });
  const mgr = new VBusManager();
  try {
    const { controllers } = await mgr.probe({ host: '127.0.0.1', port: km2.port }, { timeout: 5000, settle: 300 });
    assert.deepStrictEqual(controllers.map((c) => c.address).sort(), [0x7E11, 0x7E12]);
  } finally {
    await mgr.destroy();
    await km2.close();
  }
});

test('wrong password rejects with vbusPhase PASS', async () => {
  const km2 = await startFakeKm2({ password: 'secret', packets: [mxPacket(VALUES)] });
  const mgr = new VBusManager();
  try {
    await assert.rejects(
      mgr.probe({ host: '127.0.0.1', port: km2.port, password: 'nope' }, { timeout: 2000 }),
      (e) => e.vbusPhase === 'PASS',
    );
  } finally {
    await mgr.destroy();
    await km2.close();
  }
});

test('manager shares one connection and emits values', async () => {
  const km2 = await startFakeKm2({ packets: [mxPacket(VALUES)] });
  const mgr = new VBusManager();
  try {
    const a = await mgr.acquire({ host: '127.0.0.1', port: km2.port });
    const b = await mgr.acquire({ host: '127.0.0.1', port: km2.port });
    assert.strictEqual(a, b);
    await new Promise((resolve) => a.once('values', resolve));
    mgr.release(a);
    assert.strictEqual(mgr.entries.size, 1);
    mgr.release(b);
    assert.strictEqual(mgr.entries.size, 0);
  } finally {
    await mgr.destroy();
    await km2.close();
  }
});
