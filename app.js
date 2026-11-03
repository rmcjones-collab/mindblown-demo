/* MindBlown — explode the Brain into lobes, neurons and synapses. */
(() => {
  // ---------- nav: one dropdown of every brain, in the header on every page ----------
  // Source, in order: window.MINDBLOWN_NAV ([{label, href, color?, sep?}]), or an existing <nav class="brains"> of links; the current page is marked by href or .on
  (() => {
    const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    let nav = document.querySelector('nav.brains');
    const here = location.pathname.split('/').pop() || 'index.html';
    let items = Array.isArray(window.MINDBLOWN_NAV) ? window.MINDBLOWN_NAV : null;
    // links become items; a <select> of pages (as the genome's chromosome picker) unfolds into one item per option; anything else is a separator
    const ofLink = el => ({ label: el.textContent.trim(), href: el.getAttribute('href'), color: (el.querySelector('.dot') || {}).style?.background || '', on: el.classList.contains('on') });
    if (!items && nav) items = [...nav.children].flatMap(el => el.matches('a') ? [ofLink(el)] : el.matches('select') ? [{ sep: true }, ...[...el.options].filter(o => o.value).map(o => ({ label: o.textContent.trim(), href: o.value, on: o.selected && el.classList.contains('on') }))] : [{ sep: true }]);
    if (items) items = items.filter((it, k, a) => !it.sep || (k > 0 && k < a.length - 1 && !a[k - 1].sep)); // no leading, trailing or doubled separators
    if (!items || !items.filter(i => !i.sep).length) return;
    if (!nav) { nav = document.createElement('nav'); nav.className = 'brains'; const bt = document.querySelector('.brand-text'); if (bt) bt.after(nav); else document.getElementById('top').prepend(nav); }
    nav.classList.add('dd'); nav.setAttribute('aria-label', 'Brains');
    const cur = items.find(i => !i.sep && (i.on || (i.href || '').split('/').pop().split('#')[0] === here)) || items.find(i => !i.sep);
    const dot = c => c ? `<span class="dot" style="background:${esc(c)}"></span>` : '<span class="dot none"></span>';
    nav.innerHTML = `<button class="nav-btn" aria-haspopup="menu" aria-expanded="false" title="Switch brain">${dot(cur.color)}<span class="cur">${esc(cur.label)}</span><span class="chev" aria-hidden="true">▾</span></button>
      <ul class="nav-menu" role="menu" hidden>${items.map(i => i.sep ? '<li class="sep" role="separator"></li>' : `<li role="none"><a role="menuitem" href="${esc(i.href)}"${i === cur ? ' class="on" aria-current="page"' : ''}>${dot(i.color)}<span>${esc(i.label)}</span></a></li>`).join('')}</ul>`;
    const btn = nav.querySelector('.nav-btn'), menu = nav.querySelector('.nav-menu');
    const open = o => { menu.hidden = !o; btn.setAttribute('aria-expanded', String(o)); nav.classList.toggle('open', o); if (o) { nav.classList.remove('flip'); nav.classList.toggle('flip', menu.getBoundingClientRect().right > innerWidth - 8); menu.querySelector('a.on, a')?.focus(); } };
    btn.addEventListener('click', () => open(menu.hidden));
    document.addEventListener('click', e => { if (!nav.contains(e.target)) open(false); });
    nav.addEventListener('keydown', e => {
      const links = [...menu.querySelectorAll('a')], i = links.indexOf(document.activeElement);
      if (e.key === 'Escape') { open(false); btn.focus(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); if (menu.hidden) open(true); else links[(i + 1) % links.length]?.focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); if (menu.hidden) { open(true); links[links.length - 1]?.focus(); } else links[(i - 1 + links.length) % links.length]?.focus(); }
    });
  })();
  // pages without a canvas (an overview or index page) load app.js for the nav alone
  if (!document.getElementById('brain') || !window.MINDBLOWN) return;

  const D = window.MINDBLOWN;
  // optional network layer: other brains that share neuron ids with this one (see build_network.py in a network repo)
  const N = window.MINDBLOWN_NETWORK || null;
  const otherBrains = id => (N && N.shared && N.shared[id]) ? N.brains.filter(b => b.id !== D.brain && N.shared[id][b.id]).map(b => ({ ...b, ...N.shared[id][b.id] })) : [];
  const isShared = n => n.kind === 'page' && otherBrains(n.id).length > 0;
  if (D.demo) { const sub = document.querySelector('.brand .sub'); if (sub) sub.textContent = 'demo brain · fictional data'; document.title = 'MindBlown — demo brain'; }
  if (D.subtitle) { const sub = document.querySelector('.brand .sub'); if (sub) sub.textContent = D.subtitle; }
  if (D.title) { document.title = D.title; const h = document.querySelector('.brand .title'); if (h) h.textContent = D.title; }
  const canvas = document.getElementById('brain');
  const ctx = canvas.getContext('2d');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- model ----------
  const lobes = D.lobes;
  const lobeById = Object.fromEntries(lobes.map(l => [l.id, l]));
  // a network data file lists several brains, each with its own hub ("self") lobe; a single brain has lobe 'self' and D.center
  const brainsIn = D.brains || null;
  const selfLobe = l => !!l.self || l.id === 'self';
  const selfIds = new Set(lobes.filter(selfLobe).map(l => l.id));
  const isSelf = n => selfIds.has(n.lobe);
  const centers = new Set(D.centers || (D.center ? [D.center] : []));
  const lobeOn = Object.fromEntries(lobes.map(l => [l.id, !l.hidden]));

  const pageById = {};
  const pages = D.pages.map(p0 => { const p = { ...p0, parentId: p0.parent || null }; delete p.parent;
    const n = { ...p, kind: 'page', nSyn: p.synapses.length, deg: 0, r: 0, neighbors: [], synNodes: [], srcNodes: [], children: [], parent: null, isCenter: centers.has(p.id) };
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

  // lobe anchors: one brain puts its hub in the middle and its lobes on a ring around it.
  // A network puts each brain's hub on a big circle, that brain's lobes on an outward-facing arc around its hub,
  // and the shared lobes (same neuron ids in every brain) in the middle where all the brains can reach them.
  const anchor = {};
  const hubOf = {};   // lobe id → the point its halo label faces away from
  const lobeCount = {}; pages.forEach(p => { lobeCount[p.lobe] = (lobeCount[p.lobe] || 0) + 1; });
  function arcAnchors(ids, cx, cy, R, start, sweep) {
    const span = ids.map(id => Math.sqrt(lobeCount[id] || 1) + 2.6), total = d3.sum(span);
    let acc = start;
    ids.forEach((id, i) => { const a = acc + (span[i] / total) * sweep / 2; acc += (span[i] / total) * sweep; anchor[id] = { x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R }; hubOf[id] = { x: cx, y: cy }; });
  }
  if (!brainsIn) {
    anchor.self = { x: 0, y: 0 };
    const ring = lobes.filter(l => !selfLobe(l)).map(l => l.id);
    const span0 = Math.sqrt(lobeCount[ring[0]] || 1) + 2.6, total = d3.sum(ring.map(id => Math.sqrt(lobeCount[id] || 1) + 2.6));
    arcAnchors(ring, 0, 0, 760, -Math.PI / 2 - (span0 / total) * Math.PI, Math.PI * 2);
  } else {
    const NB = brainsIn.length, RB = NB === 1 ? 0 : 1550 + 250 * Math.max(0, NB - 2);
    brainsIn.forEach((b, i) => {
      const th = Math.PI + (Math.PI * 2 * i) / NB, hx = Math.cos(th) * RB, hy = Math.sin(th) * RB;
      b.hub = { x: hx, y: hy }; anchor[b.self] = b.hub;
      const own = lobes.filter(l => l.brain === b.id && !selfLobe(l)).map(l => l.id);
      arcAnchors(own, hx, hy, 820, th - Math.PI * 0.7, Math.PI * 1.4);   // the inner 0.6π stays open towards the shared lobes
    });
    const sharedL = lobes.filter(l => !l.brain && !selfLobe(l)).map(l => l.id);
    sharedL.forEach((id, j) => { const m = sharedL.length, a = -Math.PI / 2 + (Math.PI * 2 * j) / m, r = m === 1 ? 0 : 430; anchor[id] = { x: Math.cos(a) * r, y: Math.sin(a) * r }; hubOf[id] = { x: 0, y: 0 }; });
  }
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
  // labels toggle (L); when off, only the hovered neuron or lobe keeps its label. A page may start with labels off by setting
  // window.MINDBLOWN_OPTIONS = { labels: false } before app.js loads; the toggle, the lobes-panel switch and the L key still work.
  const OPT = window.MINDBLOWN_OPTIONS || {};
  let labelsOn = OPT.labels !== false, labelF = labelsOn ? 1 : 0;
  // layout (G): 'neural' is the force-directed brain; 'genome' arranges the same brain the way a genome is mapped, as a karyogram.
  // A page may start in it with window.MINDBLOWN_OPTIONS = { layout: 'genome' } or a #layout=genome hash; the tool button, the switch and G toggle it.
  let layout = OPT.layout === 'genome' || /[#&]layout=genome\b/.test(location.hash) ? 'genome' : 'neural';
  const genome = () => layout === 'genome';

  // ---------- genome layout: every brain mapped like a karyotype ----------
  // Chromosomes are the brains on a network screen (plus one per shared lobe) and the lobes on a single brain. Each is a vertical bar whose
  // length follows its content as a chromosome's follows its base pairs; bands are the lobes (network) or the neurons themselves, painted in
  // alternating density like G-banding; the hub neuron sits in the centromere constriction, placed submetacentric (38 % down) like most human
  // chromosomes; sub-neurons line up beside their parent on the left, synapses fan out to the right. Nothing here names a dataset: it is built
  // from lobes[].brain / self and D.brains alone, so any brain lays out the same way.
  const G = { barW: 44, gapX: 170, rowGap: 300, hubGap: 420 };
  const chromos = [];
  let layoutAspect = 0;   // viewport aspect the current genome layout was computed for
  const chromoOf = {};   // lobe id → chromosome
  if (brainsIn) {
    brainsIn.forEach(b => {
      const hub = pages.find(p => p.isCenter && p.lobe === b.self) || pages.find(p => p.lobe === b.self && !isChild(p)) || null;
      const c = { id: b.id, name: b.short || b.title, color: b.color || lobeById[b.self]?.color || '#9aa', hub, segs: lobes.filter(l => l.brain === b.id) };
      chromos.push(c); c.segs.forEach(l => { chromoOf[l.id] = c; });
    });
    lobes.filter(l => !l.brain && !selfLobe(l)).forEach(l => { const c = { id: l.id, name: l.name, color: l.color, hub: null, segs: [l] }; chromos.push(c); chromoOf[l.id] = c; });
  } else lobes.filter(l => !selfLobe(l)).forEach(l => { const c = { id: l.id, name: l.name, color: l.color, hub: null, segs: [l] }; chromos.push(c); chromoOf[l.id] = c; });
  const sameChromo = (a, b) => chromoOf[a.lobe] && chromoOf[a.lobe] === chromoOf[b.lobe];
  // The map is static: slots and columns are sized for the unfolded, exploded state up front, so zooming never shifts a locus.
  // the room a locus needs along the bar: its own body (drawn ~1.6× at karyogram zoom) or its sub-neuron column, whichever is taller
  const kidPitch = c => 2 * c.r * 1.5 + 8;
  const slotH = p => Math.max(2 * p.r * 1.6 + 8, d3.sum(p.children.filter(pageOn), kidPitch), 24);
  // how far a neuron's synapse ladder reaches sideways once exploded: one row, 9 units a rung
  const SYN_PITCH = 9;
  const synReach = p => p.nSyn ? p.r * 1.3 + 8 + p.nSyn * SYN_PITCH : 0;
  // a sub-neuron's slot is an offset from its parent; anchorX/Y scale it by depthF so children unfold out of the bar into their column
  const placeKids = p => { const kids = p.children.filter(pageOn), kh = d3.sum(kids, kidPitch); let ky = p.gy - kh / 2; kids.forEach(x => { const ph = kidPitch(x); x.gdx = -(G.barW / 2 + 16 + x.r * 1.5); x.gdy = ky + ph / 2 - p.gy; x.gx = p.gx + x.gdx; x.gy = p.gy + x.gdy; ky += ph; }); };
  function layoutGenome(snap) {
    chromos.forEach(c => {
      const segs = c.segs.map(l => ({ l, ps: pages.filter(p => p.lobe === l.id && p !== c.hub && !isChild(p) && pageOn(p)).sort((a, b) => b.deg - a.deg || a.title.localeCompare(b.title)) })).filter(s => s.ps.length);
      const loci = segs.flatMap(s => s.ps), hs = loci.map(slotH), total = d3.sum(hs);
      let acc = 0, cIdx = loci.length;
      for (let i = 0; i < loci.length; i++) { if (acc + hs[i] / 2 > total * 0.38) { cIdx = i; break; } acc += hs[i]; }
      c.hubOn = c.hub && pageOn(c.hub) ? c.hub : null;
      c.hubH = c.hubOn ? Math.max(2 * c.hubOn.r * 1.6 + 16, d3.sum(c.hubOn.children.filter(pageOn), kidPitch)) : loci.length > 1 ? 16 : 0;
      c.loci = loci; c.hs = hs; c.cIdx = cIdx;
      c.above = d3.sum(hs.slice(0, cIdx)) + c.hubH / 2; c.below = d3.sum(hs.slice(cIdx)) + c.hubH / 2;
      const withHub = c.hubOn ? [...loci, c.hubOn] : loci;   // the hub and its sub-neurons share the chromosome's horizontal extent
      c.reachR = Math.max(0, ...withHub.map(synReach));
      c.reachL = Math.max(0, ...withHub.map(p => { const kids = p.children.filter(pageOn); return kids.length ? 24 + Math.max(...kids.map(x => 2 * x.r * 1.5 + synReach(x))) : 0; }));
      c.on = loci.length > 0 || !!c.hubOn;
    });
    // a karyogram puts many chromosomes on two or three rows, centromeres aligned along each row; the row count that brings the whole
    // map closest to a landscape screen wins, so a brain with a handful of lobes stays on one row and a 26-brain network takes two or three
    const on = chromos.filter(c => c.on), n = on.length;
    const oneRowW = d3.sum(on, c => c.reachL + G.barW + c.reachR + G.gapX), tallest = Math.max(0, ...on.map(c => c.above + c.below)), hubExtra = brainsIn ? 0 : G.hubGap;
    layoutAspect = (W || 1600) / (H || 900);
    const target = Math.max(0.7, Math.min(2.2, layoutAspect));   // aim the map at the screen's shape, so a phone gets a taller karyogram
    const aspectOff = r => Math.abs(Math.log((oneRowW / r) / (hubExtra + tallest * r + G.rowGap * (r - 1)) / target));
    let rows = 1; for (let r = 2; r <= Math.min(4, n); r++) if (aspectOff(r) < aspectOff(rows)) rows = r;
    const per = Math.ceil(n / rows);
    let rowTop = 0; const spans = [];
    for (let r = 0; r < rows; r++) {
      const row = on.slice(r * per, (r + 1) * per); if (!row.length) break;
      const above = Math.max(...row.map(c => c.above)), below = Math.max(...row.map(c => c.below));
      let x = 0; row.forEach(c => { x += c.reachL + G.barW / 2; c.x = x; c.cy = rowTop + above; x += G.barW / 2 + c.reachR + G.gapX; });
      const shift = (x - G.gapX) / 2; row.forEach(c => { c.x -= shift; });
      spans.push({ x0: -shift, x1: x - G.gapX - shift });
      rowTop += above + below + G.rowGap;
    }
    on.forEach(c => {
      let y = c.cy - c.above; c.top = y;
      c.loci.forEach((p, i) => {
        if (i === c.cIdx) y += c.hubH;
        const h = c.hs[i]; p.gx = c.x; p.gy = y + h / 2; y += h;
        placeKids(p);
      });
      if (c.cIdx >= c.loci.length) y += c.hubH;
      c.bot = y;
      if (c.hubOn) { c.hubOn.gx = c.x; c.hubOn.gy = c.cy; placeKids(c.hubOn); }
    });
    // a single brain's hub (and any other self-lobe neuron) sits above the karyogram, the nucleus the chromosomes came out of
    if (!brainsIn) { const hubs = pages.filter(p => isSelf(p) && !isChild(p) && pageOn(p)), span = spans[0] || { x0: 0, x1: 0 }, top = on.length ? Math.min(...on.map(c => c.top)) : 0; hubs.forEach((p, i) => { p.gx = (span.x0 + span.x1) / 2 + (i - (hubs.length - 1) / 2) * 120; p.gy = top - G.hubGap; placeKids(p); }); }
    if (snap) pages.forEach(p => { if (p.gx !== undefined) { p.x = isChild(p) ? p.parent.gx : p.gx; p.y = isChild(p) ? p.parent.gy : p.gy; p.vx = p.vy = 0; } });
  }
  let mouseW = null;                      // cursor in world units, for lobe hover while labels are off
  // tools: 'select' = left-drag draws a marquee and moves neurons; 'pan' = left-drag pans (the classic behaviour)
  let mode = 'select', spaceDown = false;
  const multi = new Set();              // marquee-selected neurons; dragging one moves them all
  let marquee = null;                   // {x0,y0,x1,y1} in screen px while a marquee is open
  let drag = null;                      // {nodes:[{n,x,y}], sx, sy} while neurons are being moved
  let W = 0, H = 0, dpr = 1;
  let activeNodes = [], activeLinks = [];

  // a sub-neuron is shown only while both its own lobe and its parent's lobe are on
  const pageOn = p => lobeOn[p.lobe] && (!p.parent || lobeOn[p.parent.lobe]);
  const visible = n => n.kind === 'page' ? pageOn(n) : n.kind === 'syn' ? pageOn(pageById[n.page]) : n.pageNodes.some(pageOn);
  if (genome()) layoutGenome(true);

  // ---------- simulation ----------
  // a link that leaves a brain's own lobes (into a shared lobe or another brain) is long and slack on the network screen
  const lobeBrain = id => lobeById[id]?.brain || null;
  const crossBrain = l => !!brainsIn && lobeBrain(l.source.lobe) !== lobeBrain(l.target.lobe);
  const linkDist = l => {
    if (l.kind === 'pp') return (l.source.type === 'day' || l.target.type === 'day' ? 170 : crossBrain(l) ? 420 : l.source.lobe !== l.target.lobe ? 200 : 78 + 12 * (5 - Math.min(l.w, 4)) + 30) + explodeF * (orbitR(l.source) + orbitR(l.target)) * 0.7;
    if (l.kind === 'st') return 4 + explodeF * orbitR(l.target);
    if (l.kind === 'sx') return 110;
    if (l.kind === 'sr') return 12 + explodeF * (44 + (l.source.pageNodes.length > 1 ? 30 : 0));
    if (l.kind === 'pc') return 2 + depthF * (childRingR(l.target) + explodeF * orbitR(l.source) * 0.5);
    return 160;
  };
  const linkStrength = l => {
    // in the genome layout every neuron is held at its locus and every synapse at its rung, so connections are drawn but do not pull;
    // only a source's tether to its (first) neuron remains, so the sparks stay with their citation
    if (genome() && l.kind !== 'sr') return 0;
    if (l.kind === 'pp') return l.source.type === 'day' || l.target.type === 'day' ? 0.02 : crossBrain(l) ? 0.015 : l.source.lobe !== l.target.lobe ? 0.08 : 0.3;
    if (l.kind === 'st') return 0.15;
    if (l.kind === 'sx') return 0.03;
    if (l.kind === 'sr') return l.source.pageNodes.length > 1 ? 0.12 : 0.5;
    if (l.kind === 'pc') return 0.6;
    return 0.01;
  };
  const charge = n => genome() ? -2 : n.isCenter ? -1200 : isChild(n) ? -(30 + n.nSyn * 3) * depthF - 1 : -200 - n.nSyn * 7 - n.children.length * 40;
  // pages repel only pages; synapses and sources are held by tethers + collision, so they orbit instead of being blasted away
  const pageCharge = d3.forceManyBody().strength(charge).theta(0.9).distanceMax(900);
  const chargeForce = Object.assign(a => pageCharge(a), { initialize: (nodes, rnd) => pageCharge.initialize(nodes.filter(n => n.kind === 'page'), rnd), strength: f => (pageCharge.strength(f), chargeForce) });
  // genome layout: a folded sub-neuron sits inside its parent, so it must not collide with it until it has unfolded
  const collideR = n => n.kind === 'page' ? (genome() ? (isChild(n) ? depthF : 1) * (n.r + 4) : n.r + 6) : n.kind === 'syn' ? (genome() ? 2.5 : 1 + 4 * explodeF) : 1 + 3.5 * explodeF;
  // page-only collision keeps whole synapse clouds from overlapping once exploded
  const pageCollideR = n => genome() ? (isChild(n) ? depthF : 1) * (n.r + 2) : isChild(n) ? depthF * (n.r + 6 + explodeF * (n.nSyn ? orbitR(n) + 8 : 0)) : n.r + 10 + explodeF * (n.nSyn ? orbitR(n) + 14 : 0) + depthF * (n.children.length ? 20 : 0);
  const pageCollide = d3.forceCollide().radius(pageCollideR).strength(0.7).iterations(2);
  const pageCollideForce = Object.assign(a => pageCollide(a), { initialize: (nodes, rnd) => pageCollide.initialize(nodes.filter(n => n.kind === 'page'), rnd), radius: f => (pageCollide.radius(f), pageCollideForce) });
  // orbit force: each synapse seeks an evenly spaced slot around its neuron (the dandelion explosion)
  function orbitForce(alpha) {
    const st = 0.3 * alpha;
    const g = genome();
    for (const n of activeNodes) {
      if (n.kind !== 'syn') continue;
      const p = pageById[n.page], m = p.nSyn;
      if (g) {   // genome layout: a ladder of synapses on the locus line, to the right of the bar (to the left of a sub-neuron)
        const side = isChild(p) ? -1 : 1;
        const gx = p.x + side * ((p.r * 1.3 + 8 + n.ordinal * SYN_PITCH) * explodeF + 2);
        n.vx += (gx - n.x) * st; n.vy += (p.y - n.y) * st; continue;
      }
      const a = p.spin + (n.ordinal / m) * Math.PI * 2;
      const rr = (orbitR(p) + (n.ordinal % 2 ? 7 : -5)) * explodeF + 2;
      n.vx += (p.x + Math.cos(a) * rr - n.x) * st; n.vy += (p.y + Math.sin(a) * rr - n.y) * st;
    }
  }

  function childOrbitForce(alpha) {
    const st = 0.25 * alpha * depthF;
    if (st <= 0 || genome()) return;   // genome layout: sub-neurons are anchored to their own slot instead
    for (const n of activeNodes) {
      if (!isChild(n)) continue;
      const p = n.parent, m = p.children.length, i = p.children.indexOf(n);
      const a = p.spin + Math.PI / 2 + (i / m) * Math.PI * 2, rr = childRingR(p);
      n.vx += (p.x + Math.cos(a) * rr - n.x) * st; n.vy += (p.y + Math.sin(a) * rr - n.y) * st;
    }
  }
  const lobeSize = {}; pages.forEach(p => { if (!isChild(p)) lobeSize[p.lobe] = (lobeSize[p.lobe] || 0) + 1; });
  // on the shared network screen the lobes hold their ground harder, otherwise the many links into the shared neurons drag every brain into the middle
  // genome layout: every neuron (sub-neurons included) is pulled firmly onto its locus; the lobe anchors are not used
  const anchorX = n => genome() && n.gx !== undefined ? (isChild(n) ? n.parent.gx + depthF * n.gdx : n.gx) : anchor[n.lobe]?.x ?? 0;
  const anchorY = n => genome() && n.gy !== undefined ? (isChild(n) ? n.parent.gy + depthF * n.gdy : n.gy) : anchor[n.lobe]?.y ?? 0;
  const anchorStrength = n => n.kind !== 'page' ? 0 : genome() ? (n.gx !== undefined ? 0.9 : 0) : isChild(n) ? 0.02 : isSelf(n) ? (brainsIn ? 0.9 : 0.6) : n.type === 'day' ? 0.5 : (lobeSize[n.lobe] <= 4 ? 0.55 : lobeSize[n.lobe] <= 10 ? 0.4 : 0.22) * (brainsIn ? 1.7 : 1);
  const sim = d3.forceSimulation()
    .force('link', d3.forceLink().id(d => d.id).distance(linkDist).strength(linkStrength))
    .force('charge', chargeForce)
    .force('collide', d3.forceCollide().radius(collideR).iterations(2))
    .force('orbit', orbitForce)
    .force('childOrbit', childOrbitForce)
    .force('pageCollide', pageCollideForce)
    .force('x', d3.forceX(anchorX).strength(anchorStrength))
    .force('y', d3.forceY(anchorY).strength(anchorStrength))
    .alphaDecay(0.03).velocityDecay(0.35)
    .stop();

  function rebuild(warm) {
    if (genome()) layoutGenome(false);
    const vp = pages.filter(visible);
    const vs = syns.filter(visible);
    const vr = srcs.filter(visible);
    activeNodes = [...vp, ...vs, ...vr];
    const on = new Set(activeNodes);
    // genome layout: a source cited by several neurons would pull them together, so it is tethered to its first neuron only
    const srcT = genome() ? srcTethers.filter(l => l.source.pageNodes.find(on.has, on) === l.target) : srcTethers;
    activeLinks = [...pageLinks, ...childTethers, ...synTethers, ...synCross, ...srcT, ...(showCocite ? cociteLinks : [])]
      .filter(l => on.has(l.source) && on.has(l.target));
    sim.nodes(activeNodes);
    sim.force('link').links(activeLinks);
    if (warm) { sim.alpha(1); for (let i = 0; i < (brainsIn ? 420 : 260); i++) sim.tick(); }
    sim.alpha(warm ? 0.25 : 0.5).restart();
    updateStats();
  }
  // D3 caches per-node strengths/radii when an accessor is set, so re-set them whenever explodeF/depthF move
  function refreshForces() {
    sim.force('link').distance(linkDist).strength(linkStrength); sim.force('charge').strength(charge); sim.force('collide').radius(collideR); sim.force('pageCollide').radius(pageCollideR);
    sim.force('x').x(anchorX).strength(anchorStrength); sim.force('y').y(anchorY).strength(anchorStrength);
  }

  // ---------- canvas ----------
  function resize() {
    const first = W === 0;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    // the karyogram picks its row count from the viewport aspect, so once the shape drifts far from the one it was laid out for (a rotation, or a long window drag) it re-lays out and refits
    if (!first && genome() && Math.abs(W / Math.max(1, H) - layoutAspect) > 0.25) { layoutGenome(false); refreshForces(); rebuild(false); sim.alpha(0.6).restart(); setTimeout(() => fitAll(500), 350); }   // fit once the pages have moved toward the new loci, as the G toggle does
  }
  window.addEventListener('resize', resize);
  resize();

  // panning: wheel and touch always; the mouse pans with the left button in Pan mode, with the middle/right button (or Space) in
  // Select mode, and never when the press lands on a neuron, because that press moves the neuron instead
  const zoom = d3.zoom().scaleExtent([0.08, 9]).on('zoom', ev => { k = ev.transform.k; tx = ev.transform.x; ty = ev.transform.y; updateLevel(); })
    .filter(ev => {
      if (ev.type === 'wheel' || ev.type.startsWith('touch')) return !ev.ctrlKey || ev.type === 'wheel';
      if (ev.type !== 'mousedown') return !ev.button;
      const onNeuron = pick(ev.clientX, ev.clientY)?.kind === 'page';
      if (ev.button === 1 || ev.button === 2) return !onNeuron;
      return ev.button === 0 && (mode === 'pan' || spaceDown) && !onNeuron;
    });
  d3.select(canvas).call(zoom).on('dblclick.zoom', null);

  const toWorld = (sx, sy) => [(sx - tx) / k, (sy - ty) / k];
  const toScreen = (x, y) => [x * k + tx, y * k + ty];

  // the transform that shows the whole brain: data-space margins for the lobe rings, plus screen-space room for the lobe titles,
  // which are drawn at a fixed pixel size and on the network screen sit outside the rings
  function fitTransform() {
    const vp = pages.filter(p => visible(p) && !isChild(p));
    const xs = vp.map(p => p.x), ys = vp.map(p => p.y);
    const mx = genome() ? 120 : brainsIn ? 260 : 150, my = genome() ? 150 : brainsIn ? 260 : 170;
    const minX = Math.min(...xs) - mx, maxX = Math.max(...xs) + mx, minY = Math.min(...ys) - my, maxY = Math.max(...ys) + my;
    const padL = window.innerWidth <= 900 ? 0 : 230; // keep the fitted brain clear of the lobes legend on desktop
    const lx = brainsIn && !genome() ? Math.min(210, W * 0.16) : 0, ly = genome() ? 40 : brainsIn ? 30 : 0;   // pixels reserved for titles beside/above the outer lobes (above the bars in the genome layout)
    const kk = Math.min((W - 60 - padL - 2 * lx) / (maxX - minX), (H - (brainsIn ? 150 : 200) - 2 * ly) / (maxY - minY)) * 0.96;
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    return { kk, tx: padL + (W - padL) / 2 - cx * kk, ty: H / 2 + 12 - cy * kk };
  }
  function fitAll(dur = 900) {
    const { kk, tx, ty } = fitTransform();
    d3.select(canvas).transition().duration(dur).ease(d3.easeCubicInOut).call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(kk));
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

  // ---------- genome layout drawing ----------
  // connections bend in the genome layout: along one chromosome they bow out to the right like a Circos ribbon, between chromosomes they arch
  const ctrlOf = l => {
    if (!genome()) return null;
    const a = l.source, b = l.target, mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    if (sameChromo(a, b)) return [mx + G.barW / 2 + 22 + Math.abs(b.y - a.y) * 0.25, my];
    return [mx, my - Math.min(260, 14 + Math.abs(b.x - a.x) * 0.16)];
  };
  const linkPoint = (l, s, e, t) => { const c = ctrlOf(l); if (!c) return [s.x + (e.x - s.x) * t, s.y + (e.y - s.y) * t]; const u = 1 - t; return [u * u * s.x + 2 * u * t * c[0] + t * t * e.x, u * u * s.y + 2 * u * t * c[1] + t * t * e.y]; };
  // break a chromosome title into up to three lines that fit the column; the last line is cut with an ellipsis
  function wrapTitle(text, maxW, lines = 3) {
    const words = String(text).split(/\s+/), out = []; let cur = '';
    for (const w of words) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width <= maxW || !cur) cur = t; else { out.push(cur); cur = w; } }
    if (cur) out.push(cur);
    if (out.length > lines) { out.length = lines; let last = out[lines - 1]; while (last.length > 1 && ctx.measureText(last + '…').width > maxW) last = last.slice(0, -1); out[lines - 1] = last + '…'; }
    return out;
  }
  function roundRect(x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function drawKaryogram(titleVis, tl) {
    const sw = px => px / k, hw = G.barW / 2;
    const mobile = window.innerWidth <= 900;
    chromos.forEach(c => {
      if (!c.on) return;
      const x = c.x, pTop = c.top, pBot = c.cy - c.hubH / 2, qTop = c.cy + c.hubH / 2, qBot = c.bot;
      const arms = [[pTop, pBot], [qTop, qBot]].filter(([a, b]) => b - a > 1);
      // arms: rounded bars, banded by locus in the lobe colour at alternating density (the G-banding), clipped to the arm shape
      arms.forEach(([a, b]) => {
        roundRect(x - hw, a, G.barW, b - a, hw);
        ctx.fillStyle = rgba(c.color, 0.08); ctx.fill();
        ctx.save(); ctx.clip();
        let y = c.top; c.loci.forEach((p, i) => { if (i === c.cIdx) y += c.hubH; const h = c.hs[i]; if (y < b && y + h > a) { ctx.fillStyle = rgba(lobeColor(p), i % 2 ? 0.30 : 0.14); ctx.fillRect(x - hw, Math.max(y, a), G.barW, Math.min(y + h, b) - Math.max(y, a)); } y += h; });
        ctx.restore();
        roundRect(x - hw, a, G.barW, b - a, hw); ctx.lineWidth = sw(1); ctx.strokeStyle = rgba(c.color, 0.45); ctx.stroke();
      });
      // centromere: a waist between the arms, where the hub neuron sits on a network screen
      if (arms.length === 2) {
        const wy = c.hubH / 2, wx = hw * (c.hubOn ? 0.55 : 0.4);
        ctx.beginPath(); ctx.moveTo(x - hw + sw(0.5), pBot); ctx.bezierCurveTo(x - hw, pBot + wy * 0.6, x - wx, c.cy - wy * 0.35, x - wx, c.cy); ctx.bezierCurveTo(x - wx, c.cy + wy * 0.35, x - hw, qTop - wy * 0.6, x - hw + sw(0.5), qTop);
        ctx.lineTo(x + hw - sw(0.5), qTop); ctx.bezierCurveTo(x + hw, qTop - wy * 0.6, x + wx, c.cy + wy * 0.35, x + wx, c.cy); ctx.bezierCurveTo(x + wx, c.cy - wy * 0.35, x + hw, pBot + wy * 0.6, x + hw - sw(0.5), pBot); ctx.closePath();
        ctx.fillStyle = rgba(c.color, 0.16); ctx.fill(); ctx.lineWidth = sw(1); ctx.strokeStyle = rgba(c.color, 0.45); ctx.stroke();
      }
      // p / q arm marks, like a cytogenetic map
      if (arms.length === 2 && k > 0.42) {
        ctx.font = `500 ${sw(10)}px 'Satoshi', sans-serif`; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillStyle = rgba(c.color, 0.5 * clamp01((k - 0.42) / 0.3));
        ctx.fillText('p', x - hw - sw(6), (pTop + pBot) / 2); ctx.fillText('q', x - hw - sw(6), (qTop + qBot) / 2);
      }
      // title above the bar and a count below it, at screen size like the lobe titles; the hovered chromosome keeps its title while labels are off
      const hovered = mouseW && Math.abs(mouseW[0] - x) < hw + 20 && mouseW[1] > c.top - 30 && mouseW[1] < c.bot + 30;
      const [sx, sy] = toScreen(x, c.top), [, sb] = toScreen(x, c.bot);
      const pitch = (G.barW + G.gapX + c.reachL + c.reachR) * k - 8;
      // chromosome names are the map's axis, so they only dim when labels are off, and fade out once the columns are too tight to hold them
      const v = titleVis * Math.max(tl, hovered ? 1 : 0.55) * (hovered ? 1 : clamp01((pitch - 18) / 26)); if (v < 0.02) return;
      const fs = Math.max(9.5, Math.min(mobile ? 11 : 14, 10 + Math.sqrt(c.loci.length) * 1.2)), fs2 = Math.max(9, fs - 3);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      ctx.font = `600 ${fs}px 'Clash Display', 'Satoshi', sans-serif`; ctx.fillStyle = rgba(c.color, 0.9 * v);
      const lines = wrapTitle(c.name, Math.max(40, pitch)); lines.forEach((ln, i) => ctx.fillText(ln, sx, sy - 10 - (lines.length - 1 - i) * (fs + 2)));
      const subs = d3.sum(c.loci, p => p.children.filter(pageOn).length), syn = d3.sum(c.loci, p => p.nSyn) + (c.hubOn ? c.hubOn.nSyn : 0);
      ctx.font = `500 ${fs2}px 'Satoshi', sans-serif`; ctx.textBaseline = 'top'; ctx.fillStyle = rgba('#a7b2cc', 0.8 * v);
      ctx.fillText(`${c.loci.length + (c.hubOn ? 1 : 0)}${subs ? `+${subs}` : ''} · ${syn}`, sx, sb + 8);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.translate(tx, ty); ctx.scale(k, k);
    });
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  }

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

    const wantL = labelsOn ? 1 : 0;
    if (Math.abs(labelF - wantL) > 0.004) labelF += (wantL - labelF) * 0.18; else labelF = wantL;

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
    const labelOf = n => n === hover ? 1 : labelF;   // the hovered node keeps its label while labels are toggled off

    // viewport culling bounds (world)
    const [vx0, vy0] = toWorld(-80, -80), [vx1, vy1] = toWorld(W + 80, H + 80);
    const inView = (x, y) => x > vx0 && x < vx1 && y > vy0 && y < vy1;

    // genome layout: the karyogram (bars, bands, centromeres, titles) stands in for the lobe halos
    if (genome()) drawKaryogram(clamp01((1.7 - k) / 0.6), labelF);
    // lobe halos
    if (lobeVis > 0 && !genome()) {
      ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      // lobe circles first, so a title can avoid both other titles and other lobes' neurons
      const circles = lobes.filter(l => lobeOn[l.id] && !selfLobe(l)).map(l => {
        const ps = pages.filter(p => p.lobe === l.id); if (!ps.length) return null;
        const cx = d3.mean(ps, p => p.x), cy = d3.mean(ps, p => p.y);
        const rr = Math.max(44, d3.quantile(ps.map(p => Math.hypot(p.x - cx, p.y - cy)).sort(d3.ascending), 0.92) + 48);
        const [sx, sy] = toScreen(cx, cy); return { l, ps, cx, cy, rr, sx, sy, sr: rr * k };
      }).filter(Boolean).sort((a, b) => b.ps.length - a.ps.length);   // big lobes claim their spot first; small ones walk
      const placed = [];   // screen-space label boxes already drawn this frame, so lobe titles never stack on each other
      const hitsBox = b => placed.some(q => b.x < q.x + q.w && b.x + b.w > q.x && b.y < q.y + q.h && b.y + b.h > q.y);
      const hitsCircle = (b, self) => circles.some(c => c !== self && Math.hypot(Math.max(b.x, Math.min(c.sx, b.x + b.w)) - c.sx, Math.max(b.y, Math.min(c.sy, b.y + b.h)) - c.sy) < c.sr * 0.9);
      // the screen area a title may use: right of the lobes legend, below the header, above the hint bar
      const edge = { x0: window.innerWidth <= 900 ? 8 : 238, x1: W - 8, y0: 78, y1: H - 70 };
      const offEdge = b => Math.max(0, edge.x0 - b.x) + Math.max(0, b.x + b.w - edge.x1) + Math.max(0, edge.y0 - b.y) + Math.max(0, b.y + b.h - edge.y1);
      // when every candidate collides, take the one that overlaps least rather than the first
      const penalty = (b, self) => offEdge(b) * 3
        + placed.reduce((a, q) => a + Math.max(0, Math.min(b.x + b.w, q.x + q.w) - Math.max(b.x, q.x)) * Math.max(0, Math.min(b.y + b.h, q.y + q.h) - Math.max(b.y, q.y)) / 40, 0)
        + circles.reduce((a, c) => a + (c === self ? 0 : Math.max(0, c.sr * 0.9 - Math.hypot(Math.max(b.x, Math.min(c.sx, b.x + b.w)) - c.sx, Math.max(b.y, Math.min(c.sy, b.y + b.h)) - c.sy))), 0);
      circles.forEach(c => {
        const { l, ps, cx, cy, rr } = c;
        // network screen: lobe titles shrink as the view zooms out so a dozen lobes can share one screen
        const shrink = brainsIn ? Math.min(1, Math.max(0.5, k / 0.3)) : 1;
        const fs = Math.min(W / (brainsIn ? 36 : 22), 13 + Math.sqrt(ps.length) * 2.4) * shrink, fs2 = Math.max(9.5, Math.min(W / 32, 12) * shrink);
        ctx.beginPath(); ctx.arc(cx, cy, rr, 0, Math.PI * 2);
        ctx.fillStyle = rgba(l.color, 0.05 * lobeVis); ctx.fill();
        ctx.lineWidth = sw(1); ctx.strokeStyle = rgba(l.color, 0.22 * lobeVis); ctx.stroke();
        // labels prefer the outward side of the ring (away from the brain's hub); if that spot is taken they walk around the ring
        const o = hubOf[l.id] || { x: 0, y: 0 }, dl = Math.hypot(cx - o.x, cy - o.y) || 1;
        const a0 = dl > 1 ? Math.atan2(cy - o.y, cx - o.x) : -Math.PI / 2;
        const subs = ps.filter(isChild).length;
        const line2 = `${plural(ps.length - subs, 'neuron')}${subs ? ` · ${plural(subs, 'sub-neuron')}` : ''} · ${plural(d3.sum(ps, p => p.nSyn), 'synapse')}`;
        ctx.font = `600 ${fs}px 'Clash Display', 'Satoshi', sans-serif`; const w1 = ctx.measureText(l.name).width;
        ctx.font = `500 ${fs2}px 'Satoshi', sans-serif`; const w2 = ctx.measureText(line2).width;
        const bw = Math.max(w1, w2), bh = fs + fs2 + 10;
        let best = null, bestPen = Infinity;
        const tries = [0, 0.5, -0.5, 1, -1, 1.5, -1.5, 2, -2, 2.5, -2.5, Math.PI].flatMap(da => [[da, 14], [da, 14 + bh], [da, 14 + 2 * bh]]);   // walk the ring, then rings further out
        tries.sort((p, q) => (Math.abs(p[0]) + p[1] / 40) - (Math.abs(q[0]) + q[1] / 40));
        for (const [da, off] of tries) {
          const ang = a0 + da, ux = Math.cos(ang), uy = Math.sin(ang);
          const [sx, sy] = toScreen(cx + ux * (rr + sw(off)), cy + uy * (rr + sw(off)));
          const align = Math.abs(ux) < 0.35 ? 'center' : ux > 0 ? 'left' : 'right';
          const bx = align === 'center' ? sx - bw / 2 : align === 'left' ? sx : sx - bw, by = uy < -0.35 ? sy - bh : uy > 0.35 ? sy : sy - bh / 2;
          const box = { x: bx, y: by, w: bw, h: bh, sx, sy, align };
          if (!hitsBox(box) && !hitsCircle(box, c) && !offEdge(box)) { best = box; break; }
          const pen = penalty(box, c); if (pen < bestPen) { bestPen = pen; best = box; }
        }
        placed.push(best);
        const tl = Math.max(labelF, mouseW && Math.hypot(mouseW[0] - cx, mouseW[1] - cy) < rr ? 1 : 0);   // hovered lobe keeps its title
        if (tl < 0.02) return;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.textAlign = best.align; ctx.textBaseline = 'top';
        ctx.font = `600 ${fs}px 'Clash Display', 'Satoshi', sans-serif`; ctx.fillStyle = rgba(l.color, 0.85 * lobeVis * tl); ctx.fillText(l.name, best.sx, best.y + 2);
        ctx.font = `500 ${fs2}px 'Satoshi', sans-serif`; ctx.fillStyle = rgba('#a7b2cc', 0.8 * lobeVis * tl); ctx.fillText(line2, best.sx, best.y + fs + 8);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.translate(tx, ty); ctx.scale(k, k);
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
      const base = (0.16 + Math.min(l.w, 6) * 0.045) * (genome() && !sameChromo(l.source, l.target) ? 0.45 : 1);   // genome layout: arches between chromosomes stay faint so the bands read
      const a = (focusSet ? (inFocus ? 0.85 : 0.05) : base) * da;
      const col = l.source.lobe === l.target.lobe ? lobeColor(l.source) : '#b9c4e0';
      ctx.strokeStyle = rgba(col, a);
      ctx.lineWidth = sw(inFocus ? 1.8 : 0.7 + Math.min(l.w, 6) * 0.18);
      ctx.beginPath(); ctx.moveTo(l.source.x, l.source.y);
      const c = ctrlOf(l); if (c) ctx.quadraticCurveTo(c[0], c[1], l.target.x, l.target.y); else ctx.lineTo(l.target.x, l.target.y);
      ctx.stroke();
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
        const [x, y] = linkPoint(p.l, s, e, p.t);
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
        if (srcLabelVis * labelOf(n) > 0.02 && related) {
          ctx.font = `500 ${sw(10)}px 'Satoshi', sans-serif`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
          ctx.fillStyle = rgba('#a7b2cc', 0.9 * srcLabelVis * v * labelOf(n));
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
        // genome layout: the ladder is one row, so labels hang from it at an angle and only for the focused neuron, where the rest of the map is dimmed
        const lv = (genome() ? (focusSet && related ? synLabelVisFocus : 0) : focusSet && related ? Math.max(synLabelVisFocus, synLabelVisAll) : synLabelVisAll) * labelOf(n);
        if (lv > 0.02 && related) {
          const p = pageById[n.page];
          let ang = Math.atan2(n.y - p.y, n.x - p.x), flip = Math.cos(ang) < 0;
          if (genome()) { flip = isChild(p); ang = flip ? -1.0 : 1.0; }   // down-right for a neuron's ladder, down-left for a sub-neuron's
          ctx.save(); ctx.translate(n.x, n.y); ctx.rotate(flip && !genome() ? ang + Math.PI : ang);
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
      // shared neuron: a thin dashed white ring marks ids that also exist in another brain of the network
      if (N && isShared(n)) { ctx.strokeStyle = rgba('#ffffff', 0.45 * a); ctx.lineWidth = sw(0.9); ctx.setLineDash([sw(2.5), sw(2.5)]); ctx.beginPath(); ctx.arc(n.x, n.y, r + sw(3.5), 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
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
      // marquee-selected neurons wear an accent ring; pinned (hand-placed) neurons a faint solid one
      if (multi.has(n) && n !== selected) { ctx.strokeStyle = rgba('#ff8a3d', 0.9); ctx.lineWidth = sw(1.4); ctx.beginPath(); ctx.arc(n.x, n.y, r + sw(8), 0, Math.PI * 2); ctx.stroke(); }
      if (n.pinned) { ctx.strokeStyle = rgba('#ffffff', 0.22 * a); ctx.lineWidth = sw(0.8); ctx.beginPath(); ctx.arc(n.x, n.y, r + sw(12), 0, Math.PI * 2); ctx.stroke(); }
      // label
      const important = isSelf(n) || n.deg >= 18 || n.r > 12.5;
      const lv = (isChild(n) ? childLabelVis : isSelf(n) ? 1 : important ? Math.max(labelVis, clamp01((k - 0.45) / 0.25)) : labelVis) * labelOf(n);
      if (lv > 0.02 && (related || lv > 0.6)) {
        const fs = isSelf(n) ? 15 : isChild(n) ? 10.5 : 12;
        ctx.font = `${isSelf(n) ? 600 : 500} ${sw(fs)}px 'Satoshi', sans-serif`;
        // genome layout: labels sit beside the band like gene annotations (right of a neuron, left of a sub-neuron) and lift above the synapse ladder
        const beside = genome() && !(isSelf(n) && !brainsIn), side = beside ? (isChild(n) ? -1 : 1) : 0;
        const lx = beside ? n.x + side * (r + sw(6)) : n.x, ly = beside ? n.y - explodeF * (n.nSyn ? r * 0.6 + sw(8) : 0) : n.y + r + sw(5);
        ctx.textAlign = beside ? (side > 0 ? 'left' : 'right') : 'center'; ctx.textBaseline = beside ? 'middle' : 'top';
        ctx.fillStyle = rgba('#000000', 0.55 * lv * a); ctx.fillText(n.title, lx + sw(0.8), ly + sw(0.8));
        ctx.fillStyle = rgba(related ? '#f1f4ff' : '#9aa5c2', (related ? 0.95 : 0.5) * lv);
        ctx.fillText(n.title, lx, ly);
      }
    });

    // marquee rectangle (screen space)
    if (marquee) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const x = Math.min(marquee.x0, marquee.x1), y = Math.min(marquee.y0, marquee.y1), w = Math.abs(marquee.x1 - marquee.x0), h = Math.abs(marquee.y1 - marquee.y0);
      ctx.fillStyle = 'rgba(255,138,61,0.08)'; ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = 'rgba(255,138,61,0.8)'; ctx.lineWidth = 1; ctx.setLineDash([5, 4]); ctx.strokeRect(x + 0.5, y + 0.5, w, h); ctx.setLineDash([]);
    }
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
  let downAt = null, downBtn = 0, downShift = false, pressed = null;
  canvas.addEventListener('contextmenu', e => e.preventDefault());   // the right button moves neurons / pans, so no menu
  window.addEventListener('keydown', e => { if (e.code === 'Space' && !e.target.closest('input')) { spaceDown = true; canvas.classList.add('space'); } });
  window.addEventListener('keyup', e => { if (e.code === 'Space') { spaceDown = false; canvas.classList.remove('space'); } });
  canvas.addEventListener('pointerdown', e => {
    if (e.pointerType === 'touch') return;                            // touch is pan/pinch via d3-zoom
    downAt = [e.clientX, e.clientY]; downBtn = e.button; downShift = e.shiftKey; pressed = pick(e.clientX, e.clientY);
    const onNeuron = pressed?.kind === 'page';
    // mouse3 (middle or right button) on a neuron picks it up; in Select mode the left button does too
    if (onNeuron && (e.button === 1 || e.button === 2 || (e.button === 0 && mode === 'select' && !spaceDown))) {
      const group = multi.has(pressed) ? [...multi] : [pressed];
      drag = { nodes: group.map(n => ({ n, x: n.x, y: n.y })), sx: e.clientX, sy: e.clientY, moved: false };
      canvas.setPointerCapture(e.pointerId); canvas.classList.add('moving'); tip.hidden = true;
    } else if (!onNeuron && e.button === 0 && mode === 'select' && !spaceDown) {
      marquee = { x0: e.clientX, y0: e.clientY, x1: e.clientX, y1: e.clientY };
      canvas.setPointerCapture(e.pointerId);
    } else canvas.classList.add('grabbing');
  });
  canvas.addEventListener('pointerup', e => {
    canvas.classList.remove('grabbing'); canvas.classList.remove('moving');
    const small = downAt && Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) < 5;
    if (drag) {
      if (drag.moved) { drag.nodes.forEach(({ n }) => { n.pinned = true; n.fx = n.x; n.fy = n.y; }); sim.alpha(Math.max(sim.alpha(), 0.2)).restart(); }
      else if (downBtn === 0) clickNeuron(pressed, downShift);
      else if (!multi.has(pressed)) { multi.clear(); multi.add(pressed); updateHint(); }   // a plain mouse3 click just picks the neuron for moving
      drag = null;
    } else if (marquee) {
      if (!small) finishMarquee(downShift); else { if (!downShift) { multi.clear(); clearSelection(); } updateHint(); }
      marquee = null;
    } else if (small && downBtn === 0) { const n = pick(e.clientX, e.clientY); n ? clickNeuron(n, downShift) : (multi.clear(), clearSelection(), updateHint()); }
    downAt = null; pressed = null;
  });
  function clickNeuron(n, shift) {
    if (n.kind === 'page' && shift) { multi.has(n) ? multi.delete(n) : multi.add(n); updateHint(); return; }
    if (n.kind === 'page' && !multi.has(n)) multi.clear();
    select(n); updateHint();
  }
  function finishMarquee(shift) {
    const x0 = Math.min(marquee.x0, marquee.x1), x1 = Math.max(marquee.x0, marquee.x1), y0 = Math.min(marquee.y0, marquee.y1), y1 = Math.max(marquee.y0, marquee.y1);
    if (!shift) multi.clear();
    for (const n of activeNodes) {
      if (n.kind !== 'page' || (isChild(n) && depthF < 0.5)) continue;
      const [sx, sy] = toScreen(n.x, n.y);
      if (sx >= x0 && sx <= x1 && sy >= y0 && sy <= y1) multi.add(n);
    }
    if (multi.size === 1) select([...multi][0], { noZoom: true });
    else if (multi.size > 1 && selected && !multi.has(selected)) clearSelection();
    updateHint();
  }
  function releaseAll() {
    pages.forEach(n => { if (n.pinned) { n.pinned = false; if (n !== selected) { n.fx = null; n.fy = null; } } });
    sim.alpha(0.5).restart(); updateHint();
  }
  function setMode(m) { mode = m; canvas.classList.toggle('select', m === 'select'); document.querySelectorAll('.tool-mode').forEach(b => b.classList.toggle('on', b.dataset.mode === m)); updateHint(); }
  canvas.addEventListener('pointermove', e => {
    if (drag) {
      const dx = (e.clientX - drag.sx) / k, dy = (e.clientY - drag.sy) / k;
      if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) >= 3) drag.moved = true;
      if (!drag.moved) return;
      drag.nodes.forEach(({ n, x, y }) => { n.fx = n.x = x + dx; n.fy = n.y = y + dy; n.vx = n.vy = 0; });
      if (sim.alpha() < 0.12) sim.alpha(0.12).restart();   // let synapses, sources and sub-neurons follow their neuron
      return;
    }
    if (marquee) { marquee.x1 = e.clientX; marquee.y1 = e.clientY; return; }
    if (downAt) return;
    mouseW = toWorld(e.clientX, e.clientY);
    const n = pick(e.clientX, e.clientY);
    if (n !== hover) {
      hover = n; canvas.classList.toggle('pointer', !!n);
      if (n) { tip.hidden = false; tip.innerHTML = tipHtml(n); if (n.kind === 'page') n.neighbors.slice(0, 4).forEach(x => spawnPulse(x.l, true)); }
      else tip.hidden = true;
    }
    if (n) { tip.style.left = Math.min(e.clientX, W - 300) + 'px'; tip.style.top = Math.min(e.clientY, H - 90) + 'px'; }
  });
  canvas.addEventListener('pointerleave', () => { hover = null; mouseW = null; tip.hidden = true; });
  function tipHtml(n) {
    if (n.kind === 'page') return `<span class="k">${isChild(n) ? `sub-neuron of ${esc(n.parent.title)}` : typeName(n) + ' · ' + esc(lobeById[n.lobe].name)}</span><b>${esc(n.title)}</b>${n.nSyn} synapses · ${n.neighbors.length} connections${n.children.length ? ` · ${n.children.length} sub-neurons` : ''}`;
    if (n.kind === 'syn') return `<span class="k">synapse of ${esc(pageById[n.page].title)}</span><b>${esc(n.lead)}</b>${esc(n.text.slice(0, 140))}${n.text.length > 140 ? '…' : ''}`;
    return `<span class="k">${srcKind(n)}</span><b>${esc(n.label)}</b>cited by ${n.pageNodes.length} neuron${n.pageNodes.length > 1 ? 's' : ''}`;
  }
  const srcKind = n => ({ session: 'Perplexity session', github: D.demo ? 'Code host (demo)' : 'GitHub', web: 'Web source', gmail: 'Gmail (metadata)', calendar: 'Google Calendar', spotify: 'Spotify', plaid: 'Bank data (names only)', memory: 'Memory note', wiki: 'Brain page' }[n.kindOf] || 'Source');
  const typeName = n => esc({ project: 'project', entity: 'person / thing', person: 'person', place: 'place', habit: 'habit', event: 'event', account: 'account', trip: 'trip', preference: 'preference', day: D.dayName || 'dream log', audit: 'audit' }[n.type] || n.type || '');
  const pw = (n, w) => w + (n === 1 ? '' : 's');
  const plural = (n, w) => `${n} ${pw(n, w)}`;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const panel = document.getElementById('panel'), panelBody = document.getElementById('panel-body');
  document.getElementById('panel-close').addEventListener('click', clearSelection);
  window.addEventListener('keydown', e => {
    if (e.target.closest('input')) return;
    if (e.key === 'Escape') { clearSelection(); hideResults(); multi.clear(); marquee = null; updateHint(); }
    else if (e.key === 'v' || e.key === 'V') setMode('select');
    else if (e.key === 'h' || e.key === 'H') setMode('pan');
    else if (e.key === 'r' || e.key === 'R') releaseAll();
    else if (e.key === 'l' || e.key === 'L') setLabels(!labelsOn);
    else if (e.key === 'g' || e.key === 'G') setLayout(genome() ? 'neural' : 'genome');
  });

  function select(n, opts = {}) {
    if (selected && selected.kind === 'page' && !selected.pinned) { selected.fx = null; selected.fy = null; }
    selected = n; pulseSyn = null;
    if (n.kind === 'page' && !isChild(n) && !genome()) { n.fx = n.x; n.fy = n.y; }   // sub-neurons stay free so they can reach their ring slot; in the genome layout the locus holds it
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
    if (n.kind === 'page' && history.replaceState) history.replaceState(null, '', '#n=' + encodeURIComponent(n.id) + (genome() ? '&layout=genome' : ''));
  }
  function clearSelection() { if (selected && selected.kind === 'page' && !selected.pinned) { selected.fx = null; selected.fy = null; } selected = null; pulseSyn = null; panel.hidden = true; }

  function renderPanel(n) {
    const col = lobeColor(n);
    let h = '';
    if (n.kind === 'page') {
      h += `<div class="kind"><span class="sw" style="background:${col};color:${col}"></span>${typeName(n)} · ${esc(lobeById[n.lobe].name)}</div>`;
      h += `<h2>${esc(n.title)}</h2><p class="desc">${esc(n.desc || n.intro)}</p>`;
      h += `<div class="meta">${n.updated ? `<span>updated ${n.updated}</span>` : ''}<span>${n.nSyn} synapses</span><span>${n.neighbors.length} connections</span><span>${n.srcNodes.length} sources</span></div>`;
      const ob = otherBrains(n.id);
      if (brainsIn && n.brain && N && !ob.length) { const b = N.brains.find(x => x.id === n.brain); if (b) h += `<h3>Brain</h3><ul><li class="nb net"><a href="${esc(b.href)}#n=${encodeURIComponent(n.orig || n.id)}"><span class="sw" style="background:${esc(b.color)}"></span><span class="t">Open in the ${esc(b.title)} brain<span class="note">this neuron belongs to ${esc(b.title)} → open</span></span></a></li></ul>`; }
      if (ob.length) h += `<h3>Shared across the network</h3><ul>` + ob.map(b => `<li class="nb net"><a href="${esc(b.href)}#n=${encodeURIComponent(n.id)}"><span class="sw" style="background:${esc(b.color)}"></span><span class="t">Same neuron in ${esc(b.title)}<span class="note">${b.synapses} synapses · ${b.connections} connections there → open</span></span></a></li>`).join('') + `</ul>`;
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
      ensureVisible(s); pulseSyn = s; zoomTo(s, Math.max(k, 3.4), 800);
      // same folded-child recentering as select(): the synapse moves while its sub-neuron unfolds
      if (isChild(pageById[s.page]) && depthF < 0.97) setTimeout(() => { if (pulseSyn === s) zoomTo(s, Math.max(k, 3.4), 700); }, 900);
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
  // tool buttons live above the zoom controls; injected so every brain page gets them without markup changes
  const tools = document.createElement('div'); tools.id = 'tools'; tools.className = 'zoom-ctl tools'; tools.setAttribute('role', 'group'); tools.setAttribute('aria-label', 'Tools');
  tools.innerHTML = `<button class="tool-mode on" data-mode="select" title="Select & move (V): drag a box to select neurons, drag neurons to move them; mouse3 or Space pans" aria-label="Select and move tool">⬚</button>
    <button class="tool-mode" data-mode="pan" title="Pan (H): drag to pan the view" aria-label="Pan tool">✋</button>
    <button id="release-pins" title="Release hand-placed neurons (R)" aria-label="Release hand-placed neurons">⟲</button>
    <button id="labels-toggle" title="Labels on/off (L): when off, only the neuron or lobe under the cursor keeps its label" aria-label="Toggle labels" aria-pressed="true"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12V5a2 2 0 0 1 2-2h7l9 9-9 9-9-9z"/><circle cx="7.5" cy="7.5" r="1.2" fill="currentColor" stroke="none"/></svg></button>
    <button id="layout-toggle" title="Genome layout (G): arrange the brain like a karyogram — lobes or brains as chromosomes, neurons as bands, the hub at the centromere" aria-label="Toggle genome layout" aria-pressed="false"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 3.5c-1.6 0-2.5 1-2.5 2.5v3.6c0 1 .7 1.6 1.4 2.1-.7.5-1.4 1.1-1.4 2.1V18c0 1.5.9 2.5 2.5 2.5s2.5-1 2.5-2.5v-4.2c0-1-.7-1.6-1.4-2.1.7-.5 1.4-1.1 1.4-2.1V6c0-1.5-.9-2.5-2.5-2.5z"/><path d="M17 3.5c-1.6 0-2.5 1-2.5 2.5v5.2c0 1 .7 1.6 1.4 2.1-.7.5-1.4 1.1-1.4 2.1V18c0 1.5.9 2.5 2.5 2.5s2.5-1 2.5-2.5v-2.6c0-1-.7-1.6-1.4-2.1.7-.5 1.4-1.1 1.4-2.1V6c0-1.5-.9-2.5-2.5-2.5z"/><path d="M4.5 7.5h5M4.5 16h5M14.5 8.5h5M14.5 17h5"/></svg></button>
    <button id="shot" title="Screenshot (S): save the current view as a PNG" aria-label="Save a screenshot"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.5"/></svg></button>`;
  document.getElementById('zoom-ctl').before(tools);
  tools.querySelectorAll('.tool-mode').forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
  document.getElementById('release-pins').addEventListener('click', releaseAll);
  // labels toggle: a tool button and a switch in the lobes panel drive the same state
  const switches = document.querySelector('#lobes .switches');
  if (switches) {
    const g = document.createElement('label'); g.className = 'switch'; g.innerHTML = '<input type="checkbox" id="layout-genome"><span>Genome layout</span>'; switches.prepend(g);
    const l = document.createElement('label'); l.className = 'switch'; l.innerHTML = '<input type="checkbox" id="labels" checked><span>Labels</span>'; switches.prepend(l);
  }
  // layout switch: a tool button, a switch in the lobes panel and the G key drive the same state; the hash carries it so a link can open the karyogram
  function setLayout(l, opts = {}) {
    if (l !== 'genome' && l !== 'neural') return;
    const changed = l !== layout; layout = l;
    const b = document.getElementById('layout-toggle'); b.classList.toggle('on', genome()); b.setAttribute('aria-pressed', String(genome()));
    const c = document.getElementById('layout-genome'); if (c) c.checked = genome();
    if (!changed) return;
    // hand-placed pins would fight the loci, so both directions start from free neurons; the selected neuron keeps its pin in the neural layout
    pages.forEach(n => { n.pinned = false; n.fx = null; n.fy = null; });
    if (genome()) layoutGenome(false); else if (selected && selected.kind === 'page' && !isChild(selected)) { selected.fx = selected.x; selected.fy = selected.y; }
    refreshForces(); rebuild(false); sim.alpha(0.9).restart();
    if (history.replaceState) { const h = location.hash.replace(/[#&]layout=genome\b/, '').replace(/^&/, '#'); history.replaceState(null, '', (genome() ? (h.length > 1 ? h + '&' : '#') + 'layout=genome' : h) || location.pathname + location.search); }
    if (!opts.silent) { flash(genome() ? 'genome layout · chromosomes are lobes, bands are neurons, the hub sits at the centromere' : 'neural layout'); if (!opts.noFit) setTimeout(() => { clearSelection(); fitAll(1100); }, 350); }
    updateHint();
  }
  document.getElementById('layout-toggle').addEventListener('click', () => setLayout(genome() ? 'neural' : 'genome'));
  document.getElementById('layout-genome')?.addEventListener('change', e => setLayout(e.target.checked ? 'genome' : 'neural'));
  if (genome()) setLayout('genome', { silent: true });   // initial state from MINDBLOWN_OPTIONS or the hash, without the toast
  function setLabels(on) {
    labelsOn = on;
    const b = document.getElementById('labels-toggle'); b.classList.toggle('off', !on); b.setAttribute('aria-pressed', String(on));
    const c = document.getElementById('labels'); if (c) c.checked = on;
    flash(on ? 'labels on' : 'labels off · hover a neuron or lobe to read it');
  }
  if (!labelsOn) { const b = document.getElementById('labels-toggle'); b.classList.add('off'); b.setAttribute('aria-pressed', 'false'); const c = document.getElementById('labels'); if (c) c.checked = false; }   // initial state from MINDBLOWN_OPTIONS, without the toast
  document.getElementById('labels-toggle').addEventListener('click', () => setLabels(!labelsOn));
  document.getElementById('labels')?.addEventListener('change', e => setLabels(e.target.checked));
  // screenshot: the canvas on the page background, with a small caption; saved as PNG
  function screenshot() {
    const out = document.createElement('canvas'); out.width = canvas.width; out.height = canvas.height;
    const o = out.getContext('2d');
    const g = o.createRadialGradient(out.width / 2, out.height * 0.45, 0, out.width / 2, out.height * 0.45, Math.max(out.width, out.height) * 0.7);
    g.addColorStop(0, '#0e1322'); g.addColorStop(1, '#06080f'); o.fillStyle = g; o.fillRect(0, 0, out.width, out.height);
    o.drawImage(canvas, 0, 0);
    const title = (document.querySelector('.brand .title') || {}).textContent || 'MindBlown';
    o.setTransform(dpr, 0, 0, dpr, 0, 0); o.textBaseline = 'alphabetic'; o.textAlign = 'left';
    o.font = `500 ${12}px 'Satoshi', sans-serif`; o.fillStyle = 'rgba(167,178,204,0.85)';
    o.fillText(`${title} · ${levelText.textContent} · ${new Date().toISOString().slice(0, 10)}`, 16, H - 14);
    const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '').replace(/^(\d{8})(\d{4})$/, '$1-$2');
    const name = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${stamp}.png`;
    out.toBlob(blob => {
      if (!blob) { flash('screenshot failed'); return; }
      const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000); flash(`saved ${name}`);
    }, 'image/png');
  }
  document.getElementById('shot').addEventListener('click', screenshot);
  window.addEventListener('keydown', e => { if ((e.key === 's' || e.key === 'S') && !e.target.closest('input') && !e.metaKey && !e.ctrlKey) screenshot(); });
  // a short message in the level pill's hint slot
  let flashT = 0;
  function flash(msg) { hint.textContent = msg; clearTimeout(flashT); flashT = setTimeout(() => updateHint(), 2200); }

  canvas.classList.add('select');
  const levelText = document.getElementById('level-text'), levelDot = document.querySelector('#level .dot'), hint = document.getElementById('hint');
  function updateLevel() {
    const lvl = forceExplode || k >= 1.5 ? 'Synapses' : hasSubs && k >= 0.85 ? 'Sub-neurons' : k >= 0.6 ? 'Neurons' : 'Lobes';
    levelText.textContent = lvl + ` · ${k.toFixed(1)}×`;
    const c = lvl === 'Synapses' ? '#ffffff' : lvl === 'Sub-neurons' ? '#fbbf24' : lvl === 'Neurons' ? '#ff8a3d' : '#4fd1c5';
    levelDot.style.background = c; levelDot.style.boxShadow = `0 0 12px ${c}`;
    updateHint(lvl);
  }
  function updateHint(lvl) {
    lvl = lvl || (forceExplode || k >= 1.5 ? 'Synapses' : hasSubs && k >= 0.85 ? 'Sub-neurons' : k >= 0.6 ? 'Neurons' : 'Lobes');
    const pinned = pages.filter(n => n.pinned).length;
    if (multi.size > 1) { hint.textContent = `${multi.size} neurons selected · drag one to move them all · Shift+click adds · Esc clears${pinned ? ' · R releases pins' : ''}`; return; }
    if (pinned && lvl === 'Lobes') { hint.textContent = `${plural(pinned, 'neuron')} placed by hand · R releases them`; return; }
    if (lvl === 'Lobes') { hint.textContent = genome() ? 'genome layout · each bar is a lobe, each band a neuron · G returns to the neural layout' : mode === 'select' ? 'scroll to zoom · drag to select · mouse3 or Space to pan · drag a neuron to move it · G for genome layout' : 'scroll to zoom · drag to pan · click a neuron · V for select mode · G for genome layout'; return; }
    hint.textContent = lvl === 'Lobes' ? 'scroll to zoom · drag to pan · click a neuron' : lvl === 'Neurons' ? (hasSubs ? 'keep zooming: sub-neurons unfold at 0.85×, synapses at 1.5×' : 'keep zooming: synapses explode at 1.5×') : lvl === 'Sub-neurons' ? 'small satellites are sub-neurons · zoom past 1.5× to explode synapses' : 'dots are synapses · diamonds are sources · dashed lines fire across neurons';
  }
  function updateStats() {
    const vp = pages.filter(visible);
    const subs = vp.filter(isChild).length;
    document.getElementById('stats').innerHTML = `<b>${vp.length - subs}</b> ${pw(vp.length - subs, 'neuron')}${subs ? ` · <b>${subs}</b> ${pw(subs, 'sub-neuron')}` : ''} · <b>${d3.sum(vp, p => p.nSyn)}</b> ${pw(d3.sum(vp, p => p.nSyn), 'synapse')}<br><b>${activeLinks.filter(l => l.kind === 'pp').length}</b> ${pw(activeLinks.filter(l => l.kind === 'pp').length, 'connection')} · <b>${srcs.filter(visible).length}</b> ${pw(srcs.filter(visible).length, 'source')}`;
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
    const { kk, tx, ty } = fitTransform();
    d3.select(canvas).call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(kk * 0.6));
    d3.select(canvas).transition().duration(1600).ease(d3.easeCubicOut).call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(kk));
  })();
  updateLevel();
  requestAnimationFrame(draw);
  document.fonts?.ready.then(() => document.getElementById('loading').classList.add('done'));
  setTimeout(() => document.getElementById('loading').classList.add('done'), 1500);
  // deep link from another brain or a shared URL: #n=<page id>
  const openHash = () => { const m = /[#&]n=([^&]+)/.exec(location.hash); if (!m) return; const n = pageById[decodeURIComponent(m[1])]; if (n) { ensureVisible(n); select(n); } };
  setTimeout(openHash, 1700);
  window.addEventListener('hashchange', openHash);
  // read-only hooks for the QA scripts in tools/ (screen position of a neuron, current marquee selection)
  window.MINDBLOWN_QA = { screenOf: id => { const n = pageById[id]; return n ? toScreen(n.x, n.y) : null; }, selection: () => [...multi].map(n => n.id), pinned: () => pages.filter(n => n.pinned).map(n => n.id), mode: () => mode, labels: () => labelsOn, layout: () => layout, setLayout: l => setLayout(l, { noFit: true }), chromosomes: () => chromos.filter(c => c.on).map(c => ({ id: c.id, x: c.x, top: c.top, bot: c.bot, loci: c.loci.map(p => p.id), hub: c.hubOn ? c.hubOn.id : null })), screenshot };
})();
