'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('five rapid Grump clicks trigger anger even after the popup opens', () => {
  const code = fs.readFileSync(path.join(__dirname, '../renderer/js/personality.js'), 'utf8');
  const source = code.slice(code.indexOf("island.addEventListener('click'"), code.indexOf("island.addEventListener('pointermove'"));
  let clickHandler, now = 0, collapsed = 0, angry = 0, stopped = 0;
  const context = { grumpClicks: [], performance: { now: () => now }, S: { expanded: true }, hoverT: null,
    island: { addEventListener: (_name, fn) => { clickHandler = fn; }, offsetWidth: 100,
      classList: { add() {}, remove() {} } },
    clearTimeout() {}, setTimeout() {}, collapse: () => { collapsed++; },
    setTempExp: exp => { if (exp === 'angry') angry++; } };
  vm.runInNewContext(source, context);
  for (let i = 0; i < 5; i++) {
    now += 300;
    clickHandler({ target: { closest: () => null }, preventDefault() {}, stopImmediatePropagation() { stopped++; } });
  }
  assert.equal(angry, 1);
  assert.equal(collapsed, 1);
  assert.equal(stopped, 1);
});
