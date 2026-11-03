// Run with Playwright installed: node tools/qa-catalog.cjs http://127.0.0.1:8124/
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const base = process.argv[2] || 'http://127.0.0.1:8124/';
const labels = ['Home', 'Projects', 'Life', 'Programming', 'Build',
  'Brain 42', 'Deep Answers', 'Human Genome', 'GTA Network', 'AI Hub'];
(async () => {
  const browser = await chromium.launch({ channel: 'chromium', headless: true });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    for (const viewport of [{ width: 1440, height: 900 }, { width: 375, height: 667 }, { width: 1280, height: 500 }]) {
      await page.setViewportSize(viewport);
      for (const name of ['index', 'projects', 'life', 'programming', 'build']) {
        await page.goto(new URL(`${name}.html`, base).href);
        const home = name === 'index';
        const menu = home ? '[data-project-menu]' : '.nav-menu';
        await page.locator(home ? '.project-picker summary' : '.nav-btn').click();
        assert.deepEqual(await page.locator(`${menu} a`).allTextContents(), labels);
        assert.equal(await page.locator(`${menu} a.on`).getAttribute('href'), `${name}.html`);
        await page.locator(`${menu} a`).last().scrollIntoViewIfNeeded();
        assert.equal(await page.locator(menu).evaluate(el => {
          const r = el.getBoundingClientRect();
          return r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight;
        }), true);
        if (home) assert.equal(await page.locator('[data-public-networks] a').count(), 5);
        await page.keyboard.press('Escape');
        assert.equal(await page.locator(menu).isVisible(), false);
      }
    }
    assert.deepEqual(errors, []);
    console.log('PASS: shared catalog, current page, footer, Escape and viewport fit on all five pages.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
