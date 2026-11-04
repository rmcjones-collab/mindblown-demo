// NODE_PATH=<playwright modules> node tools/qa-nnccg-starters.cjs <brain URL>
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const url = process.argv[2] || 'http://127.0.0.1:8124/index.html';
const ids = ['lobe-matrix', 'degree-hist', 'hub-rank', 'source-mix'].map(t => 'nn-' + t);
(async () => {
  const b = await chromium.launch(), errors = [];
  try {
    for (const width of [1440, 390, 667]) {
      const c = await b.newContext({ viewport: { width, height: width === 667 ? 375 : 900 }, acceptDownloads: true });
      const p = await c.newPage(); p.on('pageerror', e => errors.push(e.message));
      p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
      await p.goto(url); await p.waitForFunction(() => window.MINDBLOWN_NNCCG);
      // phones: an open details sheet covers the rail (as for every rail tool), so close it before opening Charts
      const openCharts = async () => {   // the sheet can appear a moment after a selection, so retry once it has had time to show
        for (let i = 0; ; i++) {
          if (width <= 900 && await p.locator('#panel').isVisible()) { await p.locator('#panel-close').click(); await p.locator('#panel').waitFor({ state: 'hidden' }); }
          try { await p.locator('#nnccg-open').click({ timeout: 4000 }); return; } catch (e) { if (i === 2) throw e; }
        }
      };
      assert(await p.evaluate(() => !!window.MINDBLOWN_NNCCG.result('nn-source-mix')), 'never-opened chart result');
      const hiddenExport = p.waitForEvent('download');
      await p.evaluate(() => window.MINDBLOWN_NNCCG.savePng('nn-source-mix'));
      const hiddenDownload = await hiddenExport;
      assert(hiddenDownload.suggestedFilename().endsWith('.png'));
      const hiddenWidth = fs.readFileSync(await hiddenDownload.path()).readUInt32BE(16);
      assert.equal(await p.locator('#nnccg-drawer').isVisible(), false, 'hidden export restores closed drawer');
      await openCharts();
      assert.equal(await p.locator('.nnccg-chooser option').count(), 4);
      for (const id of ids) {
        await p.selectOption('.nnccg-chooser', id);
        const card = p.locator(`.nnccg-card[data-id="${id}"]`);
        assert(await card.isVisible()); assert((await card.locator('.nnccg-summary').innerText()).length > 20);
        assert((await p.evaluate(() => location.hash)).includes('chart=' + id));
        await card.locator('summary').click();
        const expectsKeyboardTarget = await p.evaluate(id => {
          const r = window.MINDBLOWN_NNCCG.result(id);
          return id === 'nn-hub-rank' ? r.rows.length > 0 : id === 'nn-lobe-matrix' && r.total > 0;
        }, id);
        if (expectsKeyboardTarget) {
          assert(await card.locator('.nnccg-data button').count() > 0, `${id} exposes keyboard targets`);
          await card.locator('.nnccg-data button').first().focus(); await p.keyboard.press('Enter');
          const selected = await p.evaluate(() => window.MINDBLOWN_RENDERER.selected());
          assert(selected);
          await p.keyboard.press('Escape');
          assert.equal(await p.evaluate(() => window.MINDBLOWN_RENDERER.selected()), selected, 'Escape must preserve map selection');
          await openCharts();
        }
        await card.locator('summary').click();
        const download = p.waitForEvent('download');
        await card.locator('.nnccg-shot').click();
        const visibleDownload = await download;
        assert(visibleDownload.suggestedFilename().endsWith('.png'));
        if (id === 'nn-source-mix') assert.equal(fs.readFileSync(await visibleDownload.path()).readUInt32BE(16), hiddenWidth, 'hidden and visible export use the same width');
      }
      await p.locator('.nnccg-chooser').focus(); await p.keyboard.press('Escape');
      assert.equal(await p.locator('#nnccg-drawer').isVisible(), false, 'Escape closes a focused chart chooser');
      await openCharts();
      // Recount distinct-neighbour degree independently, including zero-degree nodes.
      await p.selectOption('.nnccg-chooser', 'nn-degree-hist');
      const counts = await p.evaluate(() => {
        const D = window.MINDBLOWN, on = new Set(window.MINDBLOWN_RENDERER.lobes().filter(l => l.on).map(l => l.id));
        const all = new Map(D.pages.map(p => [p.id, p]));
        const visible = D.pages.filter(p => on.has(p.lobe) && (!all.has(p.parent) || on.has(all.get(p.parent).lobe)));
        const a = new Map(visible.map(p => [p.id, new Set()]));
        for (const l of D.links) if (l.s !== l.t && a.has(l.s) && a.has(l.t)) { a.get(l.s).add(l.t); a.get(l.t).add(l.s); }
        const r = window.MINDBLOWN_NNCCG.result('nn-degree-hist');
        const step = Math.max(1, Math.ceil((Math.max(0, ...[...a.values()].map(neighbours => neighbours.size)) + 1) / 12));
        const buckets = new Map();
        for (const node of visible) {
          const low = Math.floor(a.get(node.id).size / step) * step;
          if (!buckets.has(low)) buckets.set(low, { low, value: 0, secondary: 0 });
          buckets.get(low).value++; if (node.parent) buckets.get(low).secondary++;
        }
        return { pages: visible.length, sum: r.rows.reduce((s, x) => s + x.value, 0), reported: r.total,
          expectedBuckets: [...buckets.values()].sort((a, b) => a.low - b.low),
          actualBuckets: r.rows.map(({ low, value, secondary }) => ({ low, value, secondary })) };
      });
      assert.equal(counts.sum, counts.pages); assert.equal(counts.reported, counts.pages);
      assert.deepEqual(counts.actualBuckets, counts.expectedBuckets);
      await p.selectOption('.nnccg-chooser', 'nn-hub-rank');
      const hubs = await p.evaluate(() => {
        const D = window.MINDBLOWN, on = new Set(window.MINDBLOWN_RENDERER.lobes().filter(l => l.on).map(l => l.id));
        const by = new Map(D.pages.map(p => [p.id, p]));
        const visible = new Set(D.pages.filter(p => on.has(p.lobe) && (!by.has(p.parent) || on.has(by.get(p.parent).lobe))).map(p => p.id));
        const expected = [...visible].map(id => ({ id, value: new Set(D.links.flatMap(l => l.s !== l.t && visible.has(l.s) && visible.has(l.t) ? (l.s === id ? [l.t] : l.t === id ? [l.s] : []) : [])).size }))
          .sort((a, b) => b.value - a.value || String(a.id).localeCompare(String(b.id))).slice(0, 20);
        return { expected, actual: window.MINDBLOWN_NNCCG.result('nn-hub-rank').rows.map(({ id, value }) => ({ id, value })) };
      });
      assert.deepEqual(hubs.actual, hubs.expected);
      await p.selectOption('.nnccg-chooser', 'nn-source-mix');
      const sources = await p.evaluate(() => {
        const D = window.MINDBLOWN, on = new Set(window.MINDBLOWN_RENDERER.lobes().filter(l => l.on).map(l => l.id)), by = new Map(D.pages.map(p => [p.id, p]));
        const visible = D.pages.filter(p => on.has(p.lobe) && (!by.has(p.parent) || on.has(by.get(p.parent).lobe)));
        const kinds = {};
        for (const s of new Map(D.sources.map(s => [s.id, s])).values()) {
          const citing = visible.filter(p => (p.sources || []).includes(s.id) || (s.pages || []).includes(p.id));
          if (!citing.length) continue;
          const k = s.kind || 'unknown'; kinds[k] ||= { count: 0, pages: new Set() };
          kinds[k].count++; citing.forEach(p => kinds[k].pages.add(p.id));
        }
        return {
          expected: Object.entries(kinds).map(([label, r]) => ({ label, value: r.count, pages: r.pages.size })).sort((a, b) => a.label.localeCompare(b.label)),
          actual: window.MINDBLOWN_NNCCG.result('nn-source-mix').rows.map(({ label, value, pages }) => ({ label, value, pages })).sort((a, b) => a.label.localeCompare(b.label))
        };
      });
      assert.deepEqual(sources.actual, sources.expected);
      await p.selectOption('.nnccg-chooser', 'nn-lobe-matrix');
      const dim = await p.locator('.nnccg-card:not([hidden]) canvas').evaluate(cv => ({
        width: parseFloat(cv.style.width), viewport: cv.parentElement.clientWidth, scroll: cv.parentElement.scrollWidth
      }));
      assert(dim.scroll >= dim.width - 1, 'matrix fits its scrollable surface');
      fs.mkdirSync('qa', { recursive: true });
      await p.screenshot({ path: `qa/nnccg-starters-${width}.png` });
      await p.selectOption('.nnccg-chooser', 'nn-source-mix');
      await p.screenshot({ path: `qa/nnccg-sources-${width}.png` });
      await p.reload(); await p.waitForFunction(() => window.MINDBLOWN_NNCCG);
      await p.waitForTimeout(1900); // include delayed neuron restoration, which must preserve #chart
      assert.equal(await p.locator('.nnccg-chooser').inputValue(), 'nn-source-mix');
      assert((await p.evaluate(() => location.hash)).includes('chart=nn-source-mix'));
      await c.close();
      console.log(`PASS four starters, PNG, hash, hub/escape, recount and responsive UI at ${width}`);
    }
    // Unknown stored type, old phase-0 migration, and hostile labels must not crash or inject.
    const p = await b.newPage(); p.on('pageerror', e => errors.push(e.message));
    p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await p.goto(url); await p.waitForFunction(() => window.MINDBLOWN_NNCCG);
    await p.evaluate(() => {
      const d = window.MINDBLOWN;
      sessionStorage.setItem('mindblown.nnccg.' + String(d.title || d.center || 'brain'), JSON.stringify([
        { id: 'future', type: 'constructor', name: '<img src=x onerror=alert(1)>', scope: '*', order: 0 }
      ]));
    });
    await p.reload(); await p.waitForFunction(() => window.MINDBLOWN_NNCCG);
    await p.keyboard.press('c'); await p.selectOption('.nnccg-chooser', 'future');
    assert(await p.getByText('This chart type is unavailable on this page.').isVisible());
    assert.equal(await p.locator('.nnccg-card img').count(), 0);
    await p.selectOption('.nnccg-chooser', 'nn-hub-rank');
    assert(await p.locator('.nnccg-card[data-id="nn-hub-rank"]').isVisible());
    // Toggle every currently visible lobe off through real desktop controls.
    const onIds = await p.evaluate(() => window.MINDBLOWN_RENDERER.lobes().filter(l => l.on).map(l => l.id));
    for (const id of onIds) {
      const buttons = p.locator('#lobe-list .lobe');
      for (let i = 0; i < await buttons.count(); i++) if (await buttons.nth(i).getAttribute('data-id') === id) { await buttons.nth(i).click(); break; }
    }
    for (const id of ids) {
      await p.selectOption('.nnccg-chooser', id);
      assert.equal(await p.evaluate(id => window.MINDBLOWN_NNCCG.result(id).total, id), 0, 'all-off empty state');
    }
    assert.deepEqual(errors, []); console.log('PASS unknown type and migration; errors: []');
  } finally { await b.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
