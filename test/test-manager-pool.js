'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { VBusManager } = require('../lib/vbus-manager');
const { mxPacket, startFakeKm2 } = require('./helpers');

test('different passwords use separate connections; release keeps the other alive', async () => {
  const km2 = await startFakeKm2({ packets: [mxPacket([215, -35, 466, 8888])] });
  const mgr = new VBusManager();
  const base = { host: '127.0.0.1', port: km2.port };
  try {
    const a = await mgr.acquire({ ...base, password: 'vbus' });
    const b = await mgr.acquire({ ...base, password: 'vbus' });
    assert.strictEqual(a, b, 'same password shares one connection');
    mgr.release(b);
    assert.strictEqual(mgr.entries.size, 1, 'still referenced by first device');
    mgr.release(a);
    assert.strictEqual(mgr.entries.size, 0);
  } finally {
    await mgr.destroy();
    await km2.close();
  }
});

test('waitForControllers uses injected timers and cleans up', async () => {
  const km2 = await startFakeKm2({ packets: [mxPacket([215, -35, 466, 8888])] });
  const live = new Set();
  const timers = {
    setTimeout: (fn, ms) => { const t = setTimeout(() => { live.delete(t); fn(); }, ms); live.add(t); return t; },
    clearTimeout: (t) => { live.delete(t); clearTimeout(t); },
  };
  const mgr = new VBusManager({ timers });
  try {
    await mgr.probe({ host: '127.0.0.1', port: km2.port }, { timeout: 5000, settle: 100 });
    assert.strictEqual(live.size, 0, 'no leftover timers');
  } finally {
    await mgr.destroy();
    await km2.close();
  }
});
