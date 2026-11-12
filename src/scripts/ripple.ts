// A faint, irregular leaded-glass lattice lies behind the whole site.
// Clicking blank space drops a stone: smooth rings spread outward like a pond,
// carrying a ring of rose-window foils with them, then fade.
//
// Performance: two canvases. The resting lattice is drawn once into an offscreen image
// covering a few screens of the page and copied onto the bottom canvas only when you
// scroll. The rings draw on a transparent top canvas as plain arcs, which the browser
// renders cheaply and smoothly at any speed.

const JEWELS = ['#e0475e', '#4a8ae6', '#3fc490', '#a87fe0', '#e6b85c'];
const GOLD = '#e6b85c';

/* ── Lattice ────────────────────────────────────────────────── */
const CELL_W = 46; // average width of one pane
const CELL_H = 62; // average height of one pane
const JITTER_X = 0.6; // how far joints wander sideways (fraction of CELL_W)
const JITTER_Y = 0.4; // how far joints wander up/down (fraction of a row)
const MISSING = 0.16; // share of lead lines left out, so some panes merge
const BASE_LINE = 'rgba(243,237,226,0.05)'; // resting lead lines
const BASE_DOT = 'rgba(212,162,76,0.14)'; // resting joints
const DOT_SHARE = 0.4; // share of joints that show a dot at rest

/* ── Splash ─────────────────────────────────────────────────── */
const DURATION = 1.9; // seconds for one ring to fully spread
const RING_GAP = 0.16; // seconds between the rings of one splash
const RINGS = 3;
const FOILS = 16;
const MAX_RIPPLES = 12;
const LIFETIME = DURATION + RING_GAP * (RINGS - 1);

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/** Clicks on these aren't "blank space". */
const INTERACTIVE = [
  'a',
  'button',
  'input',
  'textarea',
  'select',
  'label',
  'summary',
  '[role="button"]',
  '[data-glass]',
].join(',');

/** True if the point is over actual letters (not just inside a text element's box). */
function isOverText(el: Element, x: number, y: number): boolean {
  const range = document.createRange();
  for (const node of el.childNodes) {
    if (node.nodeType !== Node.TEXT_NODE || !node.textContent?.trim()) continue;
    range.selectNodeContents(node);
    for (const r of range.getClientRects()) {
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return true;
    }
  }
  return false;
}

