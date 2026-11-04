'use strict';

const { VBusConnection } = require('./vbus-connection');

/**
 * Shares one VBusConnection per host:port:channel:password between all devices
 * (refcounted), so a KM2 with several controllers uses a single TCP client.
 * The password is part of the pool key, so a device with a changed password
 * never tears down the link other devices still use.
 */
class VBusManager {
  constructor({ log = () => {}, ConnectionClass, timers } = {}) {
    this.log = log;
    this.ConnectionClass = ConnectionClass;
    this.timers = timers;
    this.entries = new Map(); // poolKey -> { conn, refs }
  }

  _create({ host, port, password, channel }) {
    return new VBusConnection({
      host, port, password, channel, log: this.log, ConnectionClass: this.ConnectionClass, timers: this.timers,
    });
  }

  async acquire({
    host, port = 7053, password = 'vbus', channel = 0,
  }) {
    const poolKey = `${VBusConnection.keyFor(host, port, channel)}|${password}`;
    let entry = this.entries.get(poolKey);
    if (!entry) {
      entry = {
        conn: this._create({
          host, port, password, channel,
        }),
        refs: 0,
      };
      this.entries.set(poolKey, entry);
    }
    entry.refs += 1;
    if (entry.conn.state === 'DISCONNECTED') {
      try {
        await entry.conn.connect();
      } catch (e) {
        this.release(entry.conn);
        throw e;
      }
    }
    return entry.conn;
  }

  release(conn) {
    const entry = this.entries.get(conn.poolKey);
    if (!entry || entry.conn !== conn) return;
    entry.refs -= 1;
    if (entry.refs <= 0) {
      this.entries.delete(conn.poolKey);
      conn.removeAllListeners();
      conn.disconnect().catch(() => {});
    }
  }

  /** One-off connection for pairing; cleaned up before returning. */
  async probe({
    host, port = 7053, password = 'vbus', channel = 0,
  }, waitOptions) {
    const conn = this._create({
      host, port, password, channel,
    });
    try {
      await conn.connect();
      const controllers = await conn.waitForControllers(waitOptions);
      return { controllers, latest: conn.latest };
    } finally {
      conn.removeAllListeners();
      await conn.disconnect();
    }
  }

  async destroy() {
    for (const { conn } of this.entries.values()) {
      conn.removeAllListeners();
      await conn.disconnect();
    }
    this.entries.clear();
  }
}

module.exports = { VBusManager };
