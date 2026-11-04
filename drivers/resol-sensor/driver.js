'use strict';

const Homey = require('homey');
const { buildSensorDevices } = require('../../lib/sensor-list');

class ResolSensorDriver extends Homey.Driver {
  async onPair(session) {
    let conn = null;
    let controllers = [];
    let latest = new Map();

    session.setHandler('connect', async (data) => {
      const host = String(data.host || '').trim();
      if (!host) throw new Error(this.homey.__('errors.no_host'));
      conn = {
        host,
        port: Number(data.port) || 7053,
        password: data.password === undefined || data.password === '' ? 'vbus' : String(data.password),
        channel: Number(data.channel) || 0,
      };
      try {
        ({ controllers, latest } = await this.homey.app.vbus.probe(conn, { timeout: 20000, settle: 4000 }));
      } catch (e) {
        if (e.message === 'NO_DATA') throw new Error(this.homey.__('errors.no_data'));
        if (e.vbusPhase === 'PASS') throw new Error(this.homey.__('errors.bad_password'));
        throw new Error(this.homey.__('errors.connect_failed', { error: e.message }));
      }
      return controllers.length;
    });

    session.setHandler('list_devices', async () => buildSensorDevices(conn, controllers, latest));
  }
}

module.exports = ResolSensorDriver;