/** Stable pseudo-random number in [0, 1) for a lattice joint, so the pattern never shimmers. */
function hash(i: number, j: number, salt: number): number {
  let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(salt, 2246822519)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

const ROW_H = CELL_H / 2;
/** Resting position of joint (i, j), in page coordinates. */
const jointX = (i: number, j: number) => i * CELL_W + (j & 1 ? CELL_W / 2 : 0) + (hash(i, j, 1) - 0.5) * CELL_W * JITTER_X;
const jointY = (i: number, j: number) => j * ROW_H + (hash(i, j, 2) - 0.5) * ROW_H * 2 * JITTER_Y;
/** Whether the lead line from joint (i, j) down-left / down-right exists. */
const hasLeft = (i: number, j: number) => hash(i, j, 3) > MISSING;
const hasRight = (i: number, j: number) => hash(i, j, 4) > MISSING;

interface Ripple {
  x: number; // page coordinates, so a splash stays put while you scroll
  y: number;
  start: number;
  maxR: number;
  color: string;
  spin: number;
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const rgba = (hex: string, a: number) => {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a.toFixed(3)})`;
};

export function initRipples() {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const canvas = document.createElement('canvas');
  canvas.className = 'ripples';
  canvas.setAttribute('aria-hidden', 'true');
  const beam = document.querySelector('.beam');
  if (beam) beam.after(canvas);
  else document.body.prepend(canvas);

  const waveCanvas = document.createElement('canvas');
  waveCanvas.className = 'ripples';
  waveCanvas.setAttribute('aria-hidden', 'true');
  canvas.after(waveCanvas);

  const maybeCtx = canvas.getContext('2d');
  const maybeWctx = waveCanvas.getContext('2d');
  if (!maybeCtx || !maybeWctx) return;
  const ctx: CanvasRenderingContext2D = maybeCtx;
  const wctx: CanvasRenderingContext2D = maybeWctx;
  let lastSy = NaN; // scroll position the bottom canvas was last drawn at

  // Offscreen image of the resting lattice, covering [cacheTop, cacheTop + cacheH) of the page.
  const cache = document.createElement('canvas');
  const cctx = cache.getContext('2d');
  if (!cctx) return;
  let cacheTop = 0;
  let cacheH = 0;
  let cacheValid = false;

  let dpr = 1;
  let vw = 0;
  let vh = 0;
  const ripples: Ripple[] = [];
  let wavesDrawn = false; // whether the top canvas has anything on it to clear
  let frame = 0;

  function requestDraw() {
    if (!frame) frame = requestAnimationFrame(draw);
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    vw = window.innerWidth;
    vh = window.innerHeight;
    canvas.width = waveCanvas.width = Math.round(vw * dpr);
    canvas.height = waveCanvas.height = Math.round(vh * dpr);
    cacheValid = false;
    lastSy = NaN;
    requestDraw();
  }

  /** Draw the resting lattice for one screen above to one screen below the viewport. */
  function buildCache(sy: number) {
    cacheTop = Math.floor(sy - vh);
    cacheH = vh * 3;
    cache.width = canvas.width;
    cache.height = Math.round(cacheH * dpr);
    cctx!.setTransform(dpr, 0, 0, dpr, 0, -cacheTop * dpr);
    cctx!.clearRect(0, cacheTop, vw, cacheH);

    const j0 = Math.floor(cacheTop / ROW_H) - 2;
    const j1 = Math.ceil((cacheTop + cacheH) / ROW_H) + 2;
    const i0 = -2;
    const i1 = Math.ceil(vw / CELL_W) + 2;
    const lines = new Path2D();
    const dots = new Path2D();
    for (let j = j0; j <= j1; j++) {
      const odd = j & 1;
      for (let i = i0; i <= i1; i++) {
        const x = jointX(i, j);
        const y = jointY(i, j);
        if (hasLeft(i, j)) {
          lines.moveTo(x, y);
          lines.lineTo(jointX(i - 1 + odd, j + 1), jointY(i - 1 + odd, j + 1));
        }
        if (hasRight(i, j)) {
          lines.moveTo(x, y);
          lines.lineTo(jointX(i + odd, j + 1), jointY(i + odd, j + 1));
        }
        if (hash(i, j, 6) < DOT_SHARE) dots.rect(x - 0.75, y - 0.75, 1.5, 1.5);
      }
    }
    cctx!.lineWidth = 1;
    cctx!.strokeStyle = BASE_LINE;
    cctx!.stroke(lines);
    cctx!.fillStyle = BASE_DOT;
    cctx!.fill(dots);
    cacheValid = true;
  }

  function draw(now: number) {
    frame = 0;
    const sy = window.scrollY;

    // 1. Resting lattice: copy the cached image, but only when the page has scrolled.
    if (!cacheValid || sy < cacheTop || sy + vh > cacheTop + cacheH) {
      buildCache(sy);
      lastSy = NaN;
    }
    if (sy !== lastSy) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const srcY = Math.round((sy - cacheTop) * dpr);
      ctx.drawImage(cache, 0, srcY, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
      lastSy = sy;
    }

    // 2. Splashes.
    for (let i = ripples.length - 1; i >= 0; i--) {
      if ((now - ripples[i].start) / 1000 > LIFETIME) ripples.splice(i, 1);
    }
    if (!ripples.length && !wavesDrawn) return;

    wctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    wctx.globalCompositeOperation = 'source-over';
    wctx.clearRect(0, 0, vw, vh);
    wavesDrawn = ripples.length > 0;
    if (!wavesDrawn) return;
    wctx.globalCompositeOperation = 'lighter';

    for (const rp of ripples) {
      const age = Math.max(0, (now - rp.start) / 1000);
      const cx = rp.x;
      const cy = rp.y - sy;

      // Soft glow where the stone landed.
      const g = Math.min(1, age / DURATION);
      const glowR = 30 + 90 * easeOut(g);
      const glow = wctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
      glow.addColorStop(0, rgba(GOLD, 0.22 * (1 - g)));
      glow.addColorStop(1, rgba(GOLD, 0));
      wctx.fillStyle = glow;
      wctx.beginPath();
      wctx.arc(cx, cy, glowR, 0, Math.PI * 2);
      wctx.fill();

      // Concentric rings, each one a little later and fainter.
      for (let k = 0; k < RINGS; k++) {
        const t = (age - k * RING_GAP) / DURATION;
        if (t <= 0 || t >= 1) continue;
        const r = rp.maxR * easeOut(t) * (1 - k * 0.12);
        const fade = Math.pow(1 - t, 1.6);
        const color = k === 1 ? GOLD : rp.color;

        wctx.lineWidth = (k === 0 ? 1.6 : 1.1) * (1 - t * 0.5);
        wctx.strokeStyle = rgba(color, (k === 0 ? 0.75 : 0.45) * fade);
        wctx.beginPath();
        wctx.arc(cx, cy, r, 0, Math.PI * 2);
        wctx.stroke();

        // The first wave carries a ring of foils, like the rim of a rose window.
        if (k === 0) {
          const fr = r * 0.86;
          const size = 1.2 + 2.6 * (1 - t);
          const alpha = 0.8 * Math.pow(1 - t, 2);
          for (const c of [rp.color, GOLD]) {
            wctx.fillStyle = rgba(c, alpha);
            wctx.beginPath();
            for (let f = c === GOLD ? 1 : 0; f < FOILS; f += 2) {
              const a = rp.spin + t * 0.35 + (f / FOILS) * Math.PI * 2;
              const fx = cx + Math.cos(a) * fr;
              const fy = cy + Math.sin(a) * fr;
              wctx.moveTo(fx + size, fy);
              wctx.arc(fx, fy, size, 0, Math.PI * 2);
            }
            wctx.fill();
          }
        }
      }
    }

    requestDraw();
  }

  window.addEventListener('resize', resize);
  window.addEventListener('scroll', requestDraw, { passive: true });
  resize();

  if (reduceMotion) return; // keep the still lattice, skip the splashes

  document.addEventListener('click', (e) => {
    if (e.button !== 0) return;
    const target = e.target as Element | null;
    if (!target || target.closest(INTERACTIVE)) return;
    // Leave clicks on words alone so selecting text still feels normal.
    if (isOverText(target, e.clientX, e.clientY)) return;
    if (window.getSelection()?.toString()) return;

    if (ripples.length >= MAX_RIPPLES) ripples.shift();
    ripples.push({
      x: e.clientX,
      y: e.clientY + window.scrollY,
      start: performance.now(),
      maxR: 200 + Math.random() * 80,
      color: JEWELS[Math.floor(Math.random() * JEWELS.length)],
      spin: Math.random() * Math.PI * 2,
    });
    requestDraw();
  });
}
