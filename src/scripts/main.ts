import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { initRipples } from './ripple';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ── Smooth scroll ─────────────────────────────────────────── */
if (!reduceMotion) {
  const lenis = new Lenis({
    lerp: 0.085,
    anchors: { offset: -40 },
    autoRaf: true,
  });
  // Expose for debugging in devtools.
  (window as unknown as { lenis: Lenis }).lenis = lenis;
}

/* ── Reveal on scroll ──────────────────────────────────────── */
const revealables = document.querySelectorAll<HTMLElement>('[data-reveal]');
if (reduceMotion || !('IntersectionObserver' in window)) {
  revealables.forEach((el) => el.classList.add('is-visible'));
} else {
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
  );
  revealables.forEach((el) => io.observe(el));
}

/* ── Candle glow follows the pointer over glass ────────────── */
document.querySelectorAll<HTMLElement>('[data-glass]').forEach((el) => {
  el.addEventListener('pointermove', (e) => {
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
    el.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`);
  });
});

/* ── Light beam: hue drifts through the jewel tones as you scroll ──
   Cross-fades five pre-blurred shafts (ruby → sapphire → emerald → amber → amethyst)
   and slides them with transforms only, so scrolling never forces a repaint. */
const shafts = [...document.querySelectorAll<HTMLElement>('[data-shaft]')].map((el) => ({
  el,
  thin: el.dataset.shaft === 'thin',
  layers: [...el.children] as HTMLElement[],
}));
const root = document.documentElement;
let ticking = false;
const updateBeam = () => {
  ticking = false;
  const max = root.scrollHeight - window.innerHeight;
  const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
  for (const s of shafts) {
    const n = s.layers.length;
    // The thin shaft runs one colour ahead of the main one.
    const t = p * (n - 1) + (s.thin ? 1 : 0);
    const peak = s.thin ? 0.12 : 0.2;
    s.layers.forEach((layer, i) => {
      // Distance between this colour and the current position, on a loop of n colours.
      const raw = Math.abs(t - i) % n;
      const d = Math.min(raw, n - raw);
      const w = Math.max(0, 1 - d);
      layer.style.opacity = (w * peak).toFixed(3);
      // Fully faded layers are hidden so the browser doesn't composite them every frame.
      layer.style.visibility = w > 0 ? 'visible' : 'hidden';
    });
    const shift = s.thin ? p * 12 : p * -18;
    s.el.style.transform = `translateX(${shift.toFixed(2)}vw) rotate(24deg)`;
  }
};
updateBeam();
if (!reduceMotion) {
  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(updateBeam);
      }
    },
    { passive: true },
  );
}

/* ── Nav: solidify after leaving the hero ──────────────────── */
const nav = document.querySelector<HTMLElement>('[data-nav]');
if (nav) {
  const setNav = () => nav.classList.toggle('is-scrolled', window.scrollY > 40);
  setNav();
  window.addEventListener('scroll', setNav, { passive: true });
}

/* ── Ripples on click ──────────────────────────────────────── */
initRipples();
