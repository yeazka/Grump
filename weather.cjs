'use strict';

const LOCATIONS = Object.freeze({
  jakarta: ['Jakarta', -6.2088, 106.8456],
  bandung: ['Bandung', -6.9175, 107.6191],
  surabaya: ['Surabaya', -7.2575, 112.7521],
  yogyakarta: ['Yogyakarta', -7.7956, 110.3695],
  semarang: ['Semarang', -6.9667, 110.4167],
  medan: ['Medan', 3.5952, 98.6722],
  makassar: ['Makassar', -5.1477, 119.4327],
  denpasar: ['Denpasar', -8.6705, 115.2126],
  palembang: ['Palembang', -2.9761, 104.7754],
  balikpapan: ['Balikpapan', -1.2379, 116.8529]
});

function createWeatherService({ broadcast, fetchImpl = fetch, now = Date.now }) {
  let state = { available: false, temperature: null, city: '', updatedAt: 0, source: 'MET Norway' };
  let enabled = false, city = 'jakarta', nextFetch = 0, requestId = 0, pendingId = 0;
  async function refresh(force = false) {
    if (!enabled || pendingId || (!force && now() < nextFetch)) return;
    const location = LOCATIONS[city];
    if (!location) return;
    const id = ++requestId;
    pendingId = id;
    nextFetch = now() + 10 * 60 * 1000;
    try {
      const url = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${location[1]}&lon=${location[2]}`;
      const response = await fetchImpl(url, { headers: { 'User-Agent': 'Grump/1.0 (+https://github.com/yeazka/Grump)' }, signal: AbortSignal.timeout(8000) });
      if (!response.ok) throw new Error(`Weather HTTP ${response.status}`);
      const expires = Date.parse(response.headers?.get('expires') || '');
      if (Number.isFinite(expires)) nextFetch = Math.max(nextFetch, expires);
      const data = await response.json();
      const temperature = data?.properties?.timeseries?.[0]?.data?.instant?.details?.air_temperature;
      if (!Number.isFinite(temperature)) throw new Error('Weather temperature missing');
      if (id !== requestId || !enabled) return;
      state = { available: true, temperature, city: location[0], updatedAt: now(), source: 'MET Norway' };
      broadcast('weather-state', state);
    } catch {
      if (id !== requestId || !enabled) return;
      state = { available: false, temperature: null, city: location[0], updatedAt: 0, source: 'MET Norway' };
      broadcast('weather-state', state);
    } finally { if (pendingId === id) pendingId = 0; }
  }
  function configure(on, selectedCity) {
    const nextCity = LOCATIONS[selectedCity] ? selectedCity : 'jakarta';
    const changed = enabled !== !!on || city !== nextCity;
    enabled = !!on; city = nextCity;
    if (!changed) return;
    requestId++;
    pendingId = 0;
    nextFetch = 0;
    state = { available: false, temperature: null, city: LOCATIONS[city][0], updatedAt: 0, source: 'MET Norway' };
    broadcast('weather-state', state);
    if (enabled) return refresh(true);
  }
  return { configure, refresh, getState: () => state };
}

module.exports = { LOCATIONS, createWeatherService };
