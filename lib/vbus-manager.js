'use strict';

const { VBusConnection } = require('./vbus-connection');

/**
 * Shares one VBusConnection per host:port:channel between all devices
 * (refcounted), so a KM2 with several controllers uses a single TCP client.
 */
class VBusManager {
  constructor({ log = () => {}, ConnectionClass } = {}) {
    this.log = log;
    this.ConnectionClass = ConnectionClass;
    this.entries = new Map(); // key -> { conn, refs }
  }

  async acquire({ host, port = 7053, password = 'vbus', channel = 0 }) {
    const key = VBusConnection.keyFor(host, port, channel);
    let entry = this.entries.get(key);
    if (entry && entry.conn.password !== password) {
      // password changed: rebuild
      entry.conn.removeAllListeners();
      await entry.conn.disconnect();
      this.entries.delete(key);
      entry = null;
    }
    if (!entry) {
      const conn = new VBusConnection({
        host, port, password, channel, log: this.log, ConnectionClass: this.ConnectionClass,
      });
      entry = { conn, refs: 0 };
      this.entries.set(key, entry);
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
    const entry = this.entries.get(conn.key);
    if (!entry || entry.conn !== conn) return;
    entry.refs -= 1;
    if (entry.refs <= 0) {
      this.entries.delete(conn.key);
      conn.removeAllListeners();
      conn.disconnect();
    }
  }

  /** One-off connection for pairing; caller must call .close(). */
  async probe({ host, port = 7053, password = 'vbus', channel = 0 }, waitOptions) {
    const conn = new VBusConnection({
      host, port, password, channel, log: this.log, ConnectionClass: this.ConnectionClass,
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
