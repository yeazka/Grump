'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createWeatherService } = require('../weather.cjs');

test('weather requests only when enabled and never displays a fallback temperature', async () => {
  const sent = [];
  let calls = 0;
  const service = createWeatherService({
    broadcast: (_channel, state) => sent.push(state),
    fetchImpl: async () => {
      calls++;
      return { ok: true, json: async () => ({ properties: { timeseries: [{ data: { instant: { details: { air_temperature: 31.4 } } } }] } }) };
    }
  });
  await service.refresh();
  assert.equal(calls, 0);
  await service.configure(true, 'jakarta');
  assert.equal(calls, 1);
  assert.equal(service.getState().temperature, 31.4);
  service.configure(false, 'jakarta');
  assert.equal(service.getState().available, false);
  assert.equal(service.getState().temperature, null);
  assert.equal(sent.at(-1).available, false);
});
