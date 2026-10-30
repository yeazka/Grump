'use strict';
const fs = require('fs');
const path = require('path');

function toolDetail(input, status) {
  const file = String(input).match(/\b([\w.-]+\.(?:tsx?|jsx?|cjs|mjs|css|scss|html|json|py|rs|go|md))\b/i)?.[1];
  if (!file) return { Coding: 'Editing files', Testing: 'Running tests', Building: 'Packaging app', 'Using tools': 'Using a tool' }[status];
  if (status === 'Coding') return `Edit ${file}`;
  if (status === 'Testing') return `Test ${file}`;
  if (status === 'Building') return `Build ${file}`;
  const reading = /\b(Get-Content|readFileSync|readFile|\bcat\b|\bsed\b|\bhead\b)\b/i.test(input);
  if (reading) {
    const count = String(input).match(/(?:-First\s+|\bhead\s+-n\s+|\bread\s+|\blimit\s*[:=]\s*)(\d{1,5})\b/i)?.[1];
    return `Read ${file}${count ? ` · ${count} lines` : ''}`;
  }
  return `Inspect ${file}`;
}

// Classify local event metadata; chat text, code, and tool output are never retained.
function eventState(line) {
  if (!/task_started|task_complete|response_item/.test(line)) return null;
  try {
    const event = JSON.parse(line);
    const item = event.payload || {};
    if (event.type === 'event_msg' && item.type === 'task_started') return { active: true, status: 'Thinking', detail: 'Reading request' };
    if (event.type === 'event_msg' && item.type === 'task_complete') return { active: false, status: '', detail: '' };
    if (event.type !== 'response_item') return null;
    if (item.type === 'reasoning' || item.type === 'custom_tool_call_output') return { status: 'Thinking', detail: 'Planning next step' };
    if (item.type === 'message' && item.role === 'assistant') return { status: 'Replying', detail: 'Writing answer' };
    if (item.type === 'custom_tool_call') {
      const input = String(item.name||'')+' '+String(item.input || '');
      const status = /\bapply_patch\b/.test(input) ? 'Coding'
        : /\b(npm test|pytest|vitest|jest|cargo test)\b/i.test(input) ? 'Testing'
        : /\b(npm run (dist|build)|electron-builder|cargo build)\b/i.test(input) ? 'Building'
        : 'Using tools';
      const detail = toolDetail(input, status);
      return { status: status === 'Using tools' && /^Read /.test(detail) ? 'Reading' : status, detail };
    }
  } catch { return null; }
  return null;
}
function readRange(file, start, length) {
  let fd;
  try {
    const buffer = Buffer.alloc(length);
    fd = fs.openSync(file, 'r');
    fs.readSync(fd, buffer, 0, length, start);
    return buffer.toString('utf8');
  } catch { return ''; }
  finally { if (fd !== undefined) fs.closeSync(fd); }
}
function latestTaskState(file) {
  let size;
  try { size = fs.statSync(file).size; } catch { return null; }
  let end = size, suffix = '', latest = null;
  const floor=Math.max(0,size-4*1024*1024);
  while (end > floor) {
    const start = Math.max(floor, end - 128 * 1024);
    const lines = (readRange(file, start, end - start) + suffix).split(/\r?\n/);
    suffix = start > 0 ? lines.shift() : '';
    for (let i = lines.length - 1; i >= 0; i--) {
      const state = eventState(lines[i]);
      if (!state) continue;
      if (state.active !== undefined) return state.active ? { active: true, status: latest?.status || state.status, detail: latest?.detail || state.detail } : state;
      if (!latest) latest = state;
    }
    end = start;
  }
  const first = eventState(suffix);
  return first?.active !== undefined ? (first.active ? { active: true, status: latest?.status || first.status, detail: latest?.detail || first.detail } : first) : { active: false, status: '', detail: '' };
}

const cache = new Map();
function cachedTaskState(file) {
  let size;
  try { size = fs.statSync(file).size; } catch { return null; }
  const previous = cache.get(file);
  if (previous?.size === size) return previous.state;
  if (previous && size > previous.size && size - previous.size < 2 * 1024 * 1024) {
    const lines = (previous.partial + readRange(file, previous.size, size - previous.size)).split(/\r?\n/);
    const partial = lines.pop() || '';
    let state = previous.state;
    for (const line of lines) {
      const next = eventState(line);
      if (next) state = next.active === undefined ? (state.active ? { active: true, status: next.status, detail: next.detail } : state) : next;
    }
    cache.set(file, { size, state, partial });
    return state;
  }
  if(cache.size>=256)cache.delete(cache.keys().next().value);
  const state = latestTaskState(file);
  cache.set(file, { size, state, partial: '' });
  return state;
}

function codexActivity(root, now = Date.now()) {
  const candidates = [];
  function walk(dir, depth) {
    if (depth > 4) return;
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full, depth + 1);
      else if (entry.isFile() && entry.name.endsWith('.jsonl')) {
        try {
          const modified = fs.statSync(full).mtimeMs;
          if (now - modified < 10 * 60 * 1000) candidates.push({ full, modified });
        } catch {}
      }
    }
  }
  walk(root, 0);
  candidates.sort((a, b) => b.modified - a.modified);
  for (const { full } of candidates.slice(0, 12)) {
    const state = cachedTaskState(full);
    if (state?.active) return state;
  }
  return { active: false, status: '', detail: '' };
}

const codexTaskActive = (root, now) => codexActivity(root, now).active;
module.exports = { codexActivity, codexTaskActive, latestTaskState };
