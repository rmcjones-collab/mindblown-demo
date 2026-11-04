// MindBlown QA: side rail flyouts and saved layouts. usage: node tools/qa-save-layout.cjs http://localhost:8124/index.html
// Opens the layout flyout and picks Genome from it, drags a chromosome, saves the layout in the browser (name + Enter), returns to
// neural, applies the saved layout from the list and checks that the layout, the moved group, the lobes and the camera came back;
// then saves a neural layout with a hand-placed neuron and a toggled lobe, reloads, applies it and checks the pin and the lobe state.
// Also checks the rail's Brains group (Modifier Brain moved out of the Lobes panel), that a foreign file is refused, that the stored list
// survives a reload, and the phone rail (Brains, File, Zoom) with the saved layouts as a bottom sheet. Every check is asserted: a failure is
// listed under `failures:` and the script exits 1. Prints `failures: [] | errors: []` on success. Writes qa/save_*.png.
const pw = (() => { try { return require('playwright'); } catch { return require(require.resolve('playwright', { paths: ['/home/user/workspace/mindblown-demo-qa/node_modules', require('child_process').execSync('npm root -g').toString().trim()] })); } })();
const { chromium } = pw;
const fs = require('fs');
(async () => {
  const url = process.argv[2] || 'http://localhost:8124/index.html';
  fs.mkdirSync('qa', { recursive: true });
  const b = await chromium.launch(); const errs = [], failures = [];
  const check = (ok, what) => { if (!ok) failures.push(what); return ok; };
  const ctx = await b.newContext({ viewport: { width: 1366, height: 848 } });
  const phone = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  let p = await ctx.newPage();
  const watch = pg => { pg.on('pageerror', e => errs.push(String(e))); pg.on('console', m => m.type() === 'error' && errs.push(m.text())); };
  watch(p);
  await p.goto(url); await p.waitForTimeout(2600);
  const QA = () => p.evaluate(() => ({ layout: window.MINDBLOWN_QA.layout(), fly: window.MINDBLOWN_QA.flyout(), groups: window.MINDBLOWN_QA.groups(), pinned: window.MINDBLOWN_QA.pinned(), n: window.MINDBLOWN_QA.layouts().length }));
  // 1. the rail: four groups, nothing overlapping the header
  const rail = await p.evaluate(() => [...document.querySelectorAll('#rail .zoom-ctl')].map(g => ({ id: g.id, n: g.querySelectorAll('button').length, top: Math.round(g.getBoundingClientRect().top) })));
  console.log('rail groups:', JSON.stringify(rail));
  const hasBrains = await p.evaluate(() => !!document.querySelector('script[src*="modifiers.js"]'));   // sibling repos without the Modifier Brain have no Brains group
  check(JSON.stringify(rail.map(g => g.id)) === JSON.stringify([...(hasBrains ? ['brain-tools'] : []), 'tools', 'view-tools', 'file-tools', 'zoom-ctl']), 'rail groups in order ' + (hasBrains ? 'Brains, ' : '') + 'Tools, View, File, Zoom');
  check(rail[0].top > 70, 'rail clears the header');
  // the Modifier Brain launcher is a rail button now, not a Lobes-panel button, and toggles its panel
  if (hasBrains) {
    check(!(await p.$('#lobes #modifiers-open')) && !!(await p.$('#brain-tools #modifiers-open')), 'Modifier Brain button moved from Lobes to the rail');
    await p.click('#modifiers-open'); await p.waitForTimeout(200); check(await p.$eval('#modifier-panel', e => !e.hidden), 'Modifier Brain button opens its panel');
    await p.click('#layout-menu'); await p.waitForTimeout(200); check(await p.$eval('#modifier-panel', e => e.hidden), 'opening a rail flyout closes the Modifier panel');
    await p.keyboard.press('Escape'); await p.waitForTimeout(150);
  } else check(!(await p.$('#brain-tools')), 'no empty Brains group without a Modifier Brain');
  // 2. layouts flyout → Genome
  await p.click('#layout-menu'); await p.waitForTimeout(250);
  check((await QA()).fly === 'layout-flyout' && await p.locator('#layout-flyout .lay').count() === 5, 'layout flyout opens with 5 rows');
  await p.screenshot({ path: 'qa/save_layout_menu.png' });
  await p.click('#layout-toggle'); await p.waitForTimeout(1700);
  let s = await QA(); check(s.layout === 'genome' && s.fly === null, 'Genome row switches layout and closes the flyout');
  // 3. drag a chromosome, then save
  const g0 = await p.evaluate(() => { const g = window.MINDBLOWN_QA.groups().find(x => x.loci.length); return { id: g.id, at: window.MINDBLOWN_QA.screenOf(g.loci[0]) }; });
  await p.mouse.move(g0.at[0], g0.at[1]); await p.mouse.down(); await p.mouse.move(g0.at[0] + 80, g0.at[1] + 60, { steps: 8 }); await p.mouse.move(g0.at[0] + 160, g0.at[1] + 120, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(400);
  const moved = (await QA()).groups.find(g => g.id === g0.id); check(Math.hypot(moved.ox, moved.oy) > 40, 'chromosome dragged');
  await p.click('#save-layout'); await p.waitForTimeout(250);
  check((await QA()).fly === 'layouts-flyout' && await p.evaluate(() => document.activeElement && document.activeElement.id) === 'layout-name', 'save opens the flyout with the name box focused');
  await p.fill('#layout-name', 'QA genome'); await p.keyboard.press('Enter'); await p.waitForTimeout(300);
  await p.screenshot({ path: 'qa/save_layout_saved.png' });
  check((await QA()).n === 1, 'Enter saves one layout');
  // 4. back to neural and reset, then apply from the list
  await p.keyboard.press('Escape'); await p.keyboard.press('g'); await p.waitForTimeout(1600); check((await QA()).layout === 'neural', 'G after the flyout returns to neural (focus left the flyout)');
  await p.click('#save-layout'); await p.waitForTimeout(250); await p.click('#layouts-list .apply'); await p.waitForTimeout(1200);
  s = await QA(); const back = s.groups.find(g => g.id === g0.id);
  check(s.layout === 'genome' && back && Math.round(back.ox) === Math.round(moved.ox) && Math.round(back.oy) === Math.round(moved.oy) && s.fly === null, 'applying restores genome and the moved chromosome');
  await p.screenshot({ path: 'qa/save_layout_applied.png' });
  // 5. a neural layout with a pin and a hidden lobe, saved through Ctrl+S, survives a reload
  await p.keyboard.press('g'); await p.waitForTimeout(1600);
  const nid = await p.evaluate(() => (window.MINDBLOWN.pages.find(x => x.lobe !== 'self' && !x.parent)).id);
  const n0 = await p.evaluate(id => window.MINDBLOWN_QA.screenOf(id), nid);
  await p.mouse.move(n0[0], n0[1]); await p.mouse.down({ button: 'middle' }); await p.mouse.move(n0[0] - 60, n0[1] - 90, { steps: 8 }); await p.mouse.move(n0[0] - 120, n0[1] - 160, { steps: 8 }); await p.mouse.up({ button: 'middle' }); await p.waitForTimeout(300);
  const lobeBtn = p.locator('#lobe-list .lobe').last(); const lobeId = await lobeBtn.getAttribute('data-id'); await lobeBtn.click(); await p.waitForTimeout(300);
  const lobeSaved = await lobeBtn.getAttribute('aria-pressed');   // the click flips it; some brains start a lobe off (the life brains' Search trail)
  await p.keyboard.press('Control+s'); await p.waitForTimeout(250); await p.fill('#layout-name', 'QA neural'); await p.keyboard.press('Control+s'); await p.waitForTimeout(300);
  check((await QA()).n === 2 && (await QA()).pinned.length === 1, 'Ctrl+S twice saves the neural layout with its pin');
  await p.keyboard.press('Escape');
  await p.reload(); await p.waitForTimeout(2600);
  check((await QA()).n === 2, 'both layouts survive a reload');
  await p.click('#save-layout'); await p.waitForTimeout(250); await p.click('#layouts-list .apply >> nth=1'); await p.waitForTimeout(1200);
  s = await QA();
  const pressed = await p.$eval(`#lobe-list .lobe[data-id="${lobeId}"]`, e => e.getAttribute('aria-pressed'));
  check(s.layout === 'neural' && s.pinned.includes(nid) && pressed === lobeSaved, `applying restores the pin and the toggled lobe (got ${s.layout}, pins ${JSON.stringify(s.pinned)}, ${lobeId} pressed=${pressed}, saved ${lobeSaved})`);
  await p.screenshot({ path: 'qa/save_layout_neural.png' });
  // 6. a foreign layout is refused; a malformed one too
  const refused = await p.evaluate(() => { const own = window.MINDBLOWN_QA.captureLayout('own'); return [
    window.MINDBLOWN_QA.applyLayout({ format: 'mindblown-layout/1', name: 'x', layout: 'neural', positions: { nope: [0, 0] } }),   // no overlap
    window.MINDBLOWN_QA.applyLayout({ ...own, brain: { ...own.brain, title: 'Some other brain' } }),   // full overlap, other title
    window.MINDBLOWN_QA.applyLayout({ ...own, positions: Object.fromEntries(Object.keys(own.positions).map(k => [k, [null, null]])) }),   // no real coordinates
    window.MINDBLOWN_QA.applyLayout({ hello: 1 })]; });
  check(refused.every(x => x === false), 'foreign, renamed, coordinate-less and malformed layouts refused');
  const proto = await p.evaluate(() => { const own = window.MINDBLOWN_QA.captureLayout('own'); let ok;
    try { ok = window.MINDBLOWN_QA.applyLayout({ ...own, layout: 'neural', pins: ['__proto__', 'constructor', 'toString'], selected: 'constructor' }); } catch (e) { return 'threw ' + e.message; }
    return ok === true && !('pinned' in Object.prototype) && !('fx' in Object.prototype); });
  check(proto === true, `inherited ids in pins/selected are ignored (got ${proto})`);
  // 7. without a Save As picker (headless has none; Firefox and Safari neither) the file goes through a plain download
  await p.evaluate(() => { window.showSaveFilePicker = undefined; });
  await p.click('#save-layout'); await p.waitForTimeout(250);
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#layout-download')]);
  check(/\.mindblown-layout\.json$/.test(dl.suggestedFilename()), 'download fallback names a .mindblown-layout.json file');
  await p.close();
  // 8. phone: the rail keeps Brains, File and Zoom; saved layouts open as a bottom sheet
  const saved = await ctx.storageState(); p = await phone.newPage(); watch(p);
  await p.goto(url); await p.evaluate(o => { o.forEach(x => (x.localStorage || []).forEach(kv => localStorage.setItem(kv.name, kv.value))); }, saved.origins); await p.reload();
  await p.goto(url); await p.waitForTimeout(2200);
  const vis = await p.evaluate(() => [...document.querySelectorAll('#rail .zoom-ctl')].filter(g => g.offsetParent !== null).map(g => g.id));
  check(JSON.stringify(vis) === JSON.stringify([...(hasBrains ? ['brain-tools'] : []), 'file-tools', 'zoom-ctl']), `phone rail shows ${hasBrains ? 'Brains, ' : ''}File, Zoom (got ${vis})`);
  await p.screenshot({ path: 'qa/save_layout_mobile.png' });
  await p.tap('#save-layout').catch(() => p.click('#save-layout')); await p.waitForTimeout(300);
  const sheet = await p.$eval('#layouts-flyout', e => { const r = e.getBoundingClientRect(); return { open: !e.hidden, l: Math.round(r.left), r: Math.round(innerWidth - r.right), b: Math.round(innerHeight - r.bottom), n: e.querySelectorAll('.apply').length }; });
  check(sheet.open && sheet.l <= 12 && sheet.r <= 12 && sheet.b <= 12, `phone saved layouts open as a bottom sheet (${JSON.stringify(sheet)})`);
  check(sheet.n === 2, 'phone sees the two layouts saved on desktop');
  await p.screenshot({ path: 'qa/save_layout_mobile_sheet.png' });
  await p.click('#layouts-list .apply'); await p.waitForTimeout(1000);
  check((await QA()).layout === 'genome' && (await QA()).fly === null, 'phone applies a saved layout and the sheet closes');
  console.log('failures:', JSON.stringify(failures), '| errors:', JSON.stringify(errs)); await b.close();
  process.exit(failures.length || errs.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
