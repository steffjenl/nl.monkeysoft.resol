'use strict';

const Homey = require('homey');

const STALE_CHECK_MS = 15 * 1000;

/**
 * Shared behaviour for devices fed by a VBusConnection:
 * shared connection (acquire/release), reconnect on failure, stale watchdog,
 * per-capability throttle. Subclasses implement `_handleValues(mapped)` and
 * may override `_onStale()` / `_onRecovered()`.
 */
class BaseVBusDevice extends Homey.Device {
  async onInit() {
    this._lastSet = new Map(); // capabilityId -> { t, v }
    this._lastPacketAt = 0;
    this._stale = false;
    this._conn = null;
    this._onValues = (address, mapped) => {
      if (address === this.address()) this._onMapped(mapped).catch((e) => this.error(e));
    };
    await this.setUnavailable(this.homey.__('device.connecting')).catch(() => {});
    await this._connect();
    this._staleTimer = this.homey.setInterval(() => this._checkStale(), STALE_CHECK_MS);
  }

  address() {
    return this.getStoreValue('address');
  }

  vbusConnection() {
    if (!this._conn) throw new Error(this.homey.__('errors.not_connected'));
    return this._conn;
  }

  isOnline() {
    return this.getAvailable();
  }

  async _connect() {
    this._disconnect();
    const s = this.getSettings();
    try {
      this._conn = await this.homey.app.vbus.acquire({
        host: s.host, port: s.port, password: s.password, channel: s.channel,
      });
    } catch (e) {
      this.error('connect failed', e.message);
      this._conn = null;
      await this.setUnavailable(this.homey.__('device.connect_failed', { error: e.message })).catch(() => {});
      this._retry = this.homey.setTimeout(() => this._connect().catch(() => {}), 30 * 1000);
      return;
    }
    this._conn.on('values', this._onValues);
    const known = this._conn.latest.get(this.address());
    if (known) this._onMapped(known).catch((e) => this.error(e));
  }

  _disconnect() {
    this.homey.clearTimeout(this._retry);
    if (this._conn) {
      this._conn.off('values', this._onValues);
      this.homey.app.vbus.release(this._conn);
      this._conn = null;
    }
  }

  async _onMapped(mapped) {
    this._lastPacketAt = Date.now();
    if (this._stale || !this.getAvailable()) {
      const wasStale = this._stale;
      this._stale = false;
      await this.setAvailable().catch(() => {});
      if (wasStale) this._onRecovered();
    }
    await this._handleValues(mapped);
  }

  /**
   * Throttled, change-only capability update.
   * @returns {Promise<boolean>} true if the value was written
   */
  async _setThrottled(capId, value) {
    const minMs = Math.max(1, Number(this.getSetting('update_interval')) || 10) * 1000;
    const now = Date.now();
    const last = this._lastSet.get(capId);
    if (last && last.v === value) return false;
    if (last && now - last.t < minMs) return false;
    this._lastSet.set(capId, { t: now, v: value });
    await this.setCapabilityValue(capId, value).catch((e) => this.error('set', capId, e.message));
    return true;
  }

  _checkStale() {
    const timeout = Math.max(30, Number(this.getSetting('stale_timeout')) || 120) * 1000;
    if (!this._conn || this._stale) return;
    if (this._lastPacketAt && Date.now() - this._lastPacketAt > timeout) {
      this._stale = true;
      this.setUnavailable(this.homey.__('device.no_data')).catch(() => {});
      this._onStale();
    }
  }

  async _handleValues() {}

  _onStale() {}

  _onRecovered() {}

  _connectionSettingsChanged(changedKeys) {
    if (['host', 'port', 'password', 'channel'].some((k) => changedKeys.includes(k))) {
      this.homey.setTimeout(() => this._connect().catch((e) => this.error(e)), 500);
    }
  }

  async onSettings({ changedKeys }) {
    this._connectionSettingsChanged(changedKeys);
  }

  async onDeleted() {
    this.homey.clearInterval(this._staleTimer);
    this._disconnect();
  }

  async onUninit() {
    this.homey.clearInterval(this._staleTimer);
    this._disconnect();
  }
}

module.exports = { BaseVBusDevice };
