'use strict';

const { hex } = require('./vbus-connection');

const TEMP_PREFIX = 'measure_temperature.';

/**
 * Builds the pair-list for single temperature sensors from probe results.
 * @param {{host,port,password,channel}} conn
 * @param {Array<{address,name}>} controllers
 * @param {Map<number, Map<string, {key,title,value}>>} latest
 */
function buildSensorDevices(conn, controllers, latest) {
  const out = [];
  for (const c of controllers) {
    const values = latest.get(c.address) || new Map();
    for (const [capId, m] of values) {
      if (!capId.startsWith(TEMP_PREFIX)) continue;
      out.push({
        name: `${m.title} – ${c.name}`,
        data: { id: `${conn.host}:${conn.port}:${conn.channel}:${hex(c.address)}:${m.key}` },
        store: { address: c.address, key: m.key },
        settings: { ...conn },
      });
    }
  }
  return out;
}

module.exports = { buildSensorDevices };
