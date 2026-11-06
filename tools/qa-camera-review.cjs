// Targeted regressions for the sibling review findings. Run beside qa-zoom.cjs.
// Usage: node tools/qa-camera-review.cjs <brain-url>
const assert = require('node:assert/strict');
const pw = (() => { try { return require('playwright'); } catch { return require(require.resolve('playwright', { paths: ['/home/user/workspace/mindblown-demo-qa/node_modules', require('child_process').execSync('npm root -g').toString().trim()] })); } })();
const { chromium } = pw;
const url = process.argv[2];
if (!url) throw new Error('Pass a brain URL');
const camera = p => p.evaluate(() => MINDBLOWN_RENDERER.camera());
const home = async p => {
  // A CDP viewport acknowledgement can precede the page's resize event.
  // Let that event and any mapped-layout refit run before sampling ownership.
  await p.waitForTimeout(1000);
  await p.waitForFunction(() => {
    const c = MINDBLOWN_RENDERER.camera();
    return c.home && c.atHome && !c.homing && Math.abs(c.k - c.home.kk) < 1e-6 &&
      Math.abs(c.tx - c.home.tx) < 0.5 && Math.abs(c.ty - c.home.ty) < 0.5;
  }, null, { timeout: 12000 });
};
async function resizedHome(p, before, size) {
  await p.waitForFunction(({ width, height }) => innerWidth === width && innerHeight === height, size, { timeout: 15000 });
  await home(p);
  const after = await camera(p);
  assert.ok(after.bounds && after.fittedFree, 'read-only fitted geometry exists');
  for (const key of ['l', 'r', 't', 'b']) assert.ok(Math.abs(after.fittedFree[key] - after.free[key]) < 0.5, 'fit uses the resized free area');
  assert.ok(Math.abs((after.bounds.x0 + after.bounds.x1) / 2 * after.k + after.tx - after.free.cx) < 1 &&
    Math.abs((after.bounds.y0 + after.bounds.y1) / 2 * after.k + after.ty - after.free.cy) < 1, 'fitted layout geometry is centred in the resized free area');
  assert.ok(Math.abs(after.home.kk - before.kk) > 1e-8 ||
    Math.abs(after.home.tx - before.tx) > 0.5 || Math.abs(after.home.ty - before.ty) > 0.5, 'resize computes a new fit, not a stale Home');
  const visibility = await p.evaluate(() => {
    const R = MINDBLOWN_RENDERER, F = R.camera().free;
    const points = R.nodes().map(n => R.screenOf(n.id)).filter(Boolean);
    return { n: points.length, off: points.filter(q => q[0] < F.l || q[0] > F.r || q[1] < F.t || q[1] > F.b).length };
  });
  assert.ok(visibility.n > 0 && visibility.off === 0, 'new Home fits visible neurons inside the resized free area');
}
(async () => {
  const browser = await chromium.launch({ channel: 'chromium' });
  const errors = [];
  try {
    for (const touch of [false, true]) {
      const ctx = await browser.newContext({ viewport: touch ? { width: 390, height: 844 } : { width: 1366, height: 800 }, hasTouch: touch, isMobile: touch });
      const p = await ctx.newPage();
      p.on('pageerror', e => errors.push(String(e)));
      p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
      await p.goto(`${url}#layout=orbit`, { waitUntil: 'commit' });
      await p.waitForFunction(() => window.MINDBLOWN_RENDERER?.camera().homing, null, { timeout: 30000 });
      const initialHome = (await camera(p)).home;
      const resized = touch ? { width: 412, height: 915 } : { width: 1024, height: 768 };
      await p.setViewportSize(resized);
      await resizedHome(p, initialHome, resized);
      console.log(`PASS ${touch ? 'phone' : 'desktop'}: resize during Home animation retargets`);
      const invalidViews = await p.evaluate(() => {
        const Q = MINDBLOWN_QA, R = MINDBLOWN_RENDERER, snapshot = Q.captureLayout('QA invalid scale');
        return [undefined, null, 'invalid', 0, -1, NaN, Infinity].map(k => {
          const s = structuredClone(snapshot);
          s.view = k === undefined ? {} : { ...snapshot.view, k };
          const before = R.camera(), accepted = Q.applyLayout(s), after = R.camera();
          return accepted && before.k === after.k && before.tx === after.tx && before.ty === after.ty;
        });
      });
      assert.ok(invalidViews.every(Boolean), 'missing, nonnumeric, zero, negative and nonfinite saved scales preserve the camera');
      await p.evaluate(() => {
        const s = MINDBLOWN_QA.captureLayout('QA positive scale');
        s.view.k = MINDBLOWN_RENDERER.camera().kMin / 10;
        if (!MINDBLOWN_QA.applyLayout(s)) throw new Error('valid saved layout rejected');
      });
      await p.waitForTimeout(1000);
      const restored = await camera(p);
      assert.ok(Math.abs(restored.k - restored.kMin) < 1e-6, 'valid positive saved scale is clamped to the live floor');
      console.log(`PASS ${touch ? 'phone' : 'desktop'}: invalid saved scale preserves view; valid scale clamps to floor`);
      for (const layout of ['neural', 'orbit', 'table', 'coil']) {
        await p.goto('about:blank');
        await p.goto(`${url}#layout=${layout}`);
        await home(p);
        await p.waitForTimeout(600);
        // Pick visible empty canvas, not a neuron, title, legend or rail.
        const point = await p.evaluate(() => {
          const R = MINDBLOWN_RENDERER, F = R.camera().free;
          const points = R.nodes().map(n => R.screenOf(n.id)).filter(Boolean);
          for (let y = F.t + 25; y < F.b - 15; y += 20)
            for (let x = F.l + 25; x < F.r - 15; x += 20)
              if (document.elementFromPoint(x, y)?.tagName === 'CANVAS' && points.every(q => Math.hypot(q[0] - x, q[1] - y) > 25)) return { x, y };
          return null;
        });
        assert.ok(point, 'empty canvas target exists');
        await p.keyboard.press('h');
        if (touch) await p.touchscreen.tap(point.x, point.y);
        else await p.mouse.click(point.x, point.y);
        await p.waitForTimeout(400);
        assert.ok((await camera(p)).atHome, `${layout}: empty press preserves Home`);
        const size = p.viewportSize();
        const before = (await camera(p)).home;
        const nextSize = { width: size.width + 10, height: size.height };
        await p.setViewportSize(nextSize);
        await resizedHome(p, before, nextSize);
        assert.ok((await camera(p)).atHome, `${layout}: resize after empty tap follows Home`);
        // Same-sized viewport notifications during focus must not stop the zoom
        // or schedule a late aspect refit (Orbit/Table/Coil used to do both).
        await p.evaluate(() => {
          const R = MINDBLOWN_RENDERER;
          R.focus(R.nodes()[0].id);
          for (const delay of [50, 100, 200]) setTimeout(() => {
            window.visualViewport?.dispatchEvent(new Event('resize'));
            window.dispatchEvent(new Event('resize'));
          }, delay);
        });
        await p.waitForTimeout(2000);   // child focus can schedule a second 700 ms zoom at 900 ms
        let c = await camera(p);
        assert.ok(c.k >= 2.5 && !c.atHome && !c.homing, `${layout}: unchanged viewport preserves completed selection zoom (${c.k})`);
        await p.waitForTimeout(700);
        const later = await camera(p);
        assert.ok(Math.abs(later.k - c.k) < 1e-6 && Math.abs(later.tx - c.tx) < 0.01 && Math.abs(later.ty - c.ty) < 0.01,
          `${layout}: no delayed forced Home or camera translation`);
        console.log(`PASS ${touch ? 'phone' : 'desktop'} ${layout}: empty tap, viewport-only selection zoom, no stale-aspect refit`);
      }
      await ctx.close();
    }
    assert.deepEqual(errors, []);
    console.log('PASS no page or console errors');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
