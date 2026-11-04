// A faint, irregular leaded-glass lattice lies behind the whole site.
// Clicking blank space drops a stone in it: an uneven wave travels outward through
// the lattice, lifting the lead lines a few pixels and lighting them in a jewel tone,
// then the surface settles back.
//
// Performance: two canvases. The resting lattice is drawn once into an offscreen image
// covering a few screens of the page and copied onto the bottom canvas only when you
// scroll. Waves draw on a transparent top canvas, and each frame only clears and redraws
// the box around the live ripples, so a splash touches as few pixels as possible.

const JEWELS = ['#e0475e', '#4a8ae6', '#3fc490', '#a87fe0', '#e6b85c'];
const GOLD = '#e6b85c';

/* ── Tuning ─────────────────────────────────────────────────── */
const CELL_W = 46; // average width of one pane
const CELL_H = 62; // average height of one pane
const JITTER_X = 0.6; // how far joints wander sideways (fraction of CELL_W)
const JITTER_Y = 0.4; // how far joints wander up/down (fraction of a row)
const MISSING = 0.16; // share of lead lines left out, so some panes merge
const BASE_LINE = 'rgba(243,237,226,0.05)'; // resting lead lines
const BASE_DOT = 'rgba(212,162,76,0.14)'; // resting joints
const DOT_SHARE = 0.4; // share of joints that show a dot at rest
const REACH = 640; // px a splash spreads before it dies out
const DURATION = 4.5; // seconds a single ring takes to spread and fade
const FADE_IN = 0.35; // seconds each ring takes to rise, so nothing pops on
const BANDS = [
  { delay: 0, strength: 1 },
  { delay: 0.45, strength: 0.55 },
  { delay: 0.9, strength: 0.28 },
]; // a ripple train: each ring follows the last, softer, like water
const WOBBLE = 0.12; // how uneven the wavefront gets (0 = perfect circle)
const RAGGED = 8; // px of per-joint randomness in when the wave arrives
const LIFT = 4; // px the wave pushes the lattice outward
const MAX_RIPPLES = 10;
const LEVELS = 40; // brightness steps for batching; fine enough to look continuous

