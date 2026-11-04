'use strict';

const Homey = require('homey');
const { hex } = require('../../lib/vbus-connection');

class ResolControllerDriver extends Homey.Driver {
  async onPair(session) {
    let conn = null;
    let found = [];

    session.setHandler('connect', async (data) => {
      const host = String(data.host || '').trim();
      if (!host) throw new Error(this.homey.__('errors.no_host'));
      conn = {
        host,
        port: Number(data.port) || 7053,
        password: data.password === undefined || data.password === '' ? 'vbus' : String(data.password),
        channel: Number(data.channel) || 0,
      };
      let result;
      try {
        result = await this.homey.app.vbus.probe(conn, { timeout: 20000, settle: 4000 });
      } catch (e) {
        if (e.message === 'NO_DATA') throw new Error(this.homey.__('errors.no_data'));
        if (e.vbusPhase === 'PASS') throw new Error(this.homey.__('errors.bad_password'));
        throw new Error(this.homey.__('errors.connect_failed', { error: e.message }));
      }
      found = result.controllers.map((c) => {
        const values = result.latest.get(c.address) || new Map();
        return { ...c, caps: [...values.values()] };
      });
      return found.length;
    });

    session.setHandler('list_devices', async () => found.map((c) => {
      const capabilities = c.caps.map((m) => m.capabilityId);
      const capabilitiesOptions = {};
      c.caps.forEach((m) => { capabilitiesOptions[m.capabilityId] = { title: m.title }; });
      return {
        name: `${c.name} (0x${hex(c.address)})`,
        data: { id: `${conn.host}:${conn.port}:${conn.channel}:${hex(c.address)}` },
        store: { address: c.address },
        settings: { ...conn },
        capabilities,
        capabilitiesOptions,
      };
    }));
  }
}

module.exports = ResolControllerDriver;
