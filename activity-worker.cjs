'use strict';
const {parentPort, workerData} = require('node:worker_threads');
const {codexActivity} = require('./codex-activity.cjs');
const {antigravityActivity} = require('./antigravity-activity.cjs');
parentPort.on('message', () => {
  try {
    parentPort.postMessage({codex:codexActivity(workerData.codex), antigravity:antigravityActivity(workerData.antigravity)});
  } catch { parentPort.postMessage({error:true}); }
});
