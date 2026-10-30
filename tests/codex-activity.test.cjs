'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { codexActivity, codexTaskActive } = require('../codex-activity.cjs');

test('Codex animation follows task start and completion, not foreground focus', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'grump-codex-'));
  try {
    const dir = path.join(root, '2026', '10', '29');
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, 'rollout.jsonl');
    const event = type => JSON.stringify({ type: 'event_msg', payload: { type } }) + '\n';
    fs.writeFileSync(file, event('task_started'));
    assert.equal(codexTaskActive(root), true);
    assert.equal(codexActivity(root).status, 'Thinking');
    fs.appendFileSync(file, JSON.stringify({ type: 'response_item', payload: { type: 'custom_tool_call', name: 'exec', input: 'await tools.apply_patch("... patches ...")' } }) + '\n');
    assert.equal(codexActivity(root).status, 'Coding');
    fs.appendFileSync(file, JSON.stringify({ type: 'response_item', payload: { type: 'custom_tool_call_output' } }) + '\n');
    assert.equal(codexActivity(root).status, 'Thinking');
    fs.appendFileSync(file, event('task_complete'));
    assert.equal(codexTaskActive(root), false);
    fs.appendFileSync(file, event('task_started'));
    assert.equal(codexTaskActive(root), true);
    fs.appendFileSync(file, JSON.stringify({ type: 'response_item', payload: { type: 'custom_tool_call', name: 'exec', input: 'Get-Content renderer/app-sidebar.tsx | Select-Object -First 237' } }) + '\n');
    assert.deepEqual(codexActivity(root), { active: true, status: 'Reading', detail: 'Read app-sidebar.tsx · 237 lines' });
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
