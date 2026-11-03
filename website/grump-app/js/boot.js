'use strict';
/* ===== START ===== */
// Website demo adapter. The desktop renderer keeps these bindings private.
window.__island = { S, layout, go, collapse };
layout();
sw.x = sw.t; sh.x = sh.t; sr.x = sr.t; paintIsland(); reportRect(true);

// Start quietly on every display; show battery notifications only for real events.
