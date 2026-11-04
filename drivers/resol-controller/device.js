'use strict';

const { BaseVBusDevice } = require('../../lib/base-device');
const { parseAliases } = require('../../lib/field-mapper');

class ResolControllerDevice extends BaseVBusDevice {
  async onInit() {
    this._aliases = parseAliases(this.getSetting('aliases'));
    await super.onInit();
  }

  async _handleValues(mapped) {
    for (const [capId, m] of mapped) {
      if (!this.hasCapability(capId)) {
        await this.addCapability(capId).catch((e) => this.error('addCapability', capId, e.message));
        await this.setCapabilityOptions(capId, { title: this._title(m) }).catch(() => {});
      }
      const isFirst = !this._lastSet.has(capId);
      const written = await this._setThrottled(capId, m.value);
      if (written && !isFirst) {
        if (m.boolean) {
          if (m.value) this._trigger('controller_error');
        } else {
          this._trigger('value_changed', { value: m.value, field: this._title(m) }, { field_id: capId });
        }
      }
    }
  }

  _title(m) {
    return this._aliases[m.key] || m.title;
  }

  _trigger(id, tokens = {}, state = {}) {
    this.homey.flow.getDeviceTriggerCard(id).trigger(this, tokens, state).catch((e) => this.error(id, e.message));
  }

  _onStale() {
    this._trigger('connection_lost');
  }

  _onRecovered() {
    this._trigger('connection_restored');
  }

  /** For flow autocomplete: dynamic list of this device's measurement capabilities. */
  fieldOptions(query, onlyBases) {
    const q = String(query || '').toLowerCase();
    return this.getCapabilities()
      .filter((id) => id.includes('.') && id !== 'alarm_generic')
      .filter((id) => !onlyBases || onlyBases.includes(id.split('.')[0]))
      .map((id) => ({ id, name: (this.getCapabilityOptions(id) || {}).title || id }))
      .filter((o) => o.name.toLowerCase().includes(q));
  }

  async onSettings({ newSettings, changedKeys }) {
    if (changedKeys.includes('aliases')) {
      this._aliases = parseAliases(newSettings.aliases);
      for (const id of this.getCapabilities()) {
        const key = id.split('.')[1];
        if (key && this._aliases[key]) await this.setCapabilityOptions(id, { title: this._aliases[key] }).catch(() => {});
      }
    }
    this._connectionSettingsChanged(changedKeys);
  }
}

module.exports = ResolControllerDevice;