/** Water slows as it spreads: fast at first, gliding to a stop. */
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const smooth = (t: number) => t * t * (3 - 2 * t);
const LAST_BAND = BANDS[BANDS.length - 1].delay;

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
  color: number; // index into JEWELS
  phase: [number, number, number]; // shape of this splash's uneven front
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Precomputed styles for each brightness step, so no strings are built per frame.
const levelK = (l: number) => (l + 0.5) / LEVELS;
const LINE_STYLES = JEWELS.map((hex) => {
  const [r, g, b] = hexToRgb(hex);
  return Array.from({ length: LEVELS }, (_, l) => `rgba(${r},${g},${b},${(0.7 * levelK(l)).toFixed(3)})`);
});
const [GR, GG, GB] = hexToRgb(GOLD);
const DOT_STYLES = Array.from({ length: LEVELS }, (_, l) => `rgba(${GR},${GG},${GB},${(0.9 * levelK(l)).toFixed(3)})`);

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
  let prevBox: [number, number, number, number] | null = null; // device-px area the waves last drew in

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
  let frame = 0;

  // Scratch buffers for the joints near the viewport, reused every frame.
  let px = new Float32Array(0);
  let py = new Float32Array(0);
  let pk = new Float32Array(0); // how strongly a wave is touching each joint (0–1)
  let pc = new Int8Array(0); // colour of the wave touching it most (-1 = none)

  function requestDraw() {
    if (!frame) frame = requestAnimationFrame(draw);
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    vw = window.innerWidth;
    vh = window.innerHeight;
    canvas.width = waveCanvas.width = Math.round(vw * dpr);
    canvas.height = waveCanvas.height = Math.round(vh * dpr);
    cacheValid = false;
    lastSy = NaN;
    prevBox = null;
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

    // 2. Waves: wipe only what was drawn last frame.
    wctx.setTransform(1, 0, 0, 1, 0, 0);
    wctx.globalCompositeOperation = 'source-over';
    if (prevBox) wctx.clearRect(...prevBox);
    prevBox = null;

    for (let r = ripples.length - 1; r >= 0; r--) {
      if ((now - ripples[r].start) / 1000 > DURATION + LAST_BAND + 0.1) ripples.splice(r, 1);
    }
    if (!ripples.length) return;

    wctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const waves = ripples.map((rp) => {
      const age = (now - rp.start) / 1000;
      const grow = Math.min(1, age / DURATION);
      return {
        cx: rp.x,
        cy: rp.y - sy,
        color: rp.color,
        phase: rp.phase,
        wobble: WOBBLE * (0.25 + 0.75 * grow), // starts nearly round, gets more uneven as it spreads
        bands: BANDS.map((b) => {
          const local = age - b.delay;
          const t = local / DURATION;
          const clamped = Math.min(Math.max(t, 0), 1);
          // Rise gently, then fade out smoothly as the ring loses energy.
          const rise = smooth(Math.min(1, Math.max(0, local / FADE_IN)));
          const fall = Math.pow(1 - smooth(clamped), 1.3);
          return {
            on: t > 0 && t < 1,
            radius: 6 + REACH * easeOut(clamped),
            width: 26 + 46 * clamped,
            amp: b.strength * rise * fall,
          };
        }),
      };
    });

    // The box (viewport px) that contains every live ring and glow.
    let bx0 = Infinity;
    let by0 = Infinity;
    let bx1 = -Infinity;
    let by1 = -Infinity;
    for (const wave of waves) {
      let reach = 110; // the landing glow
      for (const band of wave.bands) {
        if (band.on) reach = Math.max(reach, band.radius * (1 + wave.wobble) + band.width * 3);
      }
      reach += RAGGED + LIFT + 6;
      bx0 = Math.min(bx0, wave.cx - reach);
      by0 = Math.min(by0, wave.cy - reach);
      bx1 = Math.max(bx1, wave.cx + reach);
      by1 = Math.max(by1, wave.cy + reach);
    }
    bx0 = Math.max(0, bx0);
    by0 = Math.max(0, by0);
    bx1 = Math.min(vw, bx1);
    by1 = Math.min(vh, by1);
    if (bx1 <= bx0 || by1 <= by0) {
      requestDraw(); // ripples scrolled out of view; keep time running
      return;
    }
    const x0 = Math.floor((bx0 - 2) * dpr);
    const y0 = Math.floor((by0 - 2) * dpr);
    prevBox = [x0, y0, Math.ceil((bx1 + 2) * dpr) - x0, Math.ceil((by1 + 2) * dpr) - y0];

    // Only joints inside the box are worked out.
    const i0 = Math.floor(bx0 / CELL_W) - 2;
    const j0 = Math.floor((sy + by0) / ROW_H) - 2;
    const j1 = Math.ceil((sy + by1) / ROW_H) + 2;
    const cols = Math.ceil(bx1 / CELL_W) + 2 - i0 + 1;
    const rows = j1 - j0 + 1;
    const n = rows * cols;
    if (px.length < n) {
      px = new Float32Array(n);
      py = new Float32Array(n);
      pk = new Float32Array(n);
      pc = new Int8Array(n);
    }

    for (let row = 0; row < rows; row++) {
      const j = j0 + row;
      for (let col = 0; col < cols; col++) {
        const i = i0 + col;
        const idx = row * cols + col;
        let x = jointX(i, j);
        let y = jointY(i, j) - sy;
        let k = 0;
        let color = -1;
        let bestK = 0;
        const ragged = (hash(i, j, 5) - 0.5) * RAGGED;
        for (const wave of waves) {
          const dx = x - wave.cx;
          const dy = y - wave.cy;
          const d = Math.sqrt(dx * dx + dy * dy) || 1;
          let shape = -1; // the front's radius multiplier at this angle, computed only if needed
          for (const band of wave.bands) {
            if (!band.on) continue;
            // Cheap reject before doing any trig.
            if (Math.abs(d - band.radius) > band.radius * WOBBLE * 1.2 + band.width * 3 + RAGGED) continue;
            if (shape < 0) {
              const a = Math.atan2(dy, dx);
              const [p1, p2, p3] = wave.phase;
              shape =
                1 +
                wave.wobble *
                  (0.55 * Math.sin(3 * a + p1) + 0.3 * Math.sin(5 * a + p2) + 0.25 * Math.sin(2 * a + p3));
            }
            const u = (d + ragged - band.radius * shape) / band.width;
            if (u < -3 || u > 3) continue;
            const touch = Math.exp(-u * u) * band.amp;
            // Crest pushes outward, trough pulls back in: reads as a real wave.
            const lift = LIFT * touch * Math.sin(-u * 1.6 + 0.6);
            x += (dx / d) * lift;
            y += (dy / d) * lift;
            k += touch;
            if (touch > bestK) {
              bestK = touch;
              color = wave.color;
            }
          }
        }
        px[idx] = x;
        py[idx] = y;
        pk[idx] = k > 1 ? 1 : k;
        pc[idx] = color;
      }
    }

    // 3. Draw only the lit lines and joints, batched by colour and brightness.
    const lit: (Path2D | undefined)[] = [];
    const segment = (a: number, b: number) => {
      const k = (pk[a] + pk[b]) / 2;
      if (k < 0.012) return;
      const c = pc[a] >= 0 ? pc[a] : pc[b];
      if (c < 0) return;
      const key = c * LEVELS + Math.min(LEVELS - 1, Math.floor(k * LEVELS));
      const path = lit[key] ?? (lit[key] = new Path2D());
      path.moveTo(px[a], py[a]);
      path.lineTo(px[b], py[b]);
    };
    for (let row = 0; row < rows - 1; row++) {
      const j = j0 + row;
      const odd = j & 1;
      for (let col = 0; col < cols; col++) {
        const i = i0 + col;
        const a = row * cols + col;
        const left = col - 1 + odd;
        const right = col + odd;
        if (left >= 0 && hasLeft(i, j)) segment(a, (row + 1) * cols + left);
        if (right < cols && hasRight(i, j)) segment(a, (row + 1) * cols + right);
      }
    }

    const litDots: (Path2D | undefined)[] = [];
    for (let idx = 0; idx < n; idx++) {
      const k = pk[idx];
      if (k < 0.03) continue;
      const l = Math.min(LEVELS - 1, Math.floor(k * LEVELS));
      const s = 1.2 + 1.4 * k;
      const path = litDots[l] ?? (litDots[l] = new Path2D());
      path.rect(px[idx] - s / 2, py[idx] - s / 2, s, s);
    }

    wctx.globalCompositeOperation = 'lighter';
    lit.forEach((path, key) => {
      if (!path) return;
      const l = key % LEVELS;
      wctx.strokeStyle = LINE_STYLES[(key - l) / LEVELS][l];
      wctx.lineWidth = 1 + 0.8 * levelK(l);
      wctx.stroke(path);
    });
    litDots.forEach((path, l) => {
      if (!path) return;
      wctx.fillStyle = DOT_STYLES[l];
      wctx.fill(path);
    });

    // A soft glow where the stone landed.
    for (const rp of ripples) {
      const t = Math.min(1, (now - rp.start) / 1000 / (DURATION * 0.6));
      const cx = rp.x;
      const cy = rp.y - sy;
      const gr = 24 + 80 * easeOut(t);
      const glow = wctx.createRadialGradient(cx, cy, 0, cx, cy, gr);
      glow.addColorStop(0, `rgba(${GR},${GG},${GB},${(0.18 * (1 - smooth(t))).toFixed(3)})`);
      glow.addColorStop(1, `rgba(${GR},${GG},${GB},0)`);
      wctx.fillStyle = glow;
      wctx.fillRect(cx - gr, cy - gr, gr * 2, gr * 2);
    }

    requestDraw();
  }

  window.addEventListener('resize', resize);
  window.addEventListener('scroll', requestDraw, { passive: true });
  resize();

  if (reduceMotion) return; // keep the still lattice, skip the waves

  document.addEventListener('click', (e) => {
    if (e.button !== 0) return;
    const target = e.target as Element | null;
    if (!target || target.closest(INTERACTIVE)) return;
    // Leave clicks on words alone so selecting text still feels normal.
    if (isOverText(target, e.clientX, e.clientY)) return;
    if (window.getSelection()?.toString()) return;

    if (ripples.length >= MAX_RIPPLES) ripples.shift();
    const tau = Math.PI * 2;
    ripples.push({
      x: e.clientX,
      y: e.clientY + window.scrollY,
      start: performance.now(),
      color: Math.floor(Math.random() * JEWELS.length),
      phase: [Math.random() * tau, Math.random() * tau, Math.random() * tau],
    });
    requestDraw();
  });
}
