// MindBlown home page: a slow, procedural brain in the background.
// Lobes are loose clusters, neurons drift inside them, a few neurons carry
// orbiting synapses. Pure canvas, no data, no dependencies.
(function () {
  'use strict';
  // Stable Projects address: the old public index is the Projects brain.
  // After the homepage rollout, the same cross-site hash reaches its new route.
  if (location.hash === '#projects') {
    location.replace(new URL('projects.html', location.href).href);
    return;
  }
  const canvas = document.getElementById('bg');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const LOBES = ['#4fd1c5', '#60a5fa', '#c084fc', '#ff8a3d', '#f472b6', '#34d399', '#fde68a'];

  let W = 0, H = 0, dpr = 1, nodes = [], links = [], t0 = performance.now(), raf = 0;
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

  function build() {
    nodes = []; links = []; seed = 7;
    const n = Math.max(24, Math.min(90, Math.round((W * H) / 24000)));
    const centres = LOBES.map((c, i) => {
      const a = (i / LOBES.length) * Math.PI * 2 + 0.4;
      return { x: W * 0.5 + Math.cos(a) * W * 0.3, y: H * 0.48 + Math.sin(a) * H * 0.32, c };
    });
    for (let i = 0; i < n; i++) {
      const L = centres[i % centres.length];
      const r = Math.sqrt(rnd()) * Math.min(W, H) * 0.19, a = rnd() * Math.PI * 2;
      nodes.push({
        x: L.x + Math.cos(a) * r, y: L.y + Math.sin(a) * r, c: L.c,
        r: 1.4 + rnd() * 2.6, ph: rnd() * Math.PI * 2, sp: 0.00012 + rnd() * 0.00018, amp: 6 + rnd() * 16,
        syn: rnd() < 0.22 ? 3 + Math.floor(rnd() * 5) : 0, orb: 10 + rnd() * 12, os: 0.0004 + rnd() * 0.0005
      });
    }
    nodes.forEach((a, i) => {
      let best = [];
      nodes.forEach((b, j) => { if (i === j) return; const d = Math.hypot(a.x - b.x, a.y - b.y); best.push([d, j]); });
      best.sort((p, q) => p[0] - q[0]).slice(0, 2).forEach(([d, j]) => { if (d < Math.min(W, H) * 0.22 && j > i) links.push([i, j]); });
      if (rnd() < 0.12) { const j = Math.floor(rnd() * nodes.length); if (j !== i) links.push([i, j]); }
    });
  }

  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    build();
    if (reduce) draw(t0);
  }

  function pos(nd, t) {
    return { x: nd.x + Math.cos(t * nd.sp + nd.ph) * nd.amp, y: nd.y + Math.sin(t * nd.sp * 1.3 + nd.ph) * nd.amp };
  }

  function draw(now) {
    const t = now - t0;
    const fade = Math.max(0.25, 1 - window.scrollY / (H * 1.2));
    ctx.clearRect(0, 0, W, H);
    ctx.globalAlpha = fade;
    const P = nodes.map(nd => pos(nd, t));
    ctx.lineWidth = 1;
    links.forEach(([i, j]) => {
      const a = P[i], b = P[j];
      const g = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
      g.addColorStop(0, hexA(nodes[i].c, 0.16)); g.addColorStop(1, hexA(nodes[j].c, 0.16));
      ctx.strokeStyle = g; ctx.beginPath(); ctx.moveTo(a.x, a.y);
      const mx = (a.x + b.x) / 2 + (a.y - b.y) * 0.12, my = (a.y + b.y) / 2 + (b.x - a.x) * 0.12;
      ctx.quadraticCurveTo(mx, my, b.x, b.y); ctx.stroke();
    });
    nodes.forEach((nd, i) => {
      const p = P[i];
      ctx.fillStyle = hexA(nd.c, 0.1); ctx.beginPath(); ctx.arc(p.x, p.y, nd.r * 3.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = hexA(nd.c, 0.7); ctx.beginPath(); ctx.arc(p.x, p.y, nd.r, 0, Math.PI * 2); ctx.fill();
      for (let k = 0; k < nd.syn; k++) {
        const a = t * nd.os + (k / nd.syn) * Math.PI * 2 + nd.ph;
        const sx = p.x + Math.cos(a) * nd.orb, sy = p.y + Math.sin(a) * nd.orb * 0.7;
        ctx.fillStyle = hexA(nd.c, 0.55); ctx.beginPath(); ctx.arc(sx, sy, 0.9, 0, Math.PI * 2); ctx.fill();
      }
    });
    ctx.globalAlpha = 1;
  }

  function hexA(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }

  function loop(now) { draw(now); raf = requestAnimationFrame(loop); }
  function start() { if (reduce || raf) return; raf = requestAnimationFrame(loop); }
  function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; }

  let rs = 0;
  window.addEventListener('resize', () => { clearTimeout(rs); rs = setTimeout(resize, 120); });
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  resize();
  start();
})();
