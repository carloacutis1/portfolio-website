// Lays out the lettering around the poker chip's band: each phrase is centred in its own
// arc, with even letter spacing throughout and a diamond centred in every gap. Used at
// build time with estimated widths, then again in the browser with measured ones.

export const RING_FONT = 9; // px, in the chip's -100…100 box
export const CAP_HEIGHT = 0.63; // Cormorant Garamond cap height, as a fraction of the font size
export const BAND_MID = 60.5; // radius halfway between the band's two gold rules
/** Baseline radius that puts the capitals in the middle of the band. */
export const TEXT_R = BAND_MID - (RING_FONT * CAP_HEIGHT) / 2;
const DIAMOND_W = 3.2;

const f = (n: number) => Math.round(n * 100) / 100;
const point = (r: number, deg: number) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return `${f(r * Math.cos(a))} ${f(r * Math.sin(a))}`;
};

export interface RingLayout {
  tracking: number; // letter-spacing, px
  path: string; // clockwise circle the text runs along
  offsets: number[]; // startOffset of each phrase's centre along the path
  diamonds: number[]; // angle of each diamond, degrees clockwise from the top
}

/**
 * @param widths natural (untracked) width of each phrase
 * @param counts number of characters in each phrase
 */
export function layoutRing(widths: number[], counts: number[], r = TEXT_R): RingLayout {
  const n = widths.length;
  const c = 2 * Math.PI * r;
  const natural = widths.reduce((a, b) => a + b, 0);
  const gaps = counts.reduce((a, b) => a + b - 1, 0);
  // Each gap is a diamond plus clear space either side of it that grows with the tracking,
  // so the words always read as separate phrases: gap = DIAMOND_W + 2 * (1.5 + 1.8 * tracking).
  const tracking = Math.max(0, (c - natural - n * (DIAMOND_W + 3)) / (gaps + n * 3.6));
  const gap = DIAMOND_W + 3 + 3.6 * tracking;

  // Walk the circle from the diamond just before the first phrase.
  const centres: number[] = [];
  const diamondOffsets: number[] = [0];
  let pos = gap / 2;
  widths.forEach((w, i) => {
    const visible = w + (counts[i] - 1) * tracking;
    centres.push(pos + visible / 2);
    pos += visible + gap;
    if (i < n - 1) diamondOffsets.push(pos - gap / 2);
  });

  // Turn the circle so the first phrase is centred at the top.
  const start = -(centres[0] / c) * 360;
  const toDeg = (offset: number) => start + (offset / c) * 360;
  return {
    tracking: f(tracking),
    path: `M${point(r, start)}A${f(r)} ${f(r)} 0 1 1 ${point(r, start + 180)}A${f(r)} ${f(r)} 0 1 1 ${point(r, start)}`,
    // text-anchor: middle also counts the tracking after the last letter, so shift by half of it.
    offsets: centres.map((x) => f(x + tracking / 2)),
    diamonds: diamondOffsets.map((x) => f(toDeg(x))),
  };
}

/** Rough width of a phrase before the font has been measured. */
export function estimateWidth(text: string, size = RING_FONT): number {
  let w = 0;
  for (const ch of text) w += ch === ' ' ? 0.25 : /[0-9]/.test(ch) ? 0.5 : /[MW]/.test(ch) ? 0.85 : 0.64;
  return w * size;
}
