// MindBlown QA: the camera. Home centring at open, the scale floor, settle-to-Home after wheel / pinch / the − button, rotation.
// usage: node tools/qa-zoom.cjs <url> [layout ...]      (layouts default to neural genome table tree coil orbit; pass 'neural' alone for a network page)
const pw = (() => { try { return require('playwright'); } catch { return require(require.resolve('playwright', { paths: ['/home/user/workspace/mindblown-demo-qa/node_modules', require('child_process').execSync('npm root -g').toString().trim()] })); } })();
const { chromium } = pw;
const url = process.argv[2], layouts = process.argv.slice(3).length ? process.argv.slice(3) : ['neural', 'genome', 'table', 'tree', 'coil', 'orbit'];
const VIEWS = [[1366, 800, false], [1920, 1080, false], [1024, 768, false], [390, 844, true], [412, 915, true], [844, 390, true]];
let fails = 0;
const check = (ok, what) => { if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${what}`); };
const near = (a, b, eps) => Math.abs(a - b) <= eps;
const cam = p => p.evaluate(() => window.MINDBLOWN_RENDERER.camera());
const onScreen = p => p.evaluate(() => { const R = window.MINDBLOWN_RENDERER, F = R.camera().free; const pts = R.nodes().map(n => R.screenOf(n.id)).filter(Boolean); return { n: pts.length, off: pts.filter(q => q[0] < F.l || q[0] > F.r || q[1] < F.t || q[1] > F.b).length }; });
/** Wait beyond the scheduled resize refit, then require a resting, stable Home camera. */
async function waitForHome(p) {
  await p.waitForTimeout(1000);   // mapped resize schedules 350 ms + 500 ms; atHome alone is not transition completion
  await p.waitForFunction(() => {
    const c = window.MINDBLOWN_RENDERER.camera(), h = c.home, now = performance.now();
    const at = h && c.atHome && !c.homing && Math.abs(c.k / h.kk - 1) < 1e-5 && Math.abs(c.tx - h.tx) < 0.5 && Math.abs(c.ty - h.ty) < 0.5;
    const old = window.__qaHomeStable;
    if (!at || !old || Math.abs(old.k - c.k) > 1e-6 || Math.abs(old.tx - c.tx) > 0.1 || Math.abs(old.ty - c.ty) > 0.1) {
      window.__qaHomeStable = { k: c.k, tx: c.tx, ty: c.ty, since: now }; return false;
    }
    return now - old.since >= 150;
  }, null, { timeout: 10000, polling: 'raf' });
}
// a real two-finger pinch over CDP (synthesizePinchGesture arrives as ctrl+wheel in headless Chromium, which is the trackpad path, not touch)
async function pinch(cdp, cx, cy, from, to, steps = 12) {
  const pts = d => [{ x: cx - d / 2, y: cy, id: 1 }, { x: cx + d / 2, y: cy, id: 2 }];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pts(from) });
  for (let i = 1; i <= steps; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pts(from + (to - from) * i / steps) }); await new Promise(r => setTimeout(r, 16)); }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}
const atHome = (c, eps = 1) => c.home && near(c.k, c.home.kk, c.home.kk * 0.01) && near(c.tx, c.home.tx, eps) && near(c.ty, c.home.ty, eps);
(async () => {
  const b = await chromium.launch({ channel: 'chromium' });
  for (const layout of layouts) for (const [w, h, touch] of VIEWS) {
    const tag = `${layout} ${w}x${h}${touch ? ' touch' : ''}`;
    const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch, deviceScaleFactor: touch ? 3 : 1 });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
    p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    // the first camera frame: sampled by an init script before the intro has moved anything
    await p.addInitScript(() => {
      // Sample synchronously when the renderer is published. RAF polling can
      // miss the first frame on a busy runner and observe a later intro frame.
      Object.defineProperty(window, 'MINDBLOWN_RENDERER', {
        configurable: true,
        set(R) {
          Object.defineProperty(window, 'MINDBLOWN_RENDERER', { value: R, configurable: true, writable: true });
          window.__firstCam = R.camera();
        }
      });
    });
    await p.goto(`${url}#layout=${layout}`); await waitForHome(p);
    let c = await cam(p), s = await onScreen(p);
    check(c.home && c.atHome && atHome(c), `${tag}: at Home after the intro (k ${c.k.toFixed(3)}, floor ${c.kMin.toFixed(3)})`);
    check(c.home && near(c.kMin, c.home.kk * 0.75, 1e-8), `${tag}: floor is exactly 75 % of Home`);
    check(s.n > 0 && s.off === 0, `${tag}: every visible neuron on screen at Home (${s.n - s.off}/${s.n})`);
    const f = await p.evaluate(() => window.__firstCam);
    // the same world point sits at the free centre in the first frame and at Home, at 60 % of Home's scale
    if (f && f.home) { const F = f.free; check(near(f.k, f.home.kk * 0.6, 1e-6) && near((F.cx - f.tx) / f.k, (F.cx - f.home.tx) / f.home.kk, 0.5) && near((F.cy - f.ty) / f.k, (F.cy - f.home.ty) / f.home.kk, 0.5), `${tag}: first frame is 60 % of Home about Home's centre`); }
    else check(false, `${tag}: first frame sampled`);
    // Start above Home: a disconnected wheel/pinch handler must fail this test.
    for (let i = 0; i < 2; i++) { await p.locator('#z-in').click(); await p.waitForTimeout(400); }
    c = await cam(p);
    check(c.k > c.home.kk * 2 && !c.atHome, `${tag}: gesture starts zoomed above Home`);
    const { cx, cy } = c.free;
    if (!touch) { await p.mouse.move(cx, cy); for (let i = 0; i < 40; i++) await p.mouse.wheel(0, 300); }
    else { const cdp = await ctx.newCDPSession(p); for (let i = 0; i < 3; i++) { await pinch(cdp, cx, cy, 140, 40); await p.waitForTimeout(120); } }
    let settled = true; try { await waitForHome(p); } catch { settled = false; }
    c = await cam(p); s = await onScreen(p);
    check(settled && atHome(c) && s.off === 0, `${tag}: ${touch ? 'pinch' : 'wheel'} out settles on Home (k ${c.k.toFixed(3)} vs ${c.home.kk.toFixed(3)}, off screen ${s.off})`);
    // zoom in on a far neuron, then back out with the − button
    const far = await p.evaluate(() => { const R = window.MINDBLOWN_RENDERER, c = document.querySelector('canvas'); let best = null, d = -1; R.nodes().forEach(n => { const q = R.screenOf(n.id); if (!q) return; const dd = Math.hypot(q[0] - c.clientWidth / 2, q[1] - c.clientHeight / 2); if (dd > d) { d = dd; best = n.id; } }); return best; });
    await p.evaluate(id => window.MINDBLOWN_RENDERER.focus(id), far); await p.waitForTimeout(1400); c = await cam(p);
    check(c.k >= 2.5 && !c.atHome, `${tag}: focus on a far neuron zooms in (k ${c.k.toFixed(2)})`);
    await p.keyboard.press('Escape'); await p.waitForTimeout(150);   // the phone details sheet covers the rail; Escape closes it and keeps the camera where it is
    const presses = Math.ceil(Math.log(c.k / c.kMin) / Math.log(1.6)) + 1;
    for (let i = 0; i < presses; i++) { await p.click('#z-out'); await p.waitForTimeout(380); }
    await waitForHome(p); c = await cam(p);
    check(atHome(c), `${tag}: ${presses} presses of − return to Home (k ${c.k.toFixed(3)})`);
    // rotation / resize before any gesture lands on the new Home, on a fresh document (focus wrote #n= into this one, and a hash-only goto would not reload it)
    const p2 = await ctx.newPage(); p2.on('pageerror', e => errs.push(String(e)));
    p2.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await p2.goto(`${url}#layout=${layout}`); await waitForHome(p2);
    await p2.setViewportSize({ width: h, height: w });
    // headless mobile emulation shrink-to-fits the old layout and animates the viewport back over several seconds; a phone relays out at once. Wait for the real size, then for the camera.
    const sized = await p2.waitForFunction(([W, H]) => innerWidth === W && innerHeight === H, [h, w], { timeout: 15000 }).then(() => true, () => false);
    const rested = sized && await waitForHome(p2).then(() => true, () => false);
    c = await cam(p2); s = await onScreen(p2);
    check(sized && rested && c.atHome && atHome(c) && s.off === 0, `${tag}: rotated to ${h}x${w} lands on the new Home (${sized ? '' : 'viewport never reached that size; '}${rested ? '' : 'camera did not settle; '}off screen ${s.off})`);
    check(errs.length === 0, `${tag}: no page or console errors${errs.length ? ' — ' + errs.join(' | ') : ''}`);
    await ctx.close();
  }
  await b.close();
  console.log(fails ? `\n${fails} check(s) failed` : '\nall camera checks passed');
  process.exit(fails ? 1 : 0);
})();
