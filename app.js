'use strict';

const Homey = require('homey');
const { VBusManager } = require('./lib/vbus-manager');
const { writeValue } = require('./lib/writer');

class ResolApp extends Homey.App {
  async onInit() {
    this.vbus = new VBusManager({ log: (...a) => this.log(...a) });
    this._registerFlowCards();
    this.log('Resol VBus app started');
  }

  async onUninit() {
    if (this.vbus) await this.vbus.destroy();
  }

  _registerFlowCards() {
    // Conditions
    this.homey.flow.getConditionCard('controller_online')
      .registerRunListener(async (args) => args.device.isOnline());

    this.homey.flow.getConditionCard('relay_is_on')
      .registerRunListener(async (args) => {
        const v = args.device.getCapabilityValue(args.field.id);
        return typeof v === 'number' && v > 0;
      })
      .registerArgumentAutocompleteListener('field', async (query, args) => args.device.fieldOptions(query, ['measure_percent']));

    this.homey.flow.getConditionCard('value_above')
      .registerRunListener(async (args) => {
        const v = args.device.getCapabilityValue(args.field.id);
        return typeof v === 'number' && v > args.threshold;
      })
      .registerArgumentAutocompleteListener('field', async (query, args) => args.device.fieldOptions(query));

    this.homey.flow.getConditionCard('value_below')
      .registerRunListener(async (args) => {
        const v = args.device.getCapabilityValue(args.field.id);
        return typeof v === 'number' && v < args.threshold;
      })
      .registerArgumentAutocompleteListener('field', async (query, args) => args.device.fieldOptions(query));

    // Triggers: field autocomplete + filter
    const changed = this.homey.flow.getDeviceTriggerCard('value_changed');
    changed.registerArgumentAutocompleteListener('field', async (query, args) => args.device.fieldOptions(query));
    changed.registerRunListener(async (args, state) => args.field.id === state.field_id);

    // Action (experimental write)
    this.homey.flow.getActionCard('set_controller_value')
      .registerRunListener(async (args) => {
        const dev = args.device;
        if (!dev.getSetting('allow_write')) throw new Error(this.homey.__('errors.write_disabled'));
        const valueId = Number(args.value_id);
        if (!Number.isInteger(valueId) || valueId < 0) throw new Error(this.homey.__('errors.bad_value_id'));
        return writeValue(dev.vbusConnection(), dev.address(), valueId, Number(args.value), { save: false });
      });
  }
}

module.exports = ResolApp;
