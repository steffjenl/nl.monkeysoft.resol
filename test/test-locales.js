'use strict';

const test = require('node:test');
const assert = require('node:assert');
const en = require('../locales/en.json');
const nl = require('../locales/nl.json');

function flatten(obj, prefix = '') {
  return Object.entries(obj).flatMap(([k, v]) => (
    v && typeof v === 'object' ? flatten(v, `${prefix}${k}.`) : [`${prefix}${k}`]
  ));
}

test('en and nl locales have identical keys', () => {
  assert.deepStrictEqual(flatten(nl).sort(), flatten(en).sort());
});

test('keys used in code exist in locales', () => {
  const used = [
    'device.connect_failed', 'device.connecting', 'device.no_data',
    'errors.bad_password', 'errors.bad_value_id', 'errors.connect_failed',
    'errors.no_data', 'errors.no_host', 'errors.not_connected', 'errors.write_disabled',
  ];
  const have = new Set(flatten(en));
  used.forEach((k) => assert.ok(have.has(k), `missing locale key ${k}`));
});
