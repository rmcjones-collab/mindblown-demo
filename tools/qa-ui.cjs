// MindBlown QA: labels toggle, brain dropdown, scrollable lobes list, screenshot button.
// usage: node tools/qa-ui.cjs http://localhost:8130/philosophy.html   — prints `errors: []` on success, writes qa/ui_*.png
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const url = process.argv[2] || 'http://localhost:8130/philosophy.html';
  fs.mkdirSync('qa', { recursive: true });
  const b = await chromium.launch(); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 1280, height: 600 }, acceptDownloads: true });
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(String(e))); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.goto(url); await p.waitForTimeout(2200);

  // 1. dropdown nav: present, lists every brain, opens, navigates
  const dd = await p.evaluate(() => {
    const nav = document.querySelector('nav.brains.dd'); if (!nav) return null;
    const r = nav.getBoundingClientRect();
    return { items: [...nav.querySelectorAll('.nav-menu a')].map(a => a.textContent.trim()), on: nav.querySelector('.nav-menu a.on')?.textContent.trim(), btn: nav.querySelector('.nav-btn')?.textContent.trim(), x: Math.round(r.x), y: Math.round(r.y), hidden: getComputedStyle(nav.querySelector('.nav-menu')).display === 'none' };
  });
  if (!dd) console.log('nav: none (single-brain network)'); else {
    console.log('nav:', dd.btn, '| items:', dd.items.join(', '), '| at', dd.x, dd.y, '| closed:', dd.hidden);
    if (dd.items.length < 2) errs.push('dropdown lists ' + dd.items.length + ' items');
    if (!dd.hidden) errs.push('menu open on load');
    await p.click('.nav-btn'); await p.waitForTimeout(250);
    const open = await p.evaluate(() => getComputedStyle(document.querySelector('.nav-menu')).display !== 'none');
    if (!open) errs.push('menu did not open');
    await p.screenshot({ path: 'qa/ui_menu.png' });
    await p.keyboard.press('Escape'); await p.waitForTimeout(150);
    const closed = await p.evaluate(() => getComputedStyle(document.querySelector('.nav-menu')).display === 'none');
    if (!closed) errs.push('Escape did not close the menu');
  }

  // 2. lobes list scrolls at a short viewport
  const sc = await p.evaluate(() => { const l = document.getElementById('lobe-list'), pane = document.getElementById('lobes'); if (!l || !pane) return null; const r = pane.getBoundingClientRect(); return { client: pane.clientHeight, scroll: pane.scrollHeight, overflow: getComputedStyle(pane).overflowY, paneTop: Math.round(r.top), paneBottom: Math.round(r.bottom), vh: innerHeight, n: l.children.length }; });
  console.log('lobes panel:', sc);
  if (!sc) errs.push('no #lobes / #lobe-list'); else {
    if (sc.paneBottom > sc.vh) errs.push('lobes panel runs off screen');
    if (sc.scroll > sc.client + 1) {   // more than fits: the panel itself must scroll
      await p.evaluate(() => { document.getElementById('lobes').scrollTop = 400; });
      if (await p.evaluate(() => document.getElementById('lobes').scrollTop) === 0) errs.push('lobes panel overflows but does not scroll');
    }
    // whether or not it scrolls, the last lobe and the last option checkbox can be brought fully into the panel's view
    const reach = await p.evaluate(() => { const pane = document.getElementById('lobes'); const inView = e => { if (!e) return null; e.scrollIntoView({ block: 'nearest' }); const a = e.getBoundingClientRect(), b = pane.getBoundingClientRect(); return a.top >= b.top - 1 && a.bottom <= b.bottom + 1 && a.bottom <= innerHeight; };
      const opts = [...pane.querySelectorAll('input[type=checkbox]')].filter(x => x.closest('label') && x.closest('label').offsetParent);
      return { lobe: inView(document.querySelector('#lobe-list .lobe:last-child')), option: inView(opts.length ? opts[opts.length - 1].closest('label') : null) }; });
    console.log('reach:', reach);
    if (reach.lobe === false) errs.push('last lobe cannot be scrolled into view');
    if (reach.option === false) errs.push('last option checkbox cannot be scrolled into view');
    await p.evaluate(() => { document.getElementById('lobes').scrollTop = 0; });
  }
  await p.screenshot({ path: 'qa/ui_short.png' });

  // 3. labels toggle: off hides, hover brings one back, L key toggles, checkbox mirrors
  await p.click('#labels-toggle'); await p.waitForTimeout(500);
  const off = await p.evaluate(() => ({ on: window.MINDBLOWN_QA.labels(), cb: document.getElementById('labels').checked, cls: document.getElementById('labels-toggle').className }));
  console.log('after toggle:', off);
  if (off.on || off.cb) errs.push('labels still on after toggle');
  const pid = await p.evaluate(() => window.MINDBLOWN.pages[0].id);
  const s = await p.evaluate(id => window.MINDBLOWN_QA.screenOf(id), pid);
  await p.mouse.move(s[0], s[1]); await p.waitForTimeout(300);
  const hov = await p.evaluate(() => window.MINDBLOWN_QA.hover ? window.MINDBLOWN_QA.hover() : 'n/a');
  console.log('hover over first neuron:', hov);
  await p.screenshot({ path: 'qa/ui_labels_off_hover.png' });
  await p.mouse.move(5, 300); await p.keyboard.press('l'); await p.waitForTimeout(400);
  const back = await p.evaluate(() => ({ on: window.MINDBLOWN_QA.labels(), cb: document.getElementById('labels').checked }));
  if (!back.on || !back.cb) errs.push('L key did not restore labels');
  await p.click('#labels'); await p.waitForTimeout(200);
  if (await p.evaluate(() => window.MINDBLOWN_QA.labels())) errs.push('checkbox did not turn labels off');
  await p.click('#labels');

  // 4. screenshot button downloads a PNG
  await p.evaluate(() => { window.showSaveFilePicker = undefined; });   // the Save As dialog cannot be driven headless; test the download fallback
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 8000 }).catch(() => null), p.click('#shot')]);
  if (!dl) errs.push('no download from #shot'); else {
    const path = await dl.path(); const size = fs.statSync(path).size;
    console.log('download:', dl.suggestedFilename(), size, 'bytes');
    if (!/\.png$/.test(dl.suggestedFilename()) || size < 20000) errs.push('screenshot download looks wrong');
    fs.copyFileSync(path, 'qa/ui_download.png');
  }
  const hint = await p.textContent('#hint'); console.log('hint:', hint.trim());

  // 5. tools stack vs zoom controls
  // the right rail stacks its groups (Tools, View, File, Zoom); none may overlap the next or leave the window
  const col = await p.evaluate(() => [...document.querySelectorAll('#rail .zoom-ctl')].map(g => { const r = g.getBoundingClientRect(); return { id: g.id, top: Math.round(r.top), bottom: Math.round(r.bottom) }; }));
  console.log('rail groups:', JSON.stringify(col));
  if (!col.length) errs.push('no rail groups');
  col.forEach((g, i) => { if (i && col[i - 1].bottom > g.top) errs.push(`${col[i - 1].id} overlaps ${g.id}`); });
  if (col.length && (col[0].top < 0 || col[col.length - 1].bottom > 600)) errs.push('rail runs off the window');

  // 6. mobile: dropdown present, labels switch in lobes panel
  await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(600);
  const mob = await p.evaluate(() => { const b = document.querySelector('nav.brains.dd .nav-btn'); const n = b && b.getBoundingClientRect(); return { navRight: n ? Math.round(n.right) : null, w: innerWidth, sw: document.documentElement.scrollWidth, labels: !!document.getElementById('labels') }; });
  console.log('mobile:', mob);
  if (mob.navRight !== null && mob.navRight > mob.w) errs.push('nav button off screen on mobile');
  if (mob.sw > mob.w) errs.push('horizontal overflow on mobile');
  if (dd) { await p.click('.nav-btn'); await p.waitForTimeout(250); }
  await p.screenshot({ path: 'qa/ui_mobile_menu.png' });
  console.log('errors:', JSON.stringify(errs));
  await b.close(); process.exit(errs.length ? 1 : 0);
})();
