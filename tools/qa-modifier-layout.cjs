// Saved layouts carry the Modifier Brain scenario: place, connect and adjust a controller, save a layout, reset, reload and apply it,
// and the controllers, connections and results come back. Hostile layout scenarios are filtered rather than applied.
// usage: node tools/qa-modifier-layout.cjs <brain-url>
const { chromium } = require('playwright');
const url = process.argv[2];
if (!url) { console.error('usage: node tools/qa-modifier-layout.cjs <brain-url>'); process.exit(2); }
(async () => {
  const b = await chromium.launch(); const errs = [], fails = [];
  const check = (ok, what) => { console.log((ok ? 'ok   ' : 'FAIL ') + what); if (!ok) fails.push(what); };
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/favicon/.test(m.text())) errs.push(m.text()); });
  const load = async () => { await p.goto(url, { waitUntil: 'networkidle' }); await p.waitForTimeout(2400); };
  const snap = () => p.evaluate(() => window.MINDBLOWN_MODIFIERS.snapshot());
  const results = () => p.evaluate(() => Object.fromEntries(Object.entries(window.MINDBLOWN_MODIFIERS.results()).map(([k, v]) => [k, v.value])));
  await load();
  check(await p.evaluate(() => !!(window.MINDBLOWN_MODIFIERS && window.MINDBLOWN_MODIFIERS.restore)), 'modifier API exposes restore');
  await p.click('#modifiers-open'); await p.waitForTimeout(250);
  const ids = await p.$$eval('#modifier-target option', o => o.map(x => x.value)); const [a, c] = ids;
  await p.selectOption('#modifier-target', a); await p.click('#modifier-beside'); await p.waitForTimeout(200);
  await p.$eval('#modifier-dependencies', d => { d.open = true; });
  await p.selectOption('#modifier-from', a); await p.selectOption('#modifier-to', c); await p.fill('#modifier-weight', '0.5'); await p.click('#modifier-add-edge');
  await p.$eval('#modifier-list input[type=range]', r => { r.value = '1.6'; r.dispatchEvent(new Event('input')); r.dispatchEvent(new Event('change')); }); await p.waitForTimeout(200);
  const before = await snap(), resBefore = await results();
  check(before.modifiers.length === 1 && before.edges.length === 1 && resBefore[c] === 1.3, `scenario built (${JSON.stringify(resBefore)})`);
  await p.click('#modifier-close');
  // save into the browser list
  await p.click('#save-layout'); await p.waitForTimeout(250); await p.fill('#layout-name', 'QA scenario'); await p.keyboard.press('Enter'); await p.waitForTimeout(300);
  const stored = await p.evaluate(() => { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith('mindblown.layouts.')) return JSON.parse(localStorage.getItem(k)); } return null; });
  check(!!stored && stored[0] && stored[0].modifiers && stored[0].modifiers.modifiers.length === 1 && stored[0].modifiers.edges.length === 1, 'the saved layout carries the scenario');
  // reload: the scenario is gone until the layout is applied
  await load();
  check((await snap()).modifiers.length === 0, 'reload starts with no scenario');
  await p.click('#save-layout'); await p.waitForTimeout(250); await p.click('#layouts-list .apply'); await p.waitForTimeout(1200);
  const after = await snap(), resAfter = await results();
  check(JSON.stringify(after) === JSON.stringify(before), 'applying the layout restores the controllers and connections exactly');
  check(resAfter[a] === 1.6 && resAfter[c] === 1.3, `results come back (${JSON.stringify(resAfter)})`);
  check(await p.$$eval('#modifier-overlay button', x => x.length) === 1, 'the controller handle is back on the canvas');
  // undo takes the restore back in one step; a new controller does not reuse the restored id
  await p.click('#modifiers-open'); await p.waitForTimeout(200);
  await p.click('#modifier-beside'); await p.waitForTimeout(200);
  const idsNow = (await snap()).modifiers.map(m => m.id);
  check(new Set(idsNow).size === idsNow.length && idsNow.length === 2, `a new controller gets a fresh id (${idsNow})`);
  await p.click('#modifier-undo'); await p.click('#modifier-undo'); await p.waitForTimeout(200);
  check((await snap()).modifiers.length === 0, 'two undos remove the new controller and the restore');
  // a saved layout whose scenario cannot be restored (a cycle) is refused whole: the scenario and the arrangement stay as they are
  await p.evaluate(([a, c]) => { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith('mindblown.layouts.')) {
    const list = JSON.parse(localStorage.getItem(k)); const bad = JSON.parse(JSON.stringify(list[0])); bad.name = 'QA cyclic';
    Object.keys(bad.positions).forEach(id => { bad.positions[id] = [9999, 9999]; });
    bad.modifiers = { modifiers: [], edges: [{ from: a, to: c, weight: 0.5 }, { from: c, to: a, weight: 0.5 }] }; localStorage.setItem(k, JSON.stringify([bad])); } } }, [a, c]);
  await load();
  await p.click('#save-layout'); await p.waitForTimeout(250); await p.click('#layouts-list .apply'); await p.waitForTimeout(600);
  const hint = await p.evaluate(() => document.body.innerText);
  check((await snap()).modifiers.length === 0 && (await snap()).edges.length === 0, 'a layout with a cyclic scenario leaves the current scenario alone');
  check(/could not be restored · nothing changed/.test(hint), 'and says nothing changed');
  await p.evaluate(() => { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith('mindblown.layouts.')) { const l = JSON.parse(localStorage.getItem(k)); l[0].modifiers = null; localStorage.setItem(k, JSON.stringify(l)); } } });
  await load(); await p.click('#save-layout'); await p.waitForTimeout(250); await p.click('#layouts-list .apply'); await p.waitForTimeout(600);
  check(/could not be restored · nothing changed/.test(await p.evaluate(() => document.body.innerText)), 'a layout with "modifiers": null is refused too');
  // hostile scenarios
  const hostile = await p.evaluate(([a, c]) => {
    const M = window.MINDBLOWN_MODIFIERS, out = {};
    out.junk = [M.restore(null), M.restore({ modifiers: 'x', edges: [] }), M.restore({ hello: 1 })];
    M.restore({ modifiers: [
      { id: 'M1', target: a, gain: 1.2, x: 0, y: 0 }, { id: '__proto__', target: a, gain: 1, x: 0, y: 0 }, { id: 'M2', target: 'constructor', gain: 1, x: 0, y: 0 },
      { id: 'M3', target: a, gain: 9, x: 0, y: 0 }, { id: 'M4', target: a, gain: 1, x: null, y: 0 }, { id: 'M5', target: a, gain: 1, x: 1, y: 1, evil: '<img src=x onerror=alert(1)>' }],
      edges: [{ from: a, to: c, weight: 0.5 }, { from: a, to: c, weight: 0.5 }, { from: a, to: c, weight: 4 }, { from: 'toString', to: c, weight: 0.1 }] });
    out.kept = M.snapshot();
    out.many = M.restore({ modifiers: Array.from({ length: 30 }, (_, i) => ({ id: 'M' + (i + 10), target: a, gain: 1, x: i, y: i })), edges: [] }) && M.snapshot().modifiers.length;
    out.allBad = M.restore({ modifiers: [{ id: 'M1', target: 'nope', gain: 1, x: 0, y: 0 }], edges: [{ from: 'nope', to: c, weight: 0.5 }] });
    out.tooMany = M.restore({ modifiers: [], edges: Array.from({ length: 30000 }, () => ({ from: a, to: c, weight: 0.1 })) });
    out.afterBad = M.snapshot().modifiers.length;
    out.cycle = M.restore({ modifiers: [], edges: [{ from: a, to: c, weight: 0.5 }, { from: c, to: a, weight: 0.5 }] });
    out.afterCycle = M.snapshot().modifiers.length;
    return out;
  }, [a, c]);
  check(hostile.junk.every(x => x === false), 'non-scenario values are refused');
  check(hostile.kept.modifiers.map(m => m.id).join() === 'M1,M5' && !('evil' in hostile.kept.modifiers[1]) && hostile.kept.edges.length === 1, `only well-formed controllers and connections are kept (${JSON.stringify(hostile.kept)})`);
  check(hostile.many === 12, `at most 12 controllers (${hostile.many})`);
  check(hostile.allBad === false && hostile.tooMany === false && hostile.afterBad === 12, 'entries with none valid, or more connections than the brain can hold, are refused and the current scenario stays');
  check(hostile.cycle === false && hostile.afterCycle === 12, 'a cyclic scenario is refused and the current one stays');
  check(!(await p.$('img[src=x]')), 'no injected markup');
  check(errs.length === 0, `no console errors ${JSON.stringify(errs)}`);
  console.log(`failures: ${JSON.stringify(fails)}`);
  await b.close(); process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
