'use strict';

const { EventEmitter } = require('events');
const { TcpConnection, Specification } = require('resol-vbus');
const { isLiveDataPacket, mapPacketFields } = require('./field-mapper');

const spec = Specification.getDefaultSpecification();

function hex(n) {
  return n.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * One persistent VBus-over-TCP link to a KM2 / DL2 / DL3 / VBus-LAN.
 * Decodes live packets and emits:
 *   'state'  (connectionState string)
 *   'values' (address:number, Map<capabilityId, mapped>, deviceName:string)
 *   'error'  (Error)  - only if a listener exists
 */
class VBusConnection extends EventEmitter {
  constructor({
    host, port = 7053, password = 'vbus', channel = 0, log = () => {}, ConnectionClass = TcpConnection, timers,
  }) {
    super();
    // Injected so the app can pass this.homey.setTimeout/clearTimeout.
    this.timers = timers || { setTimeout, clearTimeout };
    this.host = host;
    this.port = Number(port);
    this.password = password;
    this.channel = Number(channel) || 0;
    this.log = log;
    this.state = 'DISCONNECTED';
    this.lastPacketAt = 0;
    this.controllers = new Map(); // address -> { address, name, lastSeen }
    this.latest = new Map(); // address -> Map(capabilityId -> mapped)
    this.conn = new ConnectionClass({
      host: this.host,
      port: this.port,
      password: this.password,
      channel: this.channel,
    });
    this.conn.on('connectionState', (s) => {
      this.state = s;
      this.log(`[vbus ${this.host}] state ${s}`);
      this.emit('state', s);
    });
    this.conn.on('packet', (p) => this._onPacket(p));
  }

  get key() {
    return VBusConnection.keyFor(this.host, this.port, this.channel);
  }

  /** Pool key: connections with a different password are separate links. */
  get poolKey() {
    return `${this.key}|${this.password}`;
  }

  static keyFor(host, port, channel) {
    return `${host}:${Number(port)}:${Number(channel) || 0}`;
  }

  async connect() {
    if (this.state !== 'DISCONNECTED') return;
    await this.conn.connect();
  }

  async disconnect() {
    try {
      await this.conn.disconnect();
    } catch (e) {
      this.log('disconnect error', e.message);
    }
  }

  _onPacket(packet) {
    if (!isLiveDataPacket(packet)) return;
    let fields;
    try {
      fields = spec.getPacketFieldsForHeaders([packet]);
    } catch (e) {
      this.log('spec error', e.message);
      return;
    }
    const address = packet.sourceAddress;
    const ps = spec.getPacketSpecification(packet);
    const name = (ps && ps.sourceDevice && ps.sourceDevice.name) || `VBus 0x${hex(address)}`;
    this.lastPacketAt = Date.now();
    this.controllers.set(address, { address, name, lastSeen: this.lastPacketAt });
    const mapped = mapPacketFields(fields);
    const merged = this.latest.get(address) || new Map();
    mapped.forEach((v, k) => merged.set(k, v));
    this.latest.set(address, merged);
    this.emit('values', address, mapped, name);
  }

  /** Controllers seen so far. */
  listControllers() {
    return [...this.controllers.values()];
  }

  /**
   * Resolve once at least one controller was seen (and a short settle time
   * passed so multiple controllers can announce themselves).
   */
  waitForControllers({ timeout = 15000, settle = 3000 } = {}) {
    const { setTimeout: setT, clearTimeout: clearT } = this.timers;
    return new Promise((resolve, reject) => {
      let settleTimer = null;
      const done = (fn, arg) => {
        clearT(timer);
        clearT(settleTimer);
        this.off('values', onValues);
        fn(arg);
      };
      const onValues = () => {
        if (!settleTimer) settleTimer = setT(() => done(resolve, this.listControllers()), settle);
      };
      const timer = setT(() => {
        const list = this.listControllers();
        if (list.length) done(resolve, list);
        else done(reject, new Error('NO_DATA'));
      }, timeout);
      this.on('values', onValues);
      if (this.controllers.size) onValues();
    });
  }
}

module.exports = { VBusConnection, hex };
