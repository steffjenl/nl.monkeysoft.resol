'use strict';

const { BaseVBusDevice } = require('../../lib/base-device');

class ResolSensorDevice extends BaseVBusDevice {
  async _handleValues(mapped) {
    const m = mapped.get(`measure_temperature.${this.getStoreValue('key')}`);
    if (m) await this._setThrottled('measure_temperature', m.value);
  }
}

module.exports = ResolSensorDevice;
