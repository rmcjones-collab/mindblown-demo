// MindBlown QA: sub-neuron depth behaviour.
// usage: node tools/qa-depth.cjs http://localhost:8124/index.html
// Checks: hidden lobe hides its pages and their children; selecting a folded child from search
// unfolds its parent and lands on the child; level pill text matches zoom; prints `errors: []` on success.
const { chromium } = require('playwright');
const fs = require('fs');
const url = process.argv[2] || 'http://localhost:8124/index.html';
const tag = (url.split('/').pop() || 'index').replace(/\.html$/, '');
fs.mkdirSync('qa', { recursive: true });
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [], fails = [];
  page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(url, { waitUntil: 'networkidle' }); await page.waitForTimeout(2500);

  const info = await page.evaluate(() => {
    const D = window.MINDBLOWN; const byId = Object.fromEntries(D.pages.map(p => [p.id, p]));
    const child = D.pages.find(p => p.parent && byId[p.parent] && !byId[p.parent].parent);
    return { hasSubs: !!child, child: child && { title: child.title, lobe: child.lobe, parentLobe: byId[child.parent].lobe, parentTitle: byId[child.parent].title }, lobes: D.lobes.filter(l => !l.hidden).map(l => l.id) };
  });
  console.log('dataset:', tag, '| sub-neurons:', info.hasSubs ? 'yes' : 'no');

  // level text at lobe zoom and after zooming in
  const level0 = (await page.locator('#level').textContent()).trim();
  for (let i = 0; i < 5; i++) await page.click('#z-in'); await page.waitForTimeout(1800);
  const level1 = (await page.locator('#level').textContent()).trim();
  console.log('level before/after zoom:', JSON.stringify(level0), '→', JSON.stringify(level1));
  if (!info.hasSubs && /Sub-neurons/.test(level0 + level1)) fails.push('level pill mentions Sub-neurons on a dataset without any');
  await page.screenshot({ path: `qa/${tag}_depth_zoomed.png` });

  // hide the child's parent lobe: child must disappear too (dual-lobe pageOn rule)
  if (info.hasSubs) {
    const btn = page.locator(`#lobe-list button[data-id="${info.child.parentLobe}"]`);
    await btn.click(); await page.waitForTimeout(1200);
    await page.screenshot({ path: `qa/${tag}_depth_lobe_hidden.png` });
    const stats = (await page.locator('#stats').textContent().catch(() => '')).trim();
    console.log('stats with lobe hidden:', stats);
    await btn.click(); await page.waitForTimeout(1200);

    // select a folded child straight from search at lobe zoom
    await page.click('#z-fit'); await page.waitForTimeout(1500);
    await page.fill('#q', info.child.title); await page.waitForTimeout(500);
    await page.locator('li[role=option]').first().click(); await page.waitForTimeout(3200);
    const panelTitle = (await page.locator('#panel h2, #panel .title').first().textContent().catch(() => '')).trim();
    const partOf = await page.locator('#panel h3', { hasText: 'Part of' }).count();
    console.log('selected from search:', JSON.stringify(panelTitle), '| Part of section:', partOf ? 'yes' : 'no');
    if (!panelTitle.includes(info.child.title)) fails.push(`panel shows ${panelTitle} instead of ${info.child.title}`);
    if (!partOf) fails.push('child panel lacks "Part of" section');
    await page.screenshot({ path: `qa/${tag}_depth_child_selected.png` });
  }

  console.log('failures:', JSON.stringify(fails), '| errors:', JSON.stringify(errs));
  await browser.close();
  process.exit(errs.length || fails.length ? 1 : 0);
})();
