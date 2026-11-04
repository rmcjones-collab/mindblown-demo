// MindBlown QA: NNCCG phase 0 (Charts drawer + lobe wiring matrix). Same script for the canonical renderer and the Neural engine.
// usage: node tools/qa-nnccg.cjs http://localhost:8124/index.html
// Checks: drawer opens by C / button / #chart=, matrix is symmetric and matches the dataset, hiding a lobe removes its row,
// the PNG export downloads, Escape closes and clears the hash, the mobile bottom sheet fits, zero console errors.
// Writes qa/<page>_nnccg_{desktop,lobe-off,mobile}.png and prints `errors: []` on success.
const { chromium } = require('playwright');
const fs = require('fs');
const url = process.argv[2] || 'http://localhost:8124/index.html';
const tag = (url.split('/').pop() || 'index').replace(/\.html.*$/, '') || 'index';
fs.mkdirSync('qa', { recursive: true });
const fail = [];
const ready = p => p.waitForFunction(() => !!window.MINDBLOWN_NNCCG, null, { timeout: 20000 }).catch(() => {});   // heavy brains finish booting after networkidle
const check = (ok, msg) => { if (!ok) fail.push(msg); console.log((ok ? 'ok   ' : 'FAIL ') + msg); };
(async () => {
  const browser = await chromium.launch();
  const errs = [];
  const watch = p => { p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); };

  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  let page = await ctx.newPage(); watch(page);
  await page.goto(url, { waitUntil: 'networkidle' }); await ready(page); await page.waitForTimeout(1500);
  const info = await page.evaluate(() => { const N = window.MINDBLOWN_NNCCG; return N ? { engine: N.engine, types: N.types, defs: N.defs().map(d => d.id), open: N.isOpen() } : null; });
  check(!!info, 'MINDBLOWN_NNCCG present');
  if (!info) { await browser.close(); console.log('errors:', JSON.stringify(errs)); process.exit(1); }
  console.log('engine:', info.engine, 'types:', info.types.join(','), 'defs:', info.defs.join(','));
  check(!info.open, 'drawer starts closed');
  check(await page.locator('#rail #view-tools #nnccg-open').count() === 1 && await page.locator('#lobes #nnccg-open').count() === 0, 'Charts button lives in the rail View group, not in Lobes');

  await page.mouse.click(720, 880); await page.keyboard.press('c'); await page.waitForTimeout(400);
  check(await page.evaluate(() => window.MINDBLOWN_NNCCG.isOpen()), 'C key opens the drawer');
  check(/chart=nn-lobe-matrix/.test(await page.evaluate(() => location.hash)), 'opening writes #chart=');
  const r = await page.evaluate(() => window.MINDBLOWN_NNCCG.result());
  const expect = await page.evaluate(() => {   // independent recount from the raw dataset and the renderer's lobe state
    const D = window.MINDBLOWN, on = new Map(window.MINDBLOWN_RENDERER.lobes().map(l => [l.id, l.on])), byId = new Map(D.pages.map(p => [p.id, p]));
    const ok = p => p && on.get(p.lobe) && (!p.parent || !byId.has(p.parent) || on.get(byId.get(p.parent).lobe));
    let total = 0; for (const l of D.links) { const a = byId.get(l.s), b = byId.get(l.t); if (ok(a) && ok(b) && a !== b) total++; } return { total };
  });
  check(r && r.lobes.length > 0, `matrix has lobes (${r && r.lobes.length})`);
  check(r && r.matrix.every((row, i) => row.every((v, j) => v === r.matrix[j][i])), 'matrix is symmetric');
  const upper = r ? r.matrix.reduce((s, row, i) => s + row.reduce((t, v, j) => t + (j >= i ? v : 0), 0), 0) : -1;
  check(r && r.total === expect.total && upper === expect.total, `link total matches dataset (${r && r.total} / ${upper} / ${expect.total})`);
  const summary = await page.evaluate(() => window.MINDBLOWN_NNCCG.summary());
  check(/^Lobe wiring matrix: \d+ lobes, \d+ links/.test(summary || ''), 'aria summary: ' + summary);
  await page.screenshot({ path: `qa/${tag}_nnccg_desktop.png` });

  // hover tooltip + click a cell focuses its busiest neuron
  const box = await page.locator('.nnccg-card canvas').first().boundingBox();
  const hit = await page.evaluate(() => { const r = window.MINDBLOWN_NNCCG.result(); for (let i = 0; i < r.matrix.length; i++) for (let j = 0; j < r.matrix.length; j++) if (r.matrix[i][j]) return { i, j, n: r.matrix.length }; return null; });
  if (hit && box) {
    // cell geometry is not exposed; probe the lower-right region of the canvas for a non-empty cell
    let shown = false;
    for (let f = 0.95; f > 0.35 && !shown; f -= 0.05) { await page.mouse.move(box.x + box.width * f, box.y + box.height * f); await page.waitForTimeout(60); shown = await page.locator('.nnccg-tip').isVisible(); }
    check(shown, 'hovering a cell shows the tooltip');
  }

  // PNG export
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 5000 }).catch(() => null), page.locator('.nnccg-shot').first().click()]);
  check(!!dl && /\.png$/.test(dl.suggestedFilename()), 'PNG export downloads ' + (dl ? dl.suggestedFilename() : '(none)'));

  // hiding a lobe removes its row
  const target = r && r.lobes[r.lobes.length - 1];
  if (target) {
    const btn = page.locator(`#lobe-list .lobe[data-id="${target}"]`);
    if (await btn.count()) {
      await btn.click(); await page.waitForTimeout(500);
      const r2 = await page.evaluate(() => window.MINDBLOWN_NNCCG.result());
      check(!r2.lobes.includes(target) && r2.lobes.length === r.lobes.length - 1, `hiding lobe "${target}" removes its row`);
      await page.screenshot({ path: `qa/${tag}_nnccg_lobe-off.png` });
      await btn.click(); await page.waitForTimeout(500);
      const r3 = await page.evaluate(() => window.MINDBLOWN_NNCCG.result());
      check(r3.lobes.includes(target), 'showing it again restores the row');
    } else check(false, 'lobe button for ' + target + ' not found');
  }

  await page.keyboard.press('Escape'); await page.waitForTimeout(250);
  check(!(await page.evaluate(() => window.MINDBLOWN_NNCCG.isOpen())), 'Escape closes the drawer');
  check(!/chart=/.test(await page.evaluate(() => location.hash)), 'closing clears #chart=');
  await page.close();

  // deep link
  page = await ctx.newPage(); watch(page);
  const sep = url.includes('#') ? '&' : '#';
  await page.goto(url + sep + 'chart=nn-lobe-matrix', { waitUntil: 'networkidle' }); await ready(page); await page.waitForTimeout(500);
  check(await page.evaluate(() => window.MINDBLOWN_NNCCG && window.MINDBLOWN_NNCCG.isOpen()), '#chart=nn-lobe-matrix opens the drawer on load');
  await page.close();

  // mobile bottom sheet
  const m = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  page = await m.newPage(); watch(page);
  await page.goto(url + sep + 'chart=nn-lobe-matrix', { waitUntil: 'networkidle' }); await ready(page); await page.waitForTimeout(1500);
  const mb = await page.locator('#nnccg-drawer').boundingBox();
  check(!!mb && mb.x >= 0 && mb.x + mb.width <= 391 && mb.y + mb.height <= 845 && mb.y > 200, `mobile sheet fits the viewport (${mb && [mb.x, mb.y, mb.width, mb.height].map(Math.round).join(',')})`);
  await page.screenshot({ path: `qa/${tag}_nnccg_mobile.png` });
  const rb = await page.locator('#rail #nnccg-open').boundingBox();
  check(!!rb && await page.locator('#rail #nnccg-open').isVisible() && rb.x >= 0 && rb.x + rb.width <= 391 && rb.y >= 0 && rb.y + rb.height <= 845, `phone rail shows the Charts button (${rb && [rb.x, rb.y, rb.width, rb.height].map(Math.round).join(',')})`);
  await browser.close();
  console.log('errors:', JSON.stringify(errs));
  process.exit(errs.length || fail.length ? 1 : 0);
})();
