'use strict';
/* The shape of the To-do genie, after Bartosz Ciechanowski's BCGenieEffect (MIT), the well-known rebuild of the macOS genie.
   Two phases that overlap: first both sides of the card bend into a neck toward the notch (0 to 0.4 of the time), then the card slides
   along those curves into the notch (0.3 to 1). The card is cut into thin horizontal rows; each row is placed on the curves, so the
   edges stay smooth. Closing plays t from 0 to 1, opening from 1 to 0. Used by genie-overlay.js and by the tests. */
(function (root) {
  const DURATION_S = 0.58, CLOSE_S = 0.36;   // opening, and the quicker "zhapp" of closing
  const CURVES = [0, 0.4], SLIDE = [0.3, 1];
  const clamp01 = (x) => Math.max(0, Math.min(1, x));
  const ease = (x) => 0.5 - 0.5 * Math.cos(Math.PI * clamp01(x));
  const phase = (t, [a, b]) => clamp01((t - a) / (b - a));   // linear: the pace comes from time() below
  // The pace of the whole animation. Opening starts fast and settles slowly (ease-out). Closing is quick at both ends and only eases a
  // little in the middle, where the neck forms: x + 0.1 sin(2 pi x) is 1.6 times the average speed at the ends, 0.4 in the middle.
  const easeOut = (x) => 1 - Math.pow(1 - clamp01(x), 3), snap = (x) => { x = clamp01(x); return x + 0.1 * Math.sin(2 * Math.PI * x); };
  const time = (x, backwards) => (backwards ? 1 - easeOut(x) : snap(x));
  const duration = (backwards) => (backwards ? DURATION_S : CLOSE_S);   // x: how far through the run (0 to 1); returns t for rows()
  const bend = (u) => u * u * (3 - 2 * u);   // the side curve: straight at the bottom, turning in toward the notch, straight again at the neck

  // Can the genie run between these two rectangles (the notch above the card)?
  function fits(card, notch) {
    return !!card && !!notch && card.width > 0 && card.height > 0 && notch.width > 0
      && notch.y + notch.height * 0.5 < card.y;
  }

  // Rows+1 pairs of points (left, right), bottom row first: [{y, left, right, v}], v being the picture's row (0 top, 1 bottom).
  function rows(t, card, notch, count = 80) {
    const bent = phase(t, CURVES), slid = phase(t, SLIDE);
    const bottom = card.y + card.height, end = notch.y + notch.height * 0.5;
    const span = bottom - end;
    const top = card.height / span;   // where the card's top edge sits along the path (0 = its bottom edge, 1 = the notch)
    const endLeft = notch.x + notch.width * 0.2, endRight = notch.x + notch.width * 0.8;
    const left0 = card.x, right0 = card.x + card.width;
    // the part of the path the card covers: both edges move by the same amount, the top one stops at the notch
    const from = slid, to = Math.min(1, top + slid);
    const out = [];
    for (let i = 0; i <= count; i++) {
      const f = i / count;   // 0 = the card's bottom edge, 1 = its top edge
      const u = from + (to - from) * f;
      const k = bent * bend(u);
      out.push({ y: bottom - u * span, left: left0 + (endLeft - left0) * k, right: right0 + (endRight - right0) * k, v: 1 - f });
    }
    return out;
  }

  const api = { DURATION_S, CLOSE_S, CURVES, SLIDE, ease, easeOut, snap, time, duration, phase, bend, fits, rows };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GrumpGenieShape = api;
})(typeof window !== 'undefined' ? window : globalThis);
