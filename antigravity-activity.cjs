'use strict';
const fs = require('fs');
const path = require('path');

function stepDetail(step) {
  if (step.step_type === 15) return { active: true, status: 'Thinking', detail: 'Planning response' };
  const text = step.step_payload ? Buffer.from(step.step_payload).toString('utf8') : '';
  const file = text.match(/\b([\w.-]+\.(?:tsx?|jsx?|cjs|mjs|css|scss|html|json|py|rs|go|md))\b/i)?.[1];
  if (file && /\b(read_file|view_file|Get-Content|read\s+\d*\s*lines?)\b/i.test(text)) {
    const count = text.match(/(?:\bread\s+|\blimit\s*[:=]\s*|\b(?:num_lines|line_count)\s*[:=]\s*)(\d{1,5})\b/i)?.[1];
    return { active: true, status: 'Reading', detail: `Read ${file}${count ? ` · ${count} lines` : ''}` };
  }
  if (file && /\b(write_to_file|apply_patch|replace_file_content|edit_file)\b/i.test(text))
    return { active: true, status: 'Coding', detail: `Edit ${file}` };
  return { active: true, status: 'Working', detail: 'Processing task' };
}

function antigravityActivity(root, now = Date.now()) {
  let DatabaseSync;
  try { ({ DatabaseSync } = require('node:sqlite')); } catch { return { active: false, status: '', detail: '' }; }
  let entries;
  try { entries = fs.readdirSync(root, { withFileTypes: true }); } catch { return { active: false, status: '', detail: '' }; }
  const recent = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.db')) continue;
    const file = path.join(root, entry.name);
    try {
      let modified = fs.statSync(file).mtimeMs;
      try { modified = Math.max(modified, fs.statSync(file + '-wal').mtimeMs); } catch {}
      if (now - modified < 10 * 60 * 1000) recent.push({ file, modified });
    } catch {}
  }
  recent.sort((a, b) => b.modified - a.modified);
  for (const { file, modified } of recent.slice(0, 8)) {
    let db;
    try {
      db = new DatabaseSync(file, { readOnly: true });
      let step;
      try { step = db.prepare('SELECT step_type, status, step_payload FROM steps ORDER BY idx DESC LIMIT 1').get(); }
      catch { step = db.prepare('SELECT step_type, status FROM steps ORDER BY idx DESC LIMIT 1').get(); }
      // Antigravity's local step statuses 2 and 6 represent running work.
      if (step && (step.status === 2 || step.status === 6)) {
        return stepDetail(step);
      }
      // Intermediate planner steps are marked DONE before the full task ends.
      // Keep the indicator through short gaps between Antigravity steps.
      if (step && now - modified < 15_000) {
        return step.step_type === 14
          ? { active: true, status: 'Thinking', detail: 'Reading request' }
          : stepDetail(step);
      }
    } catch {}
    finally { try { db?.close(); } catch {} }
  }
  return { active: false, status: '', detail: '' };
}

module.exports = { antigravityActivity };
