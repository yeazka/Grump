'use strict';
/* ===== START ===== */
layout();
sw.x = sw.t; sh.x = sh.t; sr.x = sr.t; paintIsland(); reportRect(true);

// Start quietly on every display; show battery notifications only for real events.
