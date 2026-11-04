'use strict';

/**
 * Maps resol-vbus packet fields (from the built-in specification) to Homey
 * capabilities. Pure functions, no Homey dependency, so they are unit-testable.
 */

// unitCode -> { capability, convert(value) }
const UNIT_MAP = {
  DegreesCelsius: { capability: 'measure_temperature' },
  Percent: { capability: 'measure_percent' },
  WattsPerSquareMeter: { capability: 'measure_irradiance' },
  LitersPerHour: { capability: 'measure_flow_rate' },
  Bars: { capability: 'measure_pressure', convert: (v) => v * 1000 }, // Homey: mbar
  Hectopascals: { capability: 'measure_pressure' }, // 1 hPa = 1 mbar
  Hours: { capability: 'measure_hours' },
  Watts: { capability: 'measure_power' },
  Kilowatts: { capability: 'measure_power', convert: (v) => v * 1000 },
  WattHours: { capability: 'meter_power', convert: (v) => v / 1000 },
  KilowattHours: { capability: 'meter_power' },
  MegawattHours: { capability: 'meter_power', convert: (v) => v * 1000 },
};

const ERROR_MASK_NAME = 'Error mask';

/** VBus "sensor not connected" marker is 888.8 (raw 8888) for temperatures. */
function isTemperatureSentinel(value) {
  return Math.abs(value - 888.8) < 0.05 || Math.abs(value) >= 3276;
}

function slugify(name) {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * Packets that carry live controller data: VBus v1, broadcast to 0x0010.
 * Other packets (addressed to specific slaves) hold no sensor data.
 */
function isLiveDataPacket(packet) {
  return Boolean(packet)
    && packet.destinationAddress === 0x0010
    && packet.command !== undefined
    && (typeof packet.getProtocolVersion !== 'function' || packet.getProtocolVersion() === 0x10);
}

/**
 * @param {object} field - item returned by Specification#getPacketFieldsForHeaders
 * @returns {null | {key, capabilityId, baseCapability, value, title, boolean}}
 *   null when the field is not mappable or has no valid value.
 */
function mapField(field) {
  if (!field || !field.packetFieldSpec) return null;
  const name = field.name;
  const unitCode = field.packetFieldSpec.type
    && field.packetFieldSpec.type.unit
    && field.packetFieldSpec.type.unit.unitCode;
  const rootTypeId = field.packetFieldSpec.type && field.packetFieldSpec.type.rootTypeId;
  if (rootTypeId !== 'Number') return null;

  const key = slugify(name);
  if (!key) return null;

  let base;
  let convert = (v) => v;
  let boolean = false;

  if (name === ERROR_MASK_NAME) {
    base = 'alarm_generic';
    boolean = true;
  } else {
    const mapping = UNIT_MAP[unitCode];
    if (!mapping) return null;
    base = mapping.capability;
    if (mapping.convert) convert = mapping.convert;
  }

  const raw = field.rawValue;
  let value = null;
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    if (boolean) {
      value = raw !== 0;
    } else if (unitCode === 'DegreesCelsius' && isTemperatureSentinel(raw)) {
      value = null;
    } else {
      value = Math.round(convert(raw) * 100) / 100;
    }
  }

  return {
    key,
    baseCapability: base,
    capabilityId: `${base}.${key}`,
    value,
    title: name,
    boolean,
  };
}

/**
 * Maps all fields of a packet; keeps only fields with a valid value.
 * Colliding keys (same name in one packet, should not happen) keep the first.
 */
function mapPacketFields(fields) {
  const out = new Map();
  for (const f of fields) {
    const m = mapField(f);
    if (m && m.value !== null && !out.has(m.capabilityId)) out.set(m.capabilityId, m);
  }
  return out;
}

/** Parse the alias textarea: one `key=Name` per line. */
function parseAliases(text) {
  const aliases = {};
  String(text || '').split(/\r?\n/).forEach((line) => {
    const i = line.indexOf('=');
    if (i < 1) return;
    const key = line.slice(0, i).trim().toLowerCase();
    const label = line.slice(i + 1).trim();
    if (key && label) aliases[key] = label;
  });
  return aliases;
}

module.exports = {
  UNIT_MAP, mapField, mapPacketFields, parseAliases, slugify, isLiveDataPacket, isTemperatureSentinel,
};
