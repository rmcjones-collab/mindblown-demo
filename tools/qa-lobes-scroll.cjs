// Scrolling regression only; this does not certify the full publication gate.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const url = process.argv[2];
if (!url) throw new Error('Usage: node tools/qa-lobes-scroll.cjs <brain-url>');
(async () => {
  const browser = await chromium.launch({ channel: 'chromium', headless: true });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    for (const viewport of [
      { width: 1440, height: 900 }, { width: 1280, height: 500 },
      { width: 375, height: 667 }, { width: 667, height: 375 },
      { width: 844, height: 390 }, { width: 568, height: 320 },
      { width: 320, height: 568 }
    ]) {
      await page.setViewportSize(viewport);
      await page.goto(url, { waitUntil: 'load' });
      await page.locator('#lobe-list .lobe').first().waitFor({ state: 'attached' });
      // The owl must not intercept the collapsed header or expanded panel.
      const clearDock = () => page.waitForFunction(() => {
        const dock = document.getElementById('mb-rando-dock');
        const lobes = document.getElementById('lobes');
        if (!dock || !lobes) return false;
        const a = dock.getBoundingClientRect(), b = lobes.getBoundingClientRect();
        return a.left >= 0 && a.right <= innerWidth && a.top >= 0 && a.bottom <= innerHeight &&
          (a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
      }, null, { timeout: 3000 });
      await clearDock();
      if (viewport.width <= 900) await page.locator('.lobes-head').click();
      await clearDock();
      // Synthetic fixture exists only in this isolated test page, never saved.
      await page.evaluate(() => {
        const list = document.querySelector('#lobe-list');
        for (let i = 0; i < 100; i++) {
          const row = document.createElement('button');
          row.className = 'lobe';
          row.textContent = `QA lobe ${i}`;
          row.id = `qa-lobe-${i}`;
          list.append(row);
        }
        const switches = document.querySelector('#lobes .switches');
        for (let i = 0; i < 16; i++) {
          const label = document.createElement('label');
          label.className = 'switch';
          const input = document.createElement('input');
          input.type = 'checkbox'; input.id = `qa-option-${i}`;
          const text = document.createElement('span');
          text.textContent = `QA option ${i}`;
          label.append(input, text); switches.append(label);
        }
      });
      assert.ok(await page.locator('#lobe-list').evaluate(el => el.clientHeight >= 64),
        'long options must not collapse the lobe list');
      await page.locator('#qa-lobe-99').scrollIntoViewIfNeeded();
      await page.locator('#qa-lobe-99').click({ timeout: 5000 });
      await page.locator('#lobes').evaluate(panel => { panel.scrollTop = 0; });
      assert.equal(await page.locator('#lobes').evaluate(panel => panel.scrollTop), 0);
      assert.ok(await page.locator('#lobes').evaluate(panel => panel.scrollHeight > panel.clientHeight),
        'stress options must overflow the panel');
      // A short phone can place the floating Randonaut shortcut over one corner.
      // Use a genuinely exposed point, not force/DOM scrolling, so this still tests real wheel input.
      const point = await page.locator('#lobes').evaluate(panel => {
        const r = panel.getBoundingClientRect();
        for (const fy of [0.3, 0.6, 0.8]) for (const fx of [0.7, 0.5, 0.3]) {
          const x = r.left + r.width * fx, y = r.top + r.height * fy;
          if (document.elementFromPoint(x, y)?.closest('#lobes') === panel) return { x, y };
        }
        return null;
      });
      assert.ok(point, 'Lobes must expose a real pointer target for scrolling');
      await page.mouse.move(point.x, point.y);
      await page.mouse.wheel(0, 2000);
      await page.waitForFunction(() => {
        const panel = document.querySelector('#lobes');
        return panel.scrollTop > 0;
      }, null, { timeout: 5000 });
      for (const checkbox of await page.locator('#lobes input[type=checkbox]').all()) {
        const old = await checkbox.isChecked();
        await checkbox.setChecked(!old, { timeout: 5000 });
        assert.equal(await checkbox.isChecked(), !old);
        await checkbox.setChecked(old, { timeout: 5000 });
      }
      await page.locator('#qa-option-15').scrollIntoViewIfNeeded();
      assert.equal(await page.locator('#qa-option-15').evaluate(el => {
        const r = el.getBoundingClientRect();
        const p = document.querySelector('#lobes').getBoundingClientRect();
        return r.top >= Math.max(0, p.top) && r.bottom <= Math.min(innerHeight, p.bottom);
      }), true, 'last checkbox must be within the visible panel and viewport');
      console.log(`PASS ${viewport.width}x${viewport.height}: last lobe + every checkbox reachable`);
    }
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
