// Procedural stained-glass generation. Deterministic: same seed → same window.

export type Hue = 'ruby' | 'sapphire' | 'emerald' | 'amber' | 'amethyst';

export const HUES: Hue[] = ['ruby', 'sapphire', 'emerald', 'amber', 'amethyst'];

export const palettes: Record<Hue, string[]> = {
  ruby: ['#9b1b30', '#c42a44', '#6e0f22', '#e0475e', '#4a0a17'],
  sapphire: ['#1f4e9c', '#2f6fd0', '#143470', '#4a8ae6', '#0c2250'],
  emerald: ['#1d7a5a', '#27a578', '#125240', '#3fc490', '#0a3a2c'],
  amber: ['#d4a24c', '#e8bf6a', '#a8772a', '#f2d48e', '#7a5418'],
  amethyst: ['#6b3fa0', '#8a5cc4', '#4a2875', '#a87fe0', '#2e1650'],
};

/** The bright tone of each hue, used for halos and glows. */
export const glowColor: Record<Hue, string> = {
  ruby: '#e0475e',
  sapphire: '#4a8ae6',
  emerald: '#3fc490',
  amber: '#f2d48e',
  amethyst: '#a87fe0',
};

export const GOLD = '#e6b85c';
export const LEAD = '#0d0b10';

/** Pointed (drop) arch window, in a 100 × 120 box. */
export const LANCET_PATH = 'M0 120V67A70 70 0 0 1 50 0A70 70 0 0 1 100 67V120Z';

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Piece {
  d: string;
  fill: string;
  opacity: number;
}

const f = (n: number) => Math.round(n * 100) / 100;

function pickColor(rand: () => number, hue: Hue): string {
  const r = rand();
  if (r < 0.05) return GOLD;
  if (r < 0.13) {
    const others = HUES.filter((h) => h !== hue);
    const other = others[Math.floor(rand() * others.length)];
    return palettes[other][Math.floor(rand() * 3)];
  }
  const p = palettes[hue];
  return p[Math.floor(rand() * p.length)];
}

/** A lancet window: jittered triangulated glass + a small rondel in the arch head. */
export function lancet(seed: string, hue: Hue) {
  const rand = mulberry32(hashString(seed));
  const cols = 4;
  const rows = 6;
  const cw = 100 / cols;
  const rh = 120 / rows;

  // Grid of points; interior points jitter freely, edge points only along their edge.
  const pts: [number, number][][] = [];
  for (let j = 0; j <= rows; j++) {
    const row: [number, number][] = [];
    for (let i = 0; i <= cols; i++) {
      const edgeX = i === 0 || i === cols;
      const edgeY = j === 0 || j === rows;
      const jx = edgeX ? 0 : (rand() - 0.5) * cw * 0.7;
      const jy = edgeY ? 0 : (rand() - 0.5) * rh * 0.7;
      row.push([i * cw + jx, j * rh + jy]);
    }
    pts.push(row);
  }

  const shards: Piece[] = [];
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const a = pts[j][i];
      const b = pts[j][i + 1];
      const c = pts[j + 1][i + 1];
      const d = pts[j + 1][i];
      const tris = rand() < 0.5 ? [[a, b, c], [a, c, d]] : [[a, b, d], [b, c, d]];
      for (const t of tris) {
        shards.push({
          d: `M${t.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}Z`,
          fill: pickColor(rand, hue),
          opacity: f(0.82 + rand() * 0.18),
        });
      }
    }
  }

  // Rondel: an 8-petal rosette in the arch head.
  const cx = 50;
  const cy = 40;
  const r = 15;
  const pal = palettes[hue];
  const offset = rand() * Math.PI;
  const rondel: Piece[] = [];
  for (let k = 0; k < 8; k++) {
    const a1 = offset + (k / 8) * Math.PI * 2;
    const a2 = offset + ((k + 1) / 8) * Math.PI * 2;
    rondel.push({
      d: `M${cx} ${cy}L${f(cx + r * Math.cos(a1))} ${f(cy + r * Math.sin(a1))}A${r} ${r} 0 0 1 ${f(cx + r * Math.cos(a2))} ${f(cy + r * Math.sin(a2))}Z`,
      fill: k % 2 ? pal[1] : pal[3],
      opacity: 0.95,
    });
  }

  return { shards, rondel, cx, cy, r };
}
