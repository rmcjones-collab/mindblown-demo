// MindBlown QA: screenshots + console-error check.
// usage: node tools/qa-shot.cjs http://localhost:8124/index.html [search term]
// Writes qa/<page>_{overview,selected,zoomed,mobile}.png and prints `errors: []` on success.
const { chromium } = require('playwright');
const fs = require('fs');
const url = process.argv[2] || 'http://localhost:8124/index.html';
const term = process.argv[3] || '';
const tag = (url.split('/').pop() || 'index').replace(/\.html$/, '');
fs.mkdirSync('qa', { recursive: true });
(async () => {
  const browser = await chromium.launch();
  const errs = [];
  const watch = p => { p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); };

  let page = await browser.newPage({ viewport: { width: 1440, height: 900 } }); watch(page);
  await page.goto(url, { waitUntil: 'networkidle' }); await page.waitForTimeout(3000);
  await page.screenshot({ path: `qa/${tag}_overview.png` });
  const q = term || await page.evaluate(() => { const D = window.MINDBLOWN; return (D.pages.find(p => p.id === D.center) || D.pages[0]).title; });
  await page.fill('#q', q); await page.waitForTimeout(500);
  await page.locator('li[role=option]').first().click(); await page.waitForTimeout(2500);
  await page.screenshot({ path: `qa/${tag}_selected.png` });
  await page.click('#panel-close'); await page.click('#z-in'); await page.click('#z-in'); await page.waitForTimeout(1800);
  console.log('level:', (await page.locator('#level').textContent()).trim());
  await page.screenshot({ path: `qa/${tag}_zoomed.png` });
  await page.close();

  page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); watch(page);
  await page.goto(url, { waitUntil: 'networkidle' }); await page.waitForTimeout(3000);
  await page.screenshot({ path: `qa/${tag}_mobile.png` });
  await page.close();

  console.log('search term:', q, '| errors:', JSON.stringify(errs));
  await browser.close();
  process.exit(errs.length ? 1 : 0);
})();
