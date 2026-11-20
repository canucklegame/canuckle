// Fireworks and maple leaves on a canvas, for a challenge trophy (the podium
// in views/challengeSheets.js). The canvas covers whatever it's placed in;
// coordinates are in its own CSS pixels.

import { LEAF } from './podium.js?v=202611200021';

const PALETTES = {
  1: ['#e4b53a', '#f7d76b', '#d52b1e', '#ffffff'],
  2: ['#dfe5ec', '#b9c1ca', '#ffffff', '#d52b1e'],
  3: ['#e6aa78', '#c98551', '#ffffff'],
};

/** Shows per place: how many bursts, how far apart (ms), and how big. */
export const SHOWS = {
  1: { bursts: 9, every: 260, size: 1 },
  2: { bursts: 4, every: 380, size: 0.8 },
  3: { bursts: 2, every: 500, size: 0.65 },
};

export function fireworks(canvas) {
  const ctx = canvas.getContext('2d');
  const leaf = typeof Path2D === 'function' ? new Path2D(LEAF) : null;
  let parts = [];
  let raf = 0;
  const timers = [];

  function size() {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function loop() {
    const r = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, r.width, r.height);
    parts = parts.filter((p) => p.life > 0);
    for (const p of parts) {
      p.vx *= p.drag;
      p.vy = p.vy * p.drag + p.g;
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 1;
      p.rot += p.spin;
      ctx.globalAlpha = Math.max(0, Math.min(1, (p.life / p.max) * 1.6));
      ctx.fillStyle = p.c;
      if (p.leaf && leaf) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.scale(p.s / 12, p.s / 12);
        ctx.translate(-12, -12);
        ctx.fill(leaf);
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    raf = parts.length ? requestAnimationFrame(loop) : 0;
  }
  const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };

  return {
    /** One burst at (x, y) in the place's colours, some of it maple leaves. */
    burst(x, y, place, scale = 1) {
      size();
      const cols = PALETTES[place] ?? PALETTES[1];
      const n = Math.round(70 * scale);
      for (let i = 0; i < n; i++) {
        const ang = (Math.PI * 2 * i) / n + Math.random() * 0.2;
        const sp = (2.2 + Math.random() * 3.6) * scale + 0.6;
        parts.push({
          x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, g: 0.06, drag: 0.975, life: 70 + Math.random() * 30, max: 100,
          s: 1.6 + Math.random() * 1.8, c: cols[i % cols.length], leaf: Math.random() < 0.12 * scale,
          rot: Math.random() * 6, spin: (Math.random() - 0.5) * 0.2,
        });
      }
      kick();
    },
    /** Maple leaves streaming up from origin() for [ms]. */
    fountain(origin, ms) {
      const end = performance.now() + ms;
      const tick = () => {
        if (performance.now() > end) return;
        const o = origin();
        for (let i = 0; i < 3; i++) {
          parts.push({
            x: o.x + (Math.random() - 0.5) * 40, y: o.y - 40, vx: (Math.random() - 0.5) * 3, vy: -3 - Math.random() * 3,
            g: 0.09, drag: 0.985, life: 80, max: 80, s: 9 + Math.random() * 6,
            c: Math.random() < 0.7 ? '#d52b1e' : '#e4b53a', leaf: true, rot: Math.random() * 6, spin: (Math.random() - 0.5) * 0.15,
          });
        }
        kick();
        timers.push(setTimeout(tick, 60));
      };
      size();
      tick();
    },
    stop() {
      timers.forEach(clearTimeout);
      timers.length = 0;
      parts = [];
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      const r = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, r.width, r.height);
    },
  };
}
