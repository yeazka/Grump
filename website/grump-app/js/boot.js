'use strict';
/* ===== START ===== */
layout();
sw.x = sw.t; sh.x = sh.t; sr.x = sr.t; paintIsland(); reportRect(true);

// Start quietly on every display; show battery notifications only for real events.

// API debug (dipakai untuk pengujian)
window.__island = { S, go, collapse, peek, notice, triggerChargeAnim, layout, pageStep, get key() { return curKey; } };
