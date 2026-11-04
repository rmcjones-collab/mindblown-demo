// MindBlown publication-gate checks for one Brain view (PUBLICATION-GATE.md in the canonical repo):
//   1. Modifier brains: place one beside a target on the current canvas, connect it downstream, adjust it, confirm the downstream value, remove, reset.
//   2. Genome Layout: the labelled switch inside Lobes toggles the canvas to genome and back, and a neuron can still be selected.
//   3. Console: no page errors.
// usage: node tools/qa-gate.cjs <brain-url>   (scrolling is tools/qa-lobes-scroll.cjs; this is not a complete publication pass on its own)
const { chromium } = require('playwright');
const url = process.argv[2];
if (!url) { console.error('usage: node tools/qa-gate.cjs <brain-url>'); process.exit(2); }
(async () => {
  const b = await chromium.launch(); const errs = [], fails = [];
  const check = (ok, what) => { console.log((ok ? 'ok   ' : 'FAIL ') + what); if (!ok) fails.push(what); };
  let p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/favicon/.test(m.text())) errs.push(m.text()); });
  await p.goto(url, { waitUntil: 'networkidle' }); await p.waitForTimeout(2600);
  let off = [0, 0], page = p;
  if (/build\.html/.test(url)) {   // Build: answer the interview until there are neurons, then check the Explode view
    for (let i = 0; i < 25; i++) {
      if (await page.isVisible('#iv-answer')) { await page.fill('#iv-answer', i ? 'guitar, cooking, hiking' : 'Sam'); await page.click('#iv-send'); }
      else if (await page.isVisible('button:has-text("Start asking")')) { await page.click('button:has-text("Hobbies & Play")'); await page.click('button:has-text("Start asking")'); }
      else if (await page.isVisible('#iv-skip')) await page.click('#iv-skip');
      await page.waitForTimeout(400);
    }
    await page.click('#act-explode'); await page.waitForTimeout(3500);
    const fe = await page.$('#explorer-frame'); const bb = await fe.boundingBox(); off = [bb.x, bb.y];
    p = await fe.contentFrame(); p.mouse = { click: (x, y) => page.mouse.click(x + off[0], y + off[1]) };
    check(await page.$eval('#explorer', e => !e.hidden), 'Build opens the Explode view');
  }

  // 1. modifier brains
  check(!!(await p.$('#rail #modifiers-open')), 'Modifier Brain button is in the rail on this canvas');
  await p.click('#modifiers-open'); await p.waitForTimeout(300);
  check(await p.$eval('#modifier-panel', e => !e.hidden), 'Modifier panel opens');
  const ids = await p.$$eval('#modifier-target option', o => o.map(x => x.value));
  check(ids.length >= 2, `targets listed (${ids.length})`);
  const [a, c] = ids;
  await p.selectOption('#modifier-target', a); await p.click('#modifier-beside'); await p.waitForTimeout(300);
  check(await p.$$eval('#modifier-list .modifier-card', x => x.length) === 1 && await p.$$eval('#modifier-overlay button', x => x.length) >= 1, 'a modifier is placed beside the target, with a canvas handle');
  await p.$eval('#modifier-dependencies', d => { d.open = true; });
  await p.selectOption('#modifier-from', a); await p.selectOption('#modifier-to', c); await p.fill('#modifier-weight', '0.5'); await p.click('#modifier-add-edge'); await p.waitForTimeout(200);
  await p.$eval('#modifier-list input[type=range]', r => { r.value = '2'; r.dispatchEvent(new Event('input')); r.dispatchEvent(new Event('change')); }); await p.waitForTimeout(200);
  const res = await p.$$eval('#modifier-results .modifier-result', rows => rows.map(r => [r.querySelector('span').textContent, Number(r.querySelector('strong').textContent)]));
  const names = await p.evaluate(([a, c]) => [a, c].map(id => (window.MINDBLOWN.pages.find(x => x.id === id) || {}).title || id), [a, c]);
  const va = (res.find(r => r[0] === names[0]) || [])[1], vc = (res.find(r => r[0] === names[1]) || [])[1];
  check(va === 2 && vc === 1.5, `signal 2.00 on the target propagates 1.50 downstream (got ${va}, ${vc})`);
  await p.click('#modifier-list .modifier-card button:has-text("Remove")'); await p.waitForTimeout(200);
  check(await p.$$eval('#modifier-list .modifier-card', x => x.length) === 0 && await p.$$eval('#modifier-overlay button', x => x.length) === 0, 'Remove takes the controller and its handle off the canvas');
  await p.click('#modifier-reset'); await p.waitForTimeout(200);
  check(await p.$$eval('#modifier-results .modifier-result', x => x.length) === 0, 'Reset clears the scenario');
  await p.click('#modifiers-open'); await p.waitForTimeout(200);

  // 2. genome layout inside Lobes
  const sw = await p.$('#lobes #layout-genome');
  const label = sw && await sw.evaluate(e => (e.closest('label') || e.parentElement).textContent.trim());
  check(!!sw && /genome/i.test(label || ''), `labelled Genome Layout switch inside Lobes (${label})`);
  const before = await p.evaluate(() => window.MINDBLOWN_QA.captureLayout('g').layout);
  await p.$eval('#lobes #layout-genome', e => { e.scrollIntoView({ block: 'nearest' }); }); await p.click('#lobes #layout-genome'); await p.waitForTimeout(1800);
  const on = await p.evaluate(() => window.MINDBLOWN_QA.captureLayout('g').layout);
  const nid = await p.evaluate(() => window.MINDBLOWN.pages.find(x => x.lobe !== 'self' && !x.parent).id);
  const pt = await p.evaluate(id => window.MINDBLOWN_QA.screenOf(id), nid);
  await p.mouse.click(pt[0], pt[1]); await p.waitForTimeout(900);
  const panelOk = await p.evaluate(() => { const pn = document.getElementById('panel'); return !!pn && !pn.hidden && !!pn.querySelector('h2'); });
  await p.click('#lobes #layout-genome'); await p.waitForTimeout(1800);
  const offL = await p.evaluate(() => window.MINDBLOWN_QA.captureLayout('g').layout);
  check(before === 'neural' && on === 'genome' && offL === 'neural', `switch toggles neural → genome → neural (got ${before} → ${on} → ${offL})`);
  check(panelOk, 'a neuron can be selected in the genome layout');

  check(errs.length === 0, `no console errors ${JSON.stringify(errs)}`);
  console.log(`failures: ${JSON.stringify(fails)}`);
  await b.close(); process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
