'use strict';
/* ===== START ===== */
window.__island = { S, layout, go, collapse, dismissMiniPopup, resetDemoTransition() {
  clearTimeout(slideTimeout);
  isSliding = false;
  island.classList.remove('paged-sliding');
  document.querySelectorAll('.view.sliding').forEach(view => {
    view.classList.remove('sliding');
    view.style.transition = '';
    view.style.transform = '';
    view.style.opacity = '';
    view.style.visibility = '';
  });
} };
layout();
sw.x = sw.t; sh.x = sh.t; sr.x = sr.t; paintIsland(); reportRect(true);

// Start quietly on every display; show battery notifications only for real events.
