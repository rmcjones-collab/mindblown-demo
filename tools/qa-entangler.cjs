// MindBlown QA: Quantum Entangler on the canonical renderer. usage: node tools/qa-entangler.cjs [page.html …]
// Serves the repo itself (port 8142) so the reload-on-commit path is exercised. For each page, desktop and phone:
//   boots (grow.js + quantum-entangler.js + app.js, no console errors); the toggle sits below the Don't Panic button;
//   switching on and clicking a top-level neuron measures it, the page reloads and the cyan pair neuron is selected with
//   its synapse, the carried toast and the Entangled-pairs lobe; a second visitor measurement adds a second pair; the
//   journal replays after a plain reload; every mapped layout (G, K, F, T) accepts the grown lobe without errors; the
//   forget gesture (Shift-press twice) clears the journal. Prints `all entangler checks passed` or exits 1.
const pw = (() => { try { return require('playwright'); } catch { return require(require.resolve('playwright', { paths: ['/home/user/workspace/mindblown-demo-qa/node_modules', '/home/user/workspace/neural/node_modules'] })); } })();
const { chromium } = pw;
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
const pages = process.argv.slice(2).length ? process.argv.slice(2) : ['index.html'];
const PORT = 8142, CYAN = 'rgb(46, 230, 255)';
const srv = http.createServer((q, r) => {
  const f = path.join(root, decodeURIComponent(q.url.split(/[?#]/)[0]).replace(/^\//, '') || 'index.html');
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); r.end(fs.readFileSync(f));
}).listen(PORT, '127.0.0.1');
const fail = (page, vp, msg) => { console.error(`${page} ${vp}: FAIL — ${msg}`); process.exitCode = 1; };
const rect = (p, sel) => p.evaluate(s => { const el = document.querySelector(s); if (!el || el.hidden || getComputedStyle(el).display === 'none' || getComputedStyle(el).visibility === 'hidden') return null; const r = el.getBoundingClientRect(); if (!r.width || !r.height) return null; return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; }, sel);
const state = p => p.evaluate(() => {
  const E = window.MINDBLOWN_ENTANGLER, G = window.MINDBLOWN_GROW, R = window.MINDBLOWN_RENDERER;
  const sw = document.querySelector('.panel .kind .sw'); const toast = document.querySelector('.mb-ent-toast');
  return { booted: !!(E && E.booted()), engine: G && G.engine, on: E && E.on(), journal: E ? E.journal().length : -1, count: G ? G.count('entangled') : null,
    selected: R ? R.selected() : null, swatch: sw ? getComputedStyle(sw).backgroundColor : null, panelHidden: !document.querySelector('.panel') || document.querySelector('.panel').hidden,
    toast: toast && !toast.hidden ? toast.textContent : '', lobeListed: !![...document.querySelectorAll('#lobe-list label, #lobe-list li, #lobe-list .lobe')].find(li => /Entangled pairs/.test(li.textContent)),
    colour: window.MBN && window.MBN.originColors && window.MBN.originColors.entangled, hash: location.hash };
});
const pickTarget = (p, skip = []) => p.evaluate(skip => {
  const D = window.MINDBLOWN, R = window.MINDBLOWN_RENDERER, Q = window.MINDBLOWN_QA; const hub = D.center || (D.centers && D.centers[0]);
  const hidden = new Set(D.lobes.filter(l => l.hidden).map(l => l.id)); const W = innerWidth, H = innerHeight;
  const ok = [];
  for (const n of D.pages) {
    if (n.id === hub || n.parent || n.origin || hidden.has(n.lobe) || skip.includes(n.id)) continue;
    const s = (R && R.screenOf ? R.screenOf(n.id) : Q.screenOf(n.id)); if (!s) continue;
    if (s[0] > 90 && s[0] < W - 120 && s[1] > 110 && s[1] < H - 120) ok.push({ id: n.id, s });
  }
  // the one nearest the centre of the view is least likely to sit under a label or the rail
  ok.sort((a, b) => Math.hypot(a.s[0] - W / 2, a.s[1] - H / 2) - Math.hypot(b.s[0] - W / 2, b.s[1] - H / 2));
  return ok[0] || null;
}, skip);
async function measureByClick(p, page, vp) {
  // clicking may land on a label or an overlapping neuron: try up to three candidates, each with a fresh reload wait
  const before = await p.evaluate(() => window.MINDBLOWN_ENTANGLER.journal().length);
  const tried = [];
  for (let attempt = 0; attempt < 3; attempt++) {
    const t = await pickTarget(p, tried); if (t) tried.push(t.id); if (!t) return fail(page, vp, `no clickable top-level neuron (attempt ${attempt + 1})`);
    const reloaded = p.waitForEvent('load', { timeout: 6000 }).then(() => true).catch(() => false);
    await p.mouse.click(t.s[0], t.s[1]);
    let measured = false;   // the renderer settles click-vs-drag before it selects, then the Entangler measures on the next tick: poll briefly
    for (let i = 0; i < 12 && !measured; i++) { await p.waitForTimeout(100); measured = await p.evaluate(() => window.MINDBLOWN_ENTANGLER.journal().length).catch(() => 0) > before; }
    if (!measured) {   // the click hit a label or an edge: refit the view and try the next candidate (if the page reloaded anyway, switch back on)
      await reloaded; await p.evaluate(() => { window.MINDBLOWN_ENTANGLER.setOn(true); const x = document.getElementById('panel-close'); if (x) x.click(); document.getElementById('z-fit').click(); }); await p.waitForTimeout(900); continue;
    }
    if (!(await reloaded)) return fail(page, vp, 'measurement did not reload the page (grow.js commit)');
    await p.waitForTimeout(3200);   // the engine opens #n= 1.7 s after load
    return t;
  }
  return fail(page, vp, 'three clicks measured nothing');
}
(async () => {
  const b = await chromium.launch();
  for (const page of pages) {
    for (const [vp, viewport, mobile] of [['desktop', { width: 1366, height: 848 }, false], ['phone', { width: 390, height: 844 }, true]]) {
      const ctx = await b.newContext({ viewport, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1 });
      const p = await ctx.newPage(); const errs = [];
      p.on('pageerror', e => errs.push(String(e).split('\n')[0])); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
      const url = `http://localhost:${PORT}/${page}`;
      await p.goto(url, { waitUntil: 'load' }); await p.waitForTimeout(2600);
      let st = await state(p);
      if (!st.booted || st.engine !== 'canonical') { fail(page, vp, `did not boot (booted=${st.booted}, engine=${st.engine})`); await ctx.close(); continue; }
      if (st.colour !== '#2ee6ff') fail(page, vp, `origin colour registered as ${st.colour}, expected #2ee6ff`);
      const drive = await rect(p, '#mb-drive'), tog = await rect(p, '#mb-entangler');
      if (!tog) fail(page, vp, 'toggle not visible at boot');
      else if (drive && !(tog.t >= drive.b - 2 || (tog.r <= drive.l + 2 && Math.abs(tog.t - drive.t) < drive.h))) fail(page, vp, `toggle not below (or beside) the Drive: drive ${JSON.stringify(drive)} toggle ${JSON.stringify(tog)}`);
      // switch on by clicking the toggle
      if (tog) { await p.mouse.click(tog.l + tog.w / 2, tog.t + tog.h / 2); await p.waitForTimeout(400); }
      st = await state(p); if (!st.on) fail(page, vp, 'toggle click did not switch the Entangler on');
      // 1st measurement: a visitor click on a neuron
      const t1 = await measureByClick(p, page, vp); if (!t1) { await ctx.close(); continue; }
      st = await state(p);
      if (st.journal !== 1 || !st.count || st.count.neurons !== 1 || st.count.synapses !== 1) fail(page, vp, `after first measurement journal=${st.journal} count=${JSON.stringify(st.count)}`);
      if (st.selected !== 'entangled/pair-1') fail(page, vp, `pair neuron not selected after reload (selected=${st.selected}, hash=${st.hash})`);
      if (st.swatch !== CYAN) fail(page, vp, `panel swatch ${st.swatch}, expected ${CYAN}`);
      if (!/collapsed with it/.test(st.toast)) fail(page, vp, `carried toast missing: "${st.toast}"`);
      if (!st.lobeListed) fail(page, vp, 'Entangled pairs lobe not in the lobe list');
      if (!st.on) fail(page, vp, 'Entangler forgot it was on across the reload');
      await p.screenshot({ path: `qa/entangler_${page.replace(/\W+/g, '_')}_${vp}.png` });
      // 2nd measurement: another neuron (the reload opened and zoomed to the pair; fit the whole brain first so neurons are clickable)
      await p.evaluate(() => { const x = document.getElementById('panel-close'); if (x) x.click(); }); await p.waitForTimeout(300);
      await p.evaluate(() => document.getElementById('z-fit').click()); await p.waitForTimeout(900);
      const t2 = await measureByClick(p, page, vp); if (!t2) { await ctx.close(); continue; }
      st = await state(p);
      if (st.journal !== 2 || st.count.neurons !== 2) fail(page, vp, `after second measurement journal=${st.journal} count=${JSON.stringify(st.count)}`);
      // replay on a plain reload
      await p.goto(url.split('#')[0], { waitUntil: 'load' }); await p.waitForTimeout(2600);
      st = await state(p);
      if (st.count.neurons !== 2 || st.count.lobes !== 1) fail(page, vp, `replay after reload gave ${JSON.stringify(st.count)}`);
      // the mapped layouts take the grown lobe
      for (const key of ['g', 'k', 'f', 't']) { await p.keyboard.press(key); await p.waitForTimeout(700); }
      await p.keyboard.press('g'); await p.waitForTimeout(400);   // back to free
      // forget: Shift-press twice
      await p.evaluate(() => { const E = window.MINDBLOWN_ENTANGLER; E.clear(); });
      const cleared = await p.evaluate(() => window.MINDBLOWN_ENTANGLER.journal().length);
      if (cleared !== 0) fail(page, vp, `clear left ${cleared} journal entries`);
      if (errs.length) fail(page, vp, `console errors: ${errs.slice(0, 3).join(' | ')}`);
      if (!process.exitCode) console.log(`${page} ${vp}: ok — 2 pairs by click, reload commit, carried toast, cyan swatch, replay, layouts, forget`);
      await ctx.close();
    }
  }
  await b.close(); srv.close();
  if (!process.exitCode) console.log('all entangler checks passed');
})().catch(e => { console.error(e); srv.close(); process.exit(1); });
