// Phones: an open details panel (bottom sheet) must not be covered by the Randonaut launcher docked on the rail.
// Opens a neuron from search, asserts #panel-close is the topmost element at its own centre and closes the panel, then that the
// launcher is visible and clickable again. Console and page errors fail the run.
// usage: node tools/qa-phone-panel-close.cjs <brain-url> <search-term> [--require-launcher]
//   --require-launcher fails when #mb-rando-dock is missing, or never docks on the rail in any viewport (pages using the shared launcher);
//   without it, standalone-control pages pass. Whenever the launcher is docked on the rail it must be hidden while the panel is open.
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const requireLauncher = args.includes('--require-launcher');
const [url, term] = args.filter(a => a !== '--require-launcher');
if (!url || !term) { console.error('usage: node tools/qa-phone-panel-close.cjs <brain-url> <search-term> [--require-launcher]'); process.exit(2); }
const VIEWPORTS = [[390, 844], [375, 667], [844, 390], [667, 375]];
(async () => {
  const browser = await chromium.launch({ headless: true });
  let failed = 0, docked = 0;
  try {
    for (const [width, height] of VIEWPORTS) {
      const page = await browser.newPage({ viewport: { width, height } });
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
      const tag = `${width}x${height}`;
      try {
        await page.goto(url, { waitUntil: 'load' });
        await page.waitForFunction(() => document.getElementById('loading')?.classList.contains('done'));
        await page.waitForTimeout(1500);
        await page.locator('#q').fill(term);
        await page.locator('#results li').first().click();
        await page.waitForFunction(() => !document.getElementById('panel').hidden, null, { timeout: 4000 })
          .catch(() => { throw new Error('details panel did not open from search: ' + term); });
        await page.locator('#q').fill('');
        await page.locator('#q').blur();
        const top = await page.evaluate(() => {
          const c = document.getElementById('panel-close').getBoundingClientRect();
          const hit = document.elementFromPoint(c.left + c.width / 2, c.top + c.height / 2);
          return hit && (hit.id || hit.closest('[id]')?.id || hit.tagName);
        });
        if (top !== 'panel-close') throw new Error('close button covered by ' + top);
        const open = await page.evaluate(() => { const d = document.getElementById('mb-rando-dock'); return d ? { rail: d.classList.contains('mb-in-rail'), vis: getComputedStyle(d).visibility } : null; });
        if (open && open.rail) { docked++; if (open.vis !== 'hidden') throw new Error('rail launcher is ' + open.vis + ' while the panel is open'); }
        await page.locator('#panel-close').click({ timeout: 4000 });
        await page.waitForFunction(() => document.getElementById('panel').hidden, null, { timeout: 3000 });
        const dock = page.locator('#mb-rando-dock');
        if (!(await dock.count()) && requireLauncher) throw new Error('shared launcher #mb-rando-dock is missing');
        if (await dock.count()) {
          const vis = await dock.evaluate(d => getComputedStyle(d).visibility);
          if (vis !== 'visible') throw new Error('launcher stays ' + vis + ' after the panel closes');
          const rp = page.locator('#mb-rando-panel');
          if (await rp.count()) await rp.waitFor({ state: 'hidden', timeout: 3000 });
          await dock.click({ timeout: 4000 });
          await rp.waitFor({ state: 'visible', timeout: 3000 }).catch(() => { throw new Error('launcher click did not open #mb-rando-panel'); });
        }
        if (errors.length) throw new Error(errors.join(' | '));
        console.log('PASS', tag);
      } catch (e) {
        failed++;
        console.log('FAIL', tag, String(e.message).split('\n')[0]);
      } finally { await page.close(); }
    }
  } finally { await browser.close(); }
  if (requireLauncher && !docked) { failed++; console.log('FAIL launcher never docked on the rail, so hide-while-open was not exercised'); }
  process.exit(failed ? 1 : 0);
})();
