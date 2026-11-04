'use strict';

/**
 * EXPERIMENTAL write support (VBus v2 value access) on top of resol-vbus.
 * Disabled unless the device setting `allow_write` is on.
 *
 * Flow: wait for free bus -> setValueById -> read-back -> release bus.
 * Resolves with the value read back from the controller.
 */
async function withBus(connection, address, timeout, fn) {
  const c = connection.conn;
  await c.waitForFreeBus(timeout);
  try {
    return await fn(c);
  } finally {
    try { await c.releaseBus(address, { timeout: 5000 }); } catch { /* ignore */ }
  }
}

async function readValue(connection, address, valueId, { timeout = 20000 } = {}) {
  return withBus(connection, address, timeout, async (c) => {
    const dg = await c.getValueById(address, valueId, { timeout: 500, tries: 3 });
    if (!dg) throw new Error('TIMEOUT');
    return dg.value;
  });
}

async function writeValue(connection, address, valueId, value, { timeout = 20000, save = false } = {}) {
  return withBus(connection, address, timeout, async (c) => {
    const ack = await c.setValueById(address, valueId, value, { timeout: 500, tries: 3, save });
    if (!ack) throw new Error('TIMEOUT');
    const back = await c.getValueById(address, valueId, { timeout: 500, tries: 3 });
    if (!back) throw new Error('TIMEOUT');
    if (back.value !== value) throw new Error(`READBACK_MISMATCH:${back.value}`);
    return back.value;
  });
}

module.exports = { writeValue, readValue };
