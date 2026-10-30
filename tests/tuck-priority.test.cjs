'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

test('browser tuck keeps its eyes when another activity and peekaboo are pending', () => {
  const code = fs.readFileSync(path.join(__dirname, '../renderer/js/core.js'), 'utf8');
  const source = code.slice(code.indexOf('function wantKey()'), code.indexOf('function layout()')).trim();
  assert.ok(source, 'wantKey is available');
  const S = { ring: null, charge: null, headset: null, prompt: null, expanded: false, notice: null,
    workActivity: { app: 'Codex' }, tuckApp: true, peekaboo: true, peek: null,
    settings: { autoTuck: true, quiet: false, minimal: false } };
  const context = { S, inside: false, hasMusic: () => false, hasActivity: () => false };
  assert.equal(vm.runInNewContext(`${source}\nwantKey()`, context), 'tuck');
  S.tuckApp = false;
  assert.equal(vm.runInNewContext(`${source}\nwantKey()`, context), 'work');
});

test('browser tuck shrinks and releases pointer access near a covered tab', () => {
  const code = fs.readFileSync(path.join(__dirname, '../renderer/js/core.js'), 'utf8');
  const source = code.slice(code.indexOf('function handleTuckDodge('), code.indexOf('if (bridge.onResetDodge)')).trim();
  const calls = [];
  const island = { dataset: {}, style: { removeProperty() {} } };
  const spring = () => ({ t: 0, k: 0, c: 0 });
  const context = { S: { tuckApp: true, expanded: false }, curKey: 'tuck', isTuckDodging: false,
    targetDodgeW: 56, targetDodgeH: 22, targetDodgeR: 11, sw: spring(), sh: spring(), sr: spring(),
    island, bridge: { setDodge: v => calls.push(v) }, hoverT: null, clearTimeout() {},
    clamp: (v,lo,hi) => Math.max(lo,Math.min(hi,v)), kick() {}, setInside: v => calls.push(['inside',v]),
    reportRect() {}, lastRectSig: '' };
  vm.runInNewContext(`${source}\nhandleTuckDodge(0,0,220,20)`, context);
  assert.equal(context.isTuckDodging, true);
  assert.ok(context.sh.t < 5);
  assert.equal(context.island.dataset.dodging, '1');
  assert.ok(calls.includes(true));
  vm.runInNewContext(`${source}\nhandleTuckDodge(0,0,400,100)`, context);
  assert.equal(context.isTuckDodging, false);
  assert.equal(context.sh.t, 22);
  assert.ok(calls.includes(false));
});
