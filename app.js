/* MindBlown — explode the Brain into lobes, neurons and synapses. */
(() => {
  const D = window.MINDBLOWN;
  if (D.demo) { const sub = document.querySelector('.brand .sub'); if (sub) sub.textContent = 'demo brain · fictional data'; document.title = 'MindBlown — demo brain'; }
  if (D.subtitle) { const sub = document.querySelector('.brand .sub'); if (sub) sub.textContent = D.subtitle; }
  if (D.title) { document.title = D.title; const h = document.querySelector('.brand .title'); if (h) h.textContent = D.title; }
  const canvas = document.getElementById('brain');
  const ctx = canvas.getContext('2d');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- model ----------
  const lobes = D.lobes;
  const lobeById = Object.fromEntries(lobes.map(l => [l.id, l]));
  const lobeOn = Object.fromEntries(lobes.map(l => [l.id, !l.hidden]));

  const pageById = {};
  const pages = D.pages.map(p0 => { const p = { ...p0, parentId: p0.parent || null }; delete p.parent;
    const n = { ...p, kind: 'page', nSyn: p.synapses.length, deg: 0, r: 0, neighbors: [], synNodes: [], srcNodes: [], children: [], parent: null, isCenter: p.id === D.center };
    pageById[p.id] = n; return n;
  });
  // one level deeper: a page may name a parent neuron; it then orbits that neuron as a sub-neuron
  // only one level is allowed: a parent must itself be top-level, so chains and cycles collapse to a single hop
  pages.forEach(n => { const p = n.parentId && pageById[n.parentId]; if (p && p !== n && !p.parentId) { n.parent = p; p.children.push(n); } });
  const isChild = n => n.kind === 'page' && !!n.parent;
  const hasSubs = pages.some(isChild);
  const synById = {};
  const syns = D.synapses.map((s, i) => {
    const n = { ...s, kind: 'syn', idx: i, lobe: pageById[s.page].lobe, ordinal: pageById[s.page].synNodes.length };
    synById[s.id] = n; pageById[s.page].synNodes.push(n); return n;
  });
  const srcById = {};
  const srcs = D.sources.map(s => {
    const n = { ...s, kindOf: s.kind, kind: 'src', lobe: pageById[s.pages[0]].lobe, pageNodes: s.pages.map(p => pageById[p]) };
    srcById[s.id] = n; n.pageNodes.forEach(p => p.srcNodes.push(n)); return n;
  });

  const pageLinks = D.links.map(l => ({ source: pageById[l.s], target: pageById[l.t], w: l.w, kinds: l.kinds, notes: l.notes, kind: 'pp' }));
  pageLinks.forEach(l => {
    l.source.deg += l.w; l.target.deg += l.w;
    l.source.neighbors.push({ n: l.target, l }); l.target.neighbors.push({ n: l.source, l });
  });
  const synTethers = syns.map(s => ({ source: s, target: pageById[s.page], kind: 'st' }));
  const synCross = D.synLinks.map(l => ({ source: synById[l.s], target: pageById[l.t], kind: 'sx' }));
  const srcTethers = [];
  srcs.forEach(s => s.pageNodes.forEach(p => srcTethers.push({ source: s, target: p, kind: 'sr' })));
  const cociteLinks = D.cocite.map(l => ({ source: pageById[l.s], target: pageById[l.t], w: l.w, kind: 'cc' }));
  const childTethers = pages.filter(isChild).map(c => ({ source: c, target: c.parent, kind: 'pc' }));
  pages.forEach(p => { p.r = p.isCenter ? 16 : isChild(p) ? 3.6 + Math.sqrt(p.nSyn) * 0.9 : 5.5 + Math.sqrt(p.nSyn) * 1.25 + Math.min(p.deg, 12) * 0.25; p.spin = Math.random() * Math.PI * 2; });
  pages.forEach(p => { if (p.children.length) p.r += Math.min(p.children.length, 6) * 0.6; });
  const orbitR = p => 16 + p.nSyn * 1.7;
  // radius of the ring a parent's sub-neurons sit on once unfolded
  const childRingR = p => p.r + 42 + Math.sqrt(p.children.length) * 16 + explodeF * (orbitR(p) * 0.6);

  // lobe anchors on a ring; the centre page sits in the middle
  const ring = lobes.filter(l => l.id !== 'self').map(l => l.id);
  const R = 760;
  const anchor = { self: { x: 0, y: 0 } };
  const lobeCount = {}; pages.forEach(p => { lobeCount[p.lobe] = (lobeCount[p.lobe] || 0) + 1; });
  const span = ring.map(id => Math.sqrt(lobeCount[id] || 1) + 2.6), total = d3.sum(span);
  let acc = -Math.PI / 2 - (span[0] / total) * Math.PI;
  ring.forEach((id, i) => { const a = acc + (span[i] / total) * Math.PI; acc += (span[i] / total) * Math.PI * 2; anchor[id] = { x: Math.cos(a) * R, y: Math.sin(a) * R }; });
  pages.forEach(p => { if (isChild(p)) return; const a = anchor[p.lobe]; p.x = a.x + (Math.random() - 0.5) * 220; p.y = a.y + (Math.random() - 0.5) * 220; });
  pages.forEach(p => { if (!isChild(p)) return; p.x = p.parent.x + (Math.random() - 0.5) * 6; p.y = p.parent.y + (Math.random() - 0.5) * 6; });
  syns.forEach(s => { const p = pageById[s.page]; s.x = p.x + (Math.random() - 0.5) * 4; s.y = p.y + (Math.random() - 0.5) * 4; });
  srcs.forEach(s => { const p = s.pageNodes[0]; s.x = p.x + (Math.random() - 0.5) * 4; s.y = p.y + (Math.random() - 0.5) * 4; });

  // ---------- state ----------
  let k = 0.3, tx = 0, ty = 0;           // zoom transform
  let explodeF = 0, explodeTarget = 0;   // 0 collapsed → 1 exploded
  let depthF = 0, depthTarget = 0;       // 0 sub-neurons folded into parents → 1 unfolded
  let forceExplode = false, showCocite = false;
  let hover = null, selected = null, pulseSyn = null;
  let W = 0, H = 0, dpr = 1;
  let activeNodes = [], activeLinks = [];

  // a sub-neuron is shown only while both its own lobe and its parent's lobe are on
  const pageOn = p => lobeOn[p.lobe] && (!p.parent || lobeOn[p.parent.lobe]);
  const visible = n => n.kind === 'page' ? pageOn(n) : n.kind === 'syn' ? pageOn(pageById[n.page]) : n.pageNodes.some(pageOn);

  // ---------- simulation ----------
  const linkDist = l => {
    if (l.kind === 'pp') return (l.source.type === 'day' || l.target.type === 'day' ? 170 : l.source.lobe !== l.target.lobe ? 200 : 78 + 12 * (5 - Math.min(l.w, 4)) + 30) + explodeF * (orbitR(l.source) + orbitR(l.target)) * 0.7;
    if (l.kind === 'st') return 4 + explodeF * orbitR(l.target);
    if (l.kind === 'sx') return 110;
    if (l.kind === 'sr') return 12 + explodeF * (44 + (l.source.pageNodes.length > 1 ? 30 : 0));
    if (l.kind === 'pc') return 2 + depthF * (childRingR(l.target) + explodeF * orbitR(l.source) * 0.5);
    return 160;
  };
  const linkStrength = l => {
    if (l.kind === 'pp') return l.source.type === 'day' || l.target.type === 'day' ? 0.02 : l.source.lobe !== l.target.lobe ? 0.08 : 0.3;
    if (l.kind === 'st') return 0.15;
    if (l.kind === 'sx') return 0.03;
    if (l.kind === 'sr') return l.source.pageNodes.length > 1 ? 0.12 : 0.5;
    if (l.kind === 'pc') return 0.6;
    return 0.01;
  };
  const charge = n => n.isCenter ? -1200 : isChild(n) ? -(30 + n.nSyn * 3) * depthF - 1 : -200 - n.nSyn * 7 - n.children.length * 40;
  // pages repel only pages; synapses and sources are held by tethers + collision, so they orbit instead of being blasted away
  const pageCharge = d3.forceManyBody().strength(charge).theta(0.9).distanceMax(900);
  const chargeForce = Object.assign(a => pageCharge(a), { initialize: (nodes, rnd) => pageCharge.initialize(nodes.filter(n => n.kind === 'page'), rnd), strength: f => (pageCharge.strength(f), chargeForce) });
  const collideR = n => n.kind === 'page' ? n.r + 6 : n.kind === 'syn' ? 1 + 4 * explodeF : 1 + 3.5 * explodeF;
  // page-only collision keeps whole synapse clouds from overlapping once exploded
  const pageCollideR = n => isChild(n) ? depthF * (n.r + 6 + explodeF * (n.nSyn ? orbitR(n) + 8 : 0)) : n.r + 10 + explodeF * (n.nSyn ? orbitR(n) + 14 : 0) + depthF * (n.children.length ? 20 : 0);
  const pageCollide = d3.forceCollide().radius(pageCollideR).strength(0.7).iterations(2);
  const pageCollideForce = Object.assign(a => pageCollide(a), { initialize: (nodes, rnd) => pageCollide.initialize(nodes.filter(n => n.kind === 'page'), rnd), radius: f => (pageCollide.radius(f), pageCollideForce) });
  // orbit force: each synapse seeks an evenly spaced slot around its neuron (the dandelion explosion)
  function orbitForce(alpha) {
    const st = 0.3 * alpha;
    for (const n of activeNodes) {
      if (n.kind !== 'syn') continue;
      const p = pageById[n.page], m = p.nSyn;
      const a = p.spin + (n.ordinal / m) * Math.PI * 2;
      const rr = (orbitR(p) + (n.ordinal % 2 ? 7 : -5)) * explodeF + 2;
      n.vx += (p.x + Math.cos(a) * rr - n.x) * st; n.vy += (p.y + Math.sin(a) * rr - n.y) * st;
    }
  }

  function childOrbitForce(alpha) {
    const st = 0.25 * alpha * depthF;
    if (st <= 0) return;
    for (const n of activeNodes) {
      if (!isChild(n)) continue;
      const p = n.parent, m = p.children.length, i = p.children.indexOf(n);
      const a = p.spin + Math.PI / 2 + (i / m) * Math.PI * 2, rr = childRingR(p);
      n.vx += (p.x + Math.cos(a) * rr - n.x) * st; n.vy += (p.y + Math.sin(a) * rr - n.y) * st;
    }
  }
  const lobeSize = {}; pages.forEach(p => { if (!isChild(p)) lobeSize[p.lobe] = (lobeSize[p.lobe] || 0) + 1; });
  const anchorStrength = n => n.kind !== 'page' ? 0 : isChild(n) ? 0.02 : n.lobe === 'self' ? 0.6 : n.type === 'day' ? 0.5 : lobeSize[n.lobe] <= 4 ? 0.55 : lobeSize[n.lobe] <= 10 ? 0.4 : 0.22;
  const sim = d3.forceSimulation()
    .force('link', d3.forceLink().id(d => d.id).distance(linkDist).strength(linkStrength))
    .force('charge', chargeForce)
    .force('collide', d3.forceCollide().radius(collideR).iterations(2))
    .force('orbit', orbitForce)
    .force('childOrbit', childOrbitForce)
    .force('pageCollide', pageCollideForce)
    .force('x', d3.forceX(n => anchor[n.lobe]?.x ?? 0).strength(anchorStrength))
    .force('y', d3.forceY(n => anchor[n.lobe]?.y ?? 0).strength(anchorStrength))
    .alphaDecay(0.03).velocityDecay(0.35)
    .stop();

  function rebuild(warm) {
    const vp = pages.filter(visible);
    const vs = syns.filter(visible);
    const vr = srcs.filter(visible);
    activeNodes = [...vp, ...vs, ...vr];
    const on = new Set(activeNodes);
    activeLinks = [...pageLinks, ...childTethers, ...synTethers, ...synCross, ...srcTethers, ...(showCocite ? cociteLinks : [])]
      .filter(l => on.has(l.source) && on.has(l.target));
    sim.nodes(activeNodes);
    sim.force('link').links(activeLinks);
    if (warm) { sim.alpha(1); for (let i = 0; i < 260; i++) sim.tick(); }
    sim.alpha(warm ? 0.25 : 0.5).restart();
    updateStats();
  }
  // D3 caches per-node strengths/radii when an accessor is set, so re-set them whenever explodeF/depthF move
  function refreshForces() { sim.force('link').distance(linkDist); sim.force('charge').strength(charge); sim.force('collide').radius(collideR); sim.force('pageCollide').radius(pageCollideR); }

  // ---------- canvas ----------
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
  }
  window.addEventListener('resize', resize);
  resize();

  const zoom = d3.zoom().scaleExtent([0.14, 9]).on('zoom', ev => { k = ev.transform.k; tx = ev.transform.x; ty = ev.transform.y; updateLevel(); })
    .filter(ev => !ev.button);
  d3.select(canvas).call(zoom).on('dblclick.zoom', null);

  const toWorld = (sx, sy) => [(sx - tx) / k, (sy - ty) / k];
  const toScreen = (x, y) => [x * k + tx, y * k + ty];

  function fitAll(dur = 900) {
    const vp = pages.filter(p => visible(p) && !isChild(p));
    const xs = vp.map(p => p.x), ys = vp.map(p => p.y);
    const minX = Math.min(...xs) - 150, maxX = Math.max(...xs) + 150, minY = Math.min(...ys) - 170, maxY = Math.max(...ys) + 170;
    const kk = Math.min((W - 60) / (maxX - minX), (H - 200) / (maxY - minY)) * 0.96;
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    const t = d3.zoomIdentity.translate(W / 2 - cx * kk, H / 2 + 12 - cy * kk).scale(kk);
    d3.select(canvas).transition().duration(dur).ease(d3.easeCubicInOut).call(zoom.transform, t);
  }
  function zoomTo(n, kk, dur = 1100) {
    const mobile = window.innerWidth <= 900;
    const panelW = mobile ? 0 : 380;
    const cy = mobile ? H * 0.24 : H / 2;
    const t = d3.zoomIdentity.translate((W - panelW) / 2 - n.x * kk, cy - n.y * kk).scale(kk);
    d3.select(canvas).transition().duration(dur).ease(d3.easeCubicInOut).call(zoom.transform, t);
  }

  // ---------- colour helpers ----------
  const colorCache = {};
  function rgba(hex, a) {
    const key = hex + a; if (colorCache[key]) return colorCache[key];
    const c = d3.color(hex); c.opacity = a; return (colorCache[key] = c.formatRgb());
  }
  const lobeColor = n => lobeById[n.lobe]?.color || '#9aa';
  const clamp01 = v => Math.max(0, Math.min(1, v));

  // ---------- pulses (signals travelling along connections) ----------
  const pulses = [];
  function spawnPulse(l, fast) {
    if (!l || pulses.length > 60) return;
    pulses.push({ l, t: 0, speed: (fast ? 0.028 : 0.009) + Math.random() * 0.006, dir: Math.random() < 0.5 ? 1 : -1 });
  }
  let lastPulse = 0;

  // ---------- draw ----------
  function draw(now) {
    // explode tween
    const want = forceExplode || k >= 1.5 ? 1 : 0;
    if (want !== explodeTarget) { explodeTarget = want; }
    if (Math.abs(explodeF - explodeTarget) > 0.004) {
      explodeF += (explodeTarget - explodeF) * 0.12;
      refreshForces(); if (sim.alpha() < 0.2) sim.alpha(0.35).restart();
    } else if (explodeF !== explodeTarget) { explodeF = explodeTarget; refreshForces(); }
    const wantD = hasSubs && (forceExplode || k >= 0.85) ? 1 : 0;
    if (wantD !== depthTarget) depthTarget = wantD;
    if (Math.abs(depthF - depthTarget) > 0.004) {
      depthF += (depthTarget - depthF) * 0.1;
      refreshForces(); if (sim.alpha() < 0.2) sim.alpha(0.3).restart();
    } else if (depthF !== depthTarget) { depthF = depthTarget; refreshForces(); }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.translate(tx, ty); ctx.scale(k, k);

    const lobeVis = clamp01((1.05 - k) / 0.45);           // lobe halos, visible when zoomed out
    const synVis = forceExplode ? 1 : clamp01((k - 1.25) / 0.45); // synapses fade in
    const labelVis = clamp01((k - 0.62) / 0.4);
    const synLabelVisAll = clamp01((k - 3.4) / 0.6);
    const synLabelVisFocus = clamp01((k - 1.6) / 0.4);
    const srcLabelVis = clamp01((k - 3.2) / 0.8);
    const focus = selected || hover;
    const focusSet = focus ? focusNeighborhood(focus) : null;
    const dim = focusSet ? 0.18 : 1;
    const sw = (px) => px / k; // screen px → world units
    const nodeR = n => n.kind === 'page' ? n.r / Math.pow(k, 0.45) * (isChild(n) ? 0.35 + 0.65 * depthF : 1) : n.kind === 'syn' ? sw(3.2) : sw(2.4);
    const depthA = n => n.kind === 'page' ? (isChild(n) ? depthF : 1) : n.kind === 'syn' ? (isChild(pageById[n.page]) ? depthF : 1) : 1;
    const childLabelVis = clamp01((k - 1.05) / 0.4) * depthF;

    // viewport culling bounds (world)
    const [vx0, vy0] = toWorld(-80, -80), [vx1, vy1] = toWorld(W + 80, H + 80);
    const inView = (x, y) => x > vx0 && x < vx1 && y > vy0 && y < vy1;

    // lobe halos
    if (lobeVis > 0) {
      ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      lobes.forEach(l => {
        if (!lobeOn[l.id] || l.id === 'self') return;
        const ps = pages.filter(p => p.lobe === l.id);
        if (!ps.length) return;
        const cx = d3.mean(ps, p => p.x), cy = d3.mean(ps, p => p.y);
        const rr = Math.max(44, d3.quantile(ps.map(p => Math.hypot(p.x - cx, p.y - cy)).sort(d3.ascending), 0.92) + 48);
        const fs = Math.min(W / 22, 13 + Math.sqrt(ps.length) * 2.4);
        ctx.font = `600 ${sw(fs)}px 'Clash Display', 'Satoshi', sans-serif`;
        ctx.beginPath(); ctx.arc(cx, cy, rr, 0, Math.PI * 2);
        ctx.fillStyle = rgba(l.color, 0.05 * lobeVis); ctx.fill();
        ctx.lineWidth = sw(1); ctx.strokeStyle = rgba(l.color, 0.22 * lobeVis); ctx.stroke();
        // labels sit on the outward side of the ring so neighbouring lobes never stack their text
        const dl = Math.hypot(cx, cy) || 1, ux = dl > 1 ? cx / dl : 0, uy = dl > 1 ? cy / dl : -1;
        const ax = cx + ux * (rr + sw(14)), ay = cy + uy * (rr + sw(14)), lh = sw(fs + 6);
        ctx.textAlign = Math.abs(ux) < 0.35 ? 'center' : ux > 0 ? 'left' : 'right';
        ctx.textBaseline = 'middle';
        const top = uy < 0;
        ctx.fillStyle = rgba(l.color, 0.85 * lobeVis);
        ctx.fillText(l.name, ax, top ? ay - lh : ay);
        ctx.font = `500 ${sw(Math.min(W / 32, 12))}px 'Satoshi', sans-serif`;
        ctx.fillStyle = rgba('#a7b2cc', 0.8 * lobeVis);
        const subs = ps.filter(isChild).length;
        ctx.fillText(`${ps.length - subs} neurons${subs ? ` · ${subs} sub-neurons` : ''} · ${d3.sum(ps, p => p.nSyn)} synapses`, ax, top ? ay : ay + lh);
        ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      });
    }

    // co-citation threads
    if (showCocite) {
      ctx.lineWidth = sw(0.6);
      activeLinks.forEach(l => {
        if (l.kind !== 'cc') return;
        const a = focusSet ? (focusSet.has(l.source) && focusSet.has(l.target) ? 0.35 : 0.04) : 0.08 + Math.min(l.w, 4) * 0.03;
        ctx.strokeStyle = rgba('#c7d2ea', a);
        ctx.beginPath(); ctx.moveTo(l.source.x, l.source.y); ctx.lineTo(l.target.x, l.target.y); ctx.stroke();
      });
    }

    // parent → sub-neuron tethers
    if (depthF > 0.03) {
      activeLinks.forEach(l => {
        if (l.kind !== 'pc' || !inView(l.target.x, l.target.y)) return;
        const related = !focusSet || (focusSet.has(l.source) && focusSet.has(l.target));
        ctx.strokeStyle = rgba(lobeColor(l.source), (related ? 0.45 : 0.06) * depthF); ctx.lineWidth = sw(1.1);
        ctx.beginPath(); ctx.moveTo(l.source.x, l.source.y); ctx.lineTo(l.target.x, l.target.y); ctx.stroke();
      });
    }
    // page-page connections
    activeLinks.forEach(l => {
      if (l.kind !== 'pp') return;
      const da = Math.min(depthA(l.source), depthA(l.target)); if (da < 0.03) return;
      if (!inView(l.source.x, l.source.y) && !inView(l.target.x, l.target.y)) return;
      const inFocus = focusSet && focusSet.has(l.source) && focusSet.has(l.target) && (l.source === focus || l.target === focus);
      const base = 0.16 + Math.min(l.w, 6) * 0.045;
      const a = (focusSet ? (inFocus ? 0.85 : 0.05) : base) * da;
      const col = l.source.lobe === l.target.lobe ? lobeColor(l.source) : '#b9c4e0';
      ctx.strokeStyle = rgba(col, a);
      ctx.lineWidth = sw(inFocus ? 1.8 : 0.7 + Math.min(l.w, 6) * 0.18);
      ctx.beginPath(); ctx.moveTo(l.source.x, l.source.y); ctx.lineTo(l.target.x, l.target.y); ctx.stroke();
    });

    // synapse tethers + cross links + source tethers
    if (synVis > 0.02 && explodeF > 0.05) {
      const v = synVis * explodeF;
      activeLinks.forEach(l => {
        if (l.kind === 'pp' || l.kind === 'cc' || l.kind === 'pc') return;
        if (!inView(l.target.x, l.target.y)) return;
        const da = depthA(l.source); if (da < 0.03) return;
        const related = (!focusSet || focusSet.has(l.source) || focusSet.has(l.target)) && da > 0.5;
        if (l.kind === 'st') {
          ctx.strokeStyle = rgba(lobeColor(l.source), (related ? 0.35 : 0.05) * v); ctx.lineWidth = sw(0.8); ctx.setLineDash([]);
        } else if (l.kind === 'sx') {
          ctx.strokeStyle = rgba('#ffffff', (related ? 0.55 : 0.06) * v); ctx.lineWidth = sw(0.9); ctx.setLineDash([sw(4), sw(4)]);
        } else {
          ctx.strokeStyle = rgba('#8ea2cc', (related ? 0.22 : 0.03) * v); ctx.lineWidth = sw(0.6); ctx.setLineDash([sw(1.5), sw(3)]);
        }
        ctx.beginPath(); ctx.moveTo(l.source.x, l.source.y); ctx.lineTo(l.target.x, l.target.y); ctx.stroke();
      });
      ctx.setLineDash([]);
    }

    // pulses
    if (!reduceMotion) {
      if (now - lastPulse > 260) { lastPulse = now; const cand = activeLinks.filter(l => l.kind === 'pp' && depthA(l.source) > 0.97 && depthA(l.target) > 0.97); spawnPulse(cand[Math.floor(Math.random() * cand.length)]); }
      for (let i = pulses.length - 1; i >= 0; i--) {
        const p = pulses[i]; p.t += p.speed; if (p.t >= 1) { pulses.splice(i, 1); continue; }
        const s = p.dir > 0 ? p.l.source : p.l.target, e = p.dir > 0 ? p.l.target : p.l.source;
        const x = s.x + (e.x - s.x) * p.t, y = s.y + (e.y - s.y) * p.t;
        const col = s.lobe === e.lobe ? lobeColor(s) : '#ffffff';
        const a = Math.sin(p.t * Math.PI) * Math.min(depthA(s), depthA(e));
        if (a < 0.02) continue;
        ctx.fillStyle = rgba(col, 0.9 * a * (focusSet ? 0.5 : 1)); ctx.beginPath(); ctx.arc(x, y, sw(2.2), 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = rgba(col, 0.25 * a); ctx.beginPath(); ctx.arc(x, y, sw(6), 0, Math.PI * 2); ctx.fill();
      }
    }

    // sources (sparks)
    if (synVis > 0.02 && explodeF > 0.05) {
      const v = synVis * explodeF;
      activeNodes.forEach(n => {
        if (n.kind !== 'src' || !inView(n.x, n.y)) return;
        const related = !focusSet || focusSet.has(n);
        const r = nodeR(n) * (0.6 + 0.4 * explodeF);
        ctx.fillStyle = rgba(n.kindOf === 'github' ? '#c7d2ea' : '#dbe4ff', (related ? 0.9 : 0.15) * v);
        ctx.beginPath(); ctx.moveTo(n.x, n.y - r * 1.4); ctx.lineTo(n.x + r, n.y); ctx.lineTo(n.x, n.y + r * 1.4); ctx.lineTo(n.x - r, n.y); ctx.closePath(); ctx.fill();
        if (srcLabelVis > 0 && related) {
          ctx.font = `500 ${sw(10)}px 'Satoshi', sans-serif`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
          ctx.fillStyle = rgba('#a7b2cc', 0.9 * srcLabelVis * v);
          ctx.fillText(n.label, n.x + r + sw(4), n.y);
        }
      });
    }

    // synapses
    if (synVis > 0.02 && explodeF > 0.05) {
      const v = synVis;
      activeNodes.forEach(n => {
        if (n.kind !== 'syn' || !inView(n.x, n.y)) return;
        const da = depthA(n); if (da < 0.03) return;
        const related = !focusSet || focusSet.has(n);
        const r = nodeR(n) * (0.5 + 0.5 * explodeF) * da;
        const col = lobeColor(n);
        const isPulse = n === pulseSyn;
        ctx.fillStyle = rgba(col, (related ? 0.95 : 0.15) * v * da);
        ctx.beginPath(); ctx.arc(n.x, n.y, r * (isPulse ? 1.9 : 1), 0, Math.PI * 2); ctx.fill();
        if (related && n.links.length) { ctx.strokeStyle = rgba('#ffffff', 0.7 * v); ctx.lineWidth = sw(0.8); ctx.beginPath(); ctx.arc(n.x, n.y, r + sw(1.6), 0, Math.PI * 2); ctx.stroke(); }
        if (isPulse) { ctx.strokeStyle = rgba('#ffffff', 0.9); ctx.lineWidth = sw(1.5); ctx.beginPath(); ctx.arc(n.x, n.y, r + sw(5), 0, Math.PI * 2); ctx.stroke(); }
        const lv = focusSet && related ? Math.max(synLabelVisFocus, synLabelVisAll) : synLabelVisAll;
        if (lv > 0.02 && related) {
          const p = pageById[n.page];
          let ang = Math.atan2(n.y - p.y, n.x - p.x);
          const flip = Math.cos(ang) < 0;
          ctx.save(); ctx.translate(n.x, n.y); ctx.rotate(flip ? ang + Math.PI : ang);
          ctx.font = `500 ${sw(10.5)}px 'Satoshi', sans-serif`; ctx.textBaseline = 'middle'; ctx.textAlign = flip ? 'right' : 'left';
          ctx.fillStyle = rgba('#e9eefb', 0.92 * lv * v * explodeF);
          const label = n.lead.length > 36 ? n.lead.slice(0, 34) + '…' : n.lead;
          ctx.fillText(label, flip ? -(r + sw(5)) : r + sw(5), 0);
          ctx.restore();
        }
      });
    }

    // neurons (pages)
    activeNodes.forEach(n => {
      if (n.kind !== 'page' || !inView(n.x, n.y)) return;
      const da = depthA(n); if (da < 0.03) return;
      const related = !focusSet || focusSet.has(n);
      const col = lobeColor(n);
      const r = nodeR(n);
      const a = (related ? 1 : dim) * da;
      // halo
      ctx.fillStyle = rgba(col, 0.10 * a); ctx.beginPath(); ctx.arc(n.x, n.y, r * 2.6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = rgba(col, 0.22 * a); ctx.beginPath(); ctx.arc(n.x, n.y, r * 1.6, 0, Math.PI * 2); ctx.fill();
      // body
      ctx.fillStyle = rgba(col, 0.95 * a); ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = rgba('#ffffff', 0.55 * a); ctx.beginPath(); ctx.arc(n.x - r * 0.25, n.y - r * 0.25, r * 0.32, 0, Math.PI * 2); ctx.fill();
      // folded sub-neurons: small satellites hugging the body until the depth level unfolds them
      if (n.children.length && depthF < 0.97) {
        const m = n.children.length, rr = r + sw(10);
        ctx.fillStyle = rgba(col, 0.9 * a * (1 - depthF));
        for (let i = 0; i < m; i++) { const ang = n.spin + Math.PI / 2 + (i / m) * Math.PI * 2; ctx.beginPath(); ctx.arc(n.x + Math.cos(ang) * rr, n.y + Math.sin(ang) * rr, sw(2.2), 0, Math.PI * 2); ctx.fill(); }
      }
      // collapsed synapse ring: hints how many synapses are packed inside
      if (explodeF < 0.95 && n.nSyn) {
        ctx.strokeStyle = rgba(col, 0.5 * a * (1 - explodeF)); ctx.lineWidth = sw(1);
        ctx.setLineDash([sw(1.5), sw(Math.max(2, 40 / n.nSyn))]);
        ctx.beginPath(); ctx.arc(n.x, n.y, r + sw(5), 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      }
      if (n === selected) { ctx.strokeStyle = rgba('#ffffff', 0.9); ctx.lineWidth = sw(1.6); ctx.beginPath(); ctx.arc(n.x, n.y, r + sw(9), 0, Math.PI * 2); ctx.stroke(); }
      else if (n === hover) { ctx.strokeStyle = rgba('#ffffff', 0.6); ctx.lineWidth = sw(1.2); ctx.beginPath(); ctx.arc(n.x, n.y, r + sw(7), 0, Math.PI * 2); ctx.stroke(); }
      // label
      const important = n.lobe === 'self' || n.deg >= 18 || n.r > 12.5;
      const lv = isChild(n) ? childLabelVis : n.lobe === 'self' ? 1 : important ? Math.max(labelVis, clamp01((k - 0.45) / 0.25)) : labelVis;
      if (lv > 0.02 && (related || lv > 0.6)) {
        const fs = n.lobe === 'self' ? 15 : isChild(n) ? 10.5 : 12;
        ctx.font = `${n.lobe === 'self' ? 600 : 500} ${sw(fs)}px 'Satoshi', sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillStyle = rgba('#000000', 0.55 * lv * a); ctx.fillText(n.title, n.x + sw(0.8), n.y + r + sw(5.8));
        ctx.fillStyle = rgba(related ? '#f1f4ff' : '#9aa5c2', (related ? 0.95 : 0.5) * lv);
        ctx.fillText(n.title, n.x, n.y + r + sw(5));
      }
    });

    requestAnimationFrame(draw);
  }

  function focusNeighborhood(n) {
    const s = new Set([n]);
    if (n.kind === 'page') {
      n.children.forEach(c => s.add(c)); if (n.parent) s.add(n.parent);
      n.neighbors.forEach(x => s.add(x.n));
      n.synNodes.forEach(x => { s.add(x); x.links.forEach(id => pageById[id] && s.add(pageById[id])); });
      n.srcNodes.forEach(x => s.add(x));
      syns.forEach(x => { if (x.links.includes(n.id)) { s.add(x); s.add(pageById[x.page]); } });
    } else if (n.kind === 'syn') {
      s.add(pageById[n.page]); n.links.forEach(id => pageById[id] && s.add(pageById[id]));
    } else { n.pageNodes.forEach(p => s.add(p)); }
    return s;
  }

  // ---------- interaction ----------
  function pick(sx, sy) {
    const [x, y] = toWorld(sx, sy);
    const synOk = explodeF > 0.6 && (forceExplode || k >= 1.25);
    let best = null, bd = Infinity;
    for (const n of activeNodes) {
      if (n.kind !== 'page' && !synOk) continue;
      if (isChild(n) && depthF < 0.5) continue;
      if (n.kind === 'syn' && isChild(pageById[n.page]) && depthF < 0.5) continue;
      const r = (n.kind === 'page' ? n.r / Math.pow(k, 0.45) : 4 / k) + 6 / k;
      const d = Math.hypot(n.x - x, n.y - y);
      if (d < r && d < bd) { bd = d; best = n; }
    }
    return best;
  }
  const tip = document.getElementById('tip');
  let dragging = false, downAt = null;
  canvas.addEventListener('pointerdown', e => { downAt = [e.clientX, e.clientY]; canvas.classList.add('grabbing'); });
  canvas.addEventListener('pointerup', e => {
    canvas.classList.remove('grabbing');
    if (downAt && Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) < 5) { const n = pick(e.clientX, e.clientY); n ? select(n) : clearSelection(); }
    downAt = null;
  });
  canvas.addEventListener('pointermove', e => {
    if (downAt) return;
    const n = pick(e.clientX, e.clientY);
    if (n !== hover) {
      hover = n; canvas.classList.toggle('pointer', !!n);
      if (n) { tip.hidden = false; tip.innerHTML = tipHtml(n); if (n.kind === 'page') n.neighbors.slice(0, 4).forEach(x => spawnPulse(x.l, true)); }
      else tip.hidden = true;
    }
    if (n) { tip.style.left = Math.min(e.clientX, W - 300) + 'px'; tip.style.top = Math.min(e.clientY, H - 90) + 'px'; }
  });
  canvas.addEventListener('pointerleave', () => { hover = null; tip.hidden = true; });
  function tipHtml(n) {
    if (n.kind === 'page') return `<span class="k">${isChild(n) ? `sub-neuron of ${esc(n.parent.title)}` : typeName(n) + ' · ' + esc(lobeById[n.lobe].name)}</span><b>${esc(n.title)}</b>${n.nSyn} synapses · ${n.neighbors.length} connections${n.children.length ? ` · ${n.children.length} sub-neurons` : ''}`;
    if (n.kind === 'syn') return `<span class="k">synapse of ${esc(pageById[n.page].title)}</span><b>${esc(n.lead)}</b>${esc(n.text.slice(0, 140))}${n.text.length > 140 ? '…' : ''}`;
    return `<span class="k">${srcKind(n)}</span><b>${esc(n.label)}</b>cited by ${n.pageNodes.length} neuron${n.pageNodes.length > 1 ? 's' : ''}`;
  }
  const srcKind = n => ({ session: 'Perplexity session', github: D.demo ? 'Code host (demo)' : 'GitHub', web: 'Web source', gmail: 'Gmail (metadata)', calendar: 'Google Calendar', spotify: 'Spotify', plaid: 'Bank data (names only)', memory: 'Memory note', wiki: 'Brain page' }[n.kindOf] || 'Source');
  const typeName = n => esc({ project: 'project', entity: 'person / thing', person: 'person', place: 'place', habit: 'habit', event: 'event', account: 'account', trip: 'trip', preference: 'preference', day: D.dayName || 'dream log', audit: 'audit' }[n.type] || n.type || '');
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const panel = document.getElementById('panel'), panelBody = document.getElementById('panel-body');
  document.getElementById('panel-close').addEventListener('click', clearSelection);
  window.addEventListener('keydown', e => { if (e.key === 'Escape') { clearSelection(); hideResults(); } });

  function select(n, opts = {}) {
    if (selected && selected.kind === 'page') { selected.fx = null; selected.fy = null; }
    selected = n; pulseSyn = null;
    if (n.kind === 'page' && !isChild(n)) { n.fx = n.x; n.fy = n.y; }   // sub-neurons stay free so they can reach their ring slot
    if (n.kind === 'page') {
      const kk = isChild(n) ? 3.6 : n.nSyn > 14 ? 2.6 : 3.2;
      if (!opts.noZoom) {
        const folded = isChild(n) && depthF < 0.97;
        zoomTo(folded ? n.parent : n, Math.max(k, kk));          // a folded sub-neuron has no ring slot yet, so head for its parent first
        if (folded) setTimeout(() => { if (selected === n) zoomTo(n, Math.max(k, kk), 700); }, 900);   // then settle on the child once it has unfolded
      }
      n.neighbors.forEach(x => spawnPulse(x.l, true));
    } else if (n.kind === 'syn') {
      pulseSyn = n;
      if (!opts.noZoom) {
        zoomTo(n, Math.max(k, 3.4));
        // a synapse of a folded sub-neuron moves as its page unfolds, so recenter once it has settled
        if (isChild(pageById[n.page]) && depthF < 0.97) setTimeout(() => { if (selected === n) zoomTo(n, Math.max(k, 3.4), 700); }, 900);
      }
    }
    else if (!opts.noZoom) zoomTo(n, Math.max(k, 3));
    renderPanel(n); panel.hidden = false;
  }
  function clearSelection() { if (selected && selected.kind === 'page') { selected.fx = null; selected.fy = null; } selected = null; pulseSyn = null; panel.hidden = true; }

  function renderPanel(n) {
    const col = lobeColor(n);
    let h = '';
    if (n.kind === 'page') {
      h += `<div class="kind"><span class="sw" style="background:${col};color:${col}"></span>${typeName(n)} · ${esc(lobeById[n.lobe].name)}</div>`;
      h += `<h2>${esc(n.title)}</h2><p class="desc">${esc(n.desc || n.intro)}</p>`;
      h += `<div class="meta">${n.updated ? `<span>updated ${n.updated}</span>` : ''}<span>${n.nSyn} synapses</span><span>${n.neighbors.length} connections</span><span>${n.srcNodes.length} sources</span></div>`;
      if (n.parent) h += `<h3>Part of</h3><ul><li class="nb" data-id="${esc(n.parent.id)}"><span class="sw" style="background:${lobeColor(n.parent)}"></span><span class="t">${esc(n.parent.title)}<span class="note">parent neuron</span></span></li></ul>`;
      if (n.children.length) h += `<h3>Sub-neurons <span>${n.children.length}</span></h3><ul>` + n.children.map(c => `<li class="nb" data-id="${esc(c.id)}"><span class="sw" style="background:${lobeColor(c)}"></span><span class="t">${esc(c.title)}<span class="note">${esc(c.desc || '')}</span></span><span class="w">${c.nSyn}</span></li>`).join('') + `</ul>`;
      if (n.neighbors.length) {
        h += `<h3>Connected neurons</h3><ul>`;
        [...n.neighbors].sort((a, b) => b.l.w - a.l.w).forEach(({ n: m, l }) => {
          const note = l.notes && l.notes.length ? l.notes[0] : l.kinds.includes('see-also') ? 'see also' : 'mentioned in a synapse';
          h += `<li class="nb" data-id="${esc(m.id)}"><span class="sw" style="background:${lobeColor(m)}"></span><span class="t">${esc(m.title)}<span class="note">${esc(note)}</span></span><span class="w">×${l.w}</span></li>`;
        });
        h += `</ul>`;
      }
      if (n.synNodes.length) {
        const bySection = d3.group(n.synNodes, s => s.section);
        h += `<h3>Synapses <span>${n.nSyn}</span></h3>`;
        bySection.forEach((list, sec) => {
          if (bySection.size > 1) h += `<div class="kind" style="margin:8px 0 4px 10px">${esc(sec)}</div>`;
          h += `<ul>` + list.map(s => `<li class="syn" data-id="${esc(s.id)}"><div class="lead">${esc(s.lead)}</div><div class="txt">${esc(s.text)}</div>${s.links.length ? `<div class="lk">→ ${s.links.map(id => esc(pageById[id]?.title || id)).join(' · ')}</div>` : ''}</li>`).join('') + `</ul>`;
        });
      }
      const incoming = syns.filter(s => s.links.includes(n.id));
      if (incoming.length) {
        h += `<h3>Synapses pointing here <span>${incoming.length}</span></h3><ul>` + incoming.map(s => `<li class="syn" data-id="${esc(s.id)}"><div class="lead">${esc(pageById[s.page].title)} › ${esc(s.lead)}</div><div class="txt">${esc(s.text.slice(0, 180))}${s.text.length > 180 ? '…' : ''}</div></li>`).join('') + `</ul>`;
      }
      if (n.srcNodes.length) {
        h += `<h3>Sources <span>${n.srcNodes.length}</span></h3><ul>` + n.srcNodes.map(s => `<li class="src"><span class="sk">${esc(srcKindShort(s))}</span>${esc(s.label)}</li>`).join('') + `</ul>`;
      }
    } else if (n.kind === 'syn') {
      const p = pageById[n.page];
      h += `<div class="kind"><span class="sw" style="background:${col};color:${col}"></span>synapse · ${esc(n.section)}</div>`;
      h += `<h2>${esc(n.lead)}</h2><p class="desc">${esc(n.text)}</p>`;
      h += `<h3>Belongs to</h3><ul><li class="nb" data-id="${esc(p.id)}"><span class="sw" style="background:${col}"></span><span class="t">${esc(p.title)}</span></li></ul>`;
      if (n.links.length) h += `<h3>Fires toward</h3><ul>` + n.links.map(id => pageById[id] ? `<li class="nb" data-id="${esc(id)}"><span class="sw" style="background:${lobeColor(pageById[id])}"></span><span class="t">${esc(pageById[id].title)}</span></li>` : '').join('') + `</ul>`;
      if (n.cites.length) h += `<h3>Sources</h3><ul>` + n.cites.map(u => srcById[u] ? `<li class="src"><span class="sk">${esc(srcKindShort(srcById[u]))}</span>${esc(srcById[u].label)}</li>` : '').join('') + `</ul>`;
    } else {
      h += `<div class="kind">${esc(srcKindShort(n))}</div><h2>${esc(n.label)}</h2>`;
      h += `<p class="desc">${esc(n.id)}</p>`;
      h += `<h3>Cited by</h3><ul>` + n.pageNodes.map(p => `<li class="nb" data-id="${esc(p.id)}"><span class="sw" style="background:${lobeColor(p)}"></span><span class="t">${esc(p.title)}</span></li>`).join('') + `</ul>`;
    }
    panelBody.innerHTML = h;
    panelBody.querySelectorAll('.nb').forEach(el => el.addEventListener('click', () => { const m = pageById[el.dataset.id]; if (m) { ensureVisible(m); select(m); } }));
    panelBody.querySelectorAll('.syn').forEach(el => el.addEventListener('click', () => {
      const s = synById[el.dataset.id]; if (!s) return;
      panelBody.querySelectorAll('.syn').forEach(x => x.classList.remove('active')); el.classList.add('active');
      pulseSyn = s; zoomTo(s, Math.max(k, 3.4), 800);
    }));
    panel.scrollTop = 0;
  }
  const srcKindShort = s => ({ session: 'session', github: D.demo ? 'code' : 'github', web: 'web', gmail: 'gmail', calendar: 'calendar', spotify: 'spotify', plaid: 'bank', memory: 'memory', wiki: 'brain' }[s.kindOf] || 'source');
  function ensureLobe(id) { if (!lobeOn[id]) { lobeOn[id] = true; renderLobeList(); rebuild(false); } }
  // a sub-neuron needs its own lobe and its parent's lobe on before it can be selected
  function ensureVisible(n) { if (n.kind === 'page') { if (n.parent) ensureLobe(n.parent.lobe); ensureLobe(n.lobe); } else if (n.kind === 'syn') ensureVisible(pageById[n.page]); }

  // ---------- lobe list ----------
  const lobeList = document.getElementById('lobe-list');
  const lobesAside = document.getElementById('lobes');
  document.querySelector('.lobes-head').addEventListener('click', () => lobesAside.classList.toggle('open'));
  function renderLobeList() {
    lobeList.innerHTML = lobes.map(l => {
      const ps = pages.filter(p => p.lobe === l.id && !isChild(p));
      return `<button class="lobe ${lobeOn[l.id] ? '' : 'off'}" data-id="${l.id}" aria-pressed="${lobeOn[l.id]}" style="color:${lobeOn[l.id] ? 'var(--text)' : ''}"><span class="sw" style="background:${l.color};color:${l.color}"></span><span>${esc(l.name)}</span><span class="n">${ps.length}</span></button>`;
    }).join('');
    lobeList.querySelectorAll('.lobe').forEach(b => b.addEventListener('click', () => {
      const id = b.dataset.id; lobeOn[id] = !lobeOn[id];
      if (selected && !visible(selected)) clearSelection();
      renderLobeList(); rebuild(false); updateStats();
    }));
  }
  document.getElementById('explode-all').addEventListener('change', e => { forceExplode = e.target.checked; updateLevel(); });
  document.getElementById('cocite').addEventListener('change', e => { showCocite = e.target.checked; rebuild(false); });

  // ---------- zoom controls / level ----------
  document.getElementById('z-in').addEventListener('click', () => d3.select(canvas).transition().duration(350).call(zoom.scaleBy, 1.6));
  document.getElementById('z-out').addEventListener('click', () => d3.select(canvas).transition().duration(350).call(zoom.scaleBy, 1 / 1.6));
  document.getElementById('z-fit').addEventListener('click', () => { clearSelection(); fitAll(); });
  const levelText = document.getElementById('level-text'), levelDot = document.querySelector('#level .dot'), hint = document.getElementById('hint');
  function updateLevel() {
    const lvl = forceExplode || k >= 1.5 ? 'Synapses' : hasSubs && k >= 0.85 ? 'Sub-neurons' : k >= 0.6 ? 'Neurons' : 'Lobes';
    levelText.textContent = lvl + ` · ${k.toFixed(1)}×`;
    const c = lvl === 'Synapses' ? '#ffffff' : lvl === 'Sub-neurons' ? '#fbbf24' : lvl === 'Neurons' ? '#ff8a3d' : '#4fd1c5';
    levelDot.style.background = c; levelDot.style.boxShadow = `0 0 12px ${c}`;
    hint.textContent = lvl === 'Lobes' ? 'scroll to zoom · drag to pan · click a neuron' : lvl === 'Neurons' ? (hasSubs ? 'keep zooming: sub-neurons unfold at 0.85×, synapses at 1.5×' : 'keep zooming: synapses explode at 1.5×') : lvl === 'Sub-neurons' ? 'small satellites are sub-neurons · zoom past 1.5× to explode synapses' : 'dots are synapses · diamonds are sources · dashed lines fire across neurons';
  }
  function updateStats() {
    const vp = pages.filter(visible);
    const subs = vp.filter(isChild).length;
    document.getElementById('stats').innerHTML = `<b>${vp.length - subs}</b> neurons${subs ? ` · <b>${subs}</b> sub-neurons` : ''} · <b>${d3.sum(vp, p => p.nSyn)}</b> synapses<br><b>${activeLinks.filter(l => l.kind === 'pp').length}</b> connections · <b>${srcs.filter(visible).length}</b> sources`;
  }

  // ---------- search ----------
  const q = document.getElementById('q'), results = document.getElementById('results');
  let resultItems = [], activeIdx = -1;
  function hideResults() { results.hidden = true; activeIdx = -1; }
  q.addEventListener('input', () => {
    const term = q.value.trim().toLowerCase();
    if (term.length < 2) { hideResults(); return; }
    const hits = [];
    pages.forEach(p => { const t = p.title.toLowerCase(); if (t.includes(term)) hits.push({ n: p, score: (t === term ? 0 : t.startsWith(term) ? 1 : 2) + t.length / 1000 }); else if ((p.desc || '').toLowerCase().includes(term)) hits.push({ n: p, score: 5 }); });
    syns.forEach(s => { const l = s.lead.toLowerCase(); if (l.includes(term)) hits.push({ n: s, score: 3 }); else if (s.text.toLowerCase().includes(term)) hits.push({ n: s, score: 6 }); });
    hits.sort((a, b) => a.score - b.score);
    resultItems = hits.slice(0, 9).map(h => h.n);
    results.innerHTML = resultItems.length ? resultItems.map(n => n.kind === 'page'
      ? `<li role="option"><span class="sw" style="background:${lobeColor(n)}"></span><span><span class="rt">${esc(n.title)}</span><span class="rs">${isChild(n) ? 'sub-neuron of ' + esc(n.parent.title) : typeName(n) + ' · ' + esc(lobeById[n.lobe].name)} · ${n.nSyn} synapses</span></span></li>`
      : `<li role="option"><span class="sw" style="background:${lobeColor(n)};opacity:.6"></span><span><span class="rt">${esc(n.lead)}</span><span class="rs">synapse of ${esc(pageById[n.page].title)}</span></span></li>`).join('')
      : `<li><span class="empty">Nothing fires for “${esc(q.value)}”</span></li>`;
    results.hidden = false; activeIdx = -1;
    results.querySelectorAll('li[role=option]').forEach((li, i) => li.addEventListener('click', () => choose(i)));
  });
  q.addEventListener('keydown', e => {
    if (results.hidden) return;
    if (e.key === 'ArrowDown') { activeIdx = Math.min(activeIdx + 1, resultItems.length - 1); mark(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { activeIdx = Math.max(activeIdx - 1, 0); mark(); e.preventDefault(); }
    else if (e.key === 'Enter') { choose(Math.max(activeIdx, 0)); }
  });
  function mark() { results.querySelectorAll('li').forEach((li, i) => li.classList.toggle('active', i === activeIdx)); }
  function choose(i) { const n = resultItems[i]; if (!n) return; ensureVisible(n); hideResults(); q.blur(); select(n); }
  document.addEventListener('click', e => { if (!e.target.closest('.search')) hideResults(); });

  // ---------- boot ----------
  renderLobeList();
  rebuild(true);
  updateStats();
  // initial transform: fit
  (() => {
    const vp = pages.filter(p => visible(p) && !isChild(p));
    const xs = vp.map(p => p.x), ys = vp.map(p => p.y);
    const minX = Math.min(...xs) - 150, maxX = Math.max(...xs) + 150, minY = Math.min(...ys) - 170, maxY = Math.max(...ys) + 170;
    const kk = Math.min((W - 60) / (maxX - minX), (H - 200) / (maxY - minY)) * 0.96;
    const t = d3.zoomIdentity.translate(W / 2 - (minX + maxX) / 2 * kk, H / 2 + 12 - (minY + maxY) / 2 * kk).scale(kk * 0.6);
    d3.select(canvas).call(zoom.transform, t);
    d3.select(canvas).transition().duration(1600).ease(d3.easeCubicOut).call(zoom.transform, d3.zoomIdentity.translate(W / 2 - (minX + maxX) / 2 * kk, H / 2 + 12 - (minY + maxY) / 2 * kk).scale(kk));
  })();
  updateLevel();
  requestAnimationFrame(draw);
  document.fonts?.ready.then(() => document.getElementById('loading').classList.add('done'));
  setTimeout(() => document.getElementById('loading').classList.add('done'), 1500);
})();
