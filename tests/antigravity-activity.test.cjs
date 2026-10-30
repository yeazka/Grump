'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const { antigravityActivity } = require('../antigravity-activity.cjs');

test('Antigravity activity follows running session steps and returns idle when done', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'grump-antigravity-'));
  const db = new DatabaseSync(path.join(root, 'session.db'));
  try {
    db.exec('CREATE TABLE steps (idx INTEGER PRIMARY KEY, step_type INTEGER, status INTEGER)');
    db.exec('INSERT INTO steps VALUES (0, 14, 3)');
    assert.deepEqual(antigravityActivity(root), { active: true, status: 'Thinking', detail: 'Reading request' });
    assert.equal(antigravityActivity(root, Date.now() + 16_000).active, false);
    db.exec('INSERT INTO steps VALUES (1, 15, 2)');
    assert.deepEqual(antigravityActivity(root), { active: true, status: 'Thinking', detail: 'Planning response' });
    db.exec('UPDATE steps SET status = 3 WHERE idx = 1');
    assert.equal(antigravityActivity(root).active, true);
    assert.equal(antigravityActivity(root, Date.now() + 16_000).active, false);
    db.exec('INSERT INTO steps VALUES (2, 132, 6)');
    assert.deepEqual(antigravityActivity(root), { active: true, status: 'Working', detail: 'Processing task' });
    db.exec('UPDATE steps SET status = 3 WHERE idx = 2');
    assert.equal(antigravityActivity(root).active, true);
    assert.equal(antigravityActivity(root, Date.now() + 16_000).active, false);
    db.exec('ALTER TABLE steps ADD COLUMN step_payload BLOB');
    db.prepare('INSERT INTO steps (idx,step_type,status,step_payload) VALUES (3,132,6,?)').run(Buffer.from('read_file app-sidebar.tsx'));
    assert.deepEqual(antigravityActivity(root), { active: true, status: 'Reading', detail: 'Read app-sidebar.tsx' });
  } finally { db.close(); fs.rmSync(root, { recursive: true, force: true }); }
});
