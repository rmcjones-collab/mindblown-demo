// Targeted regressions for the sibling review findings. Run beside qa-zoom.cjs.
// Usage: node tools/qa-camera-review.cjs <brain-url>
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const url = process.argv[2];
if (!url) throw new Error('Pass a brain URL');
const camera = p => p.evaluate(() => MINDBLOWN_RENDERER.camera());
const home = p => p.waitForFunction(() => {
  const c = MINDBLOWN_RENDERER.camera();
  return c.home && c.atHome && !c.homing && Math.abs(c.k - c.home.kk) < 1e-6;
}, null, { timeout: 12000 });
(async () => {
  const browser = await chromium.launch({ channel: 'chromium' });
  const errors = [];
  try {
    for (const touch of [false, true]) {
      const ctx = await browser.newContext({ viewport: touch ? { width: 390, height: 844 } : { width: 1366, height: 800 }, hasTouch: touch, isMobile: touch });
      const p = await ctx.newPage();
      p.on('pageerror', e => errors.push(String(e)));
      p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
      await p.goto(`${url}#layout=neural`, { waitUntil: 'commit' });
      await p.waitForFunction(() => window.MINDBLOWN_RENDERER?.camera().homing, null, { timeout: 30000 });
      const resized = touch ? { width: 412, height: 915 } : { width: 1024, height: 768 };
      await p.setViewportSize(resized);
      await p.waitForFunction(({ width, height }) => innerWidth === width && innerHeight === height, resized, { timeout: 15000 });
      await home(p);
      assert.ok((await camera(p)).atHome, 'resize during intro lands on the new Home');
      console.log(`PASS ${touch ? 'phone' : 'desktop'}: resize during Home animation retargets`);
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
        await p.setViewportSize({ width: size.width + 10, height: size.height });
        await home(p);
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
        assert.ok(Math.abs((await camera(p)).k - c.k) < 1e-6, `${layout}: no delayed forced Home (${c.k} -> ${(await camera(p)).k})`);
        console.log(`PASS ${touch ? 'phone' : 'desktop'} ${layout}: empty tap, viewport-only selection zoom, no stale-aspect refit`);
      }
      await ctx.close();
    }
    assert.deepEqual(errors, []);
    console.log('PASS no page or console errors');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
