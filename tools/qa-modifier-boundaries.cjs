// Regression: safe-ID wrap and interrupted pointer gestures.
// Usage: node tools/qa-modifier-boundaries.cjs <brain-url>
// Runs against a real browser; scenario fixtures use the public restore API.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const url = process.argv[2];
if (!url) throw new Error('Usage: node tools/qa-modifier-boundaries.cjs <brain-url>');

(async () => {
  const browser = await chromium.launch(), failures = [], errors = [];
  const snapshot = p => p.evaluate(() => window.MINDBLOWN_MODIFIERS.snapshot());
  const tick = p => p.evaluate(() => new Promise(resolve => requestAnimationFrame(() => resolve())));
  async function test(name, run) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, hasTouch: true });
    const p = await context.newPage();
    p.on('pageerror', e => errors.push(e.message));
    try {
      await p.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
      await p.waitForFunction(() => window.MINDBLOWN_MODIFIERS && window.MINDBLOWN_RENDERER && window.MINDBLOWN_QA);
      await p.evaluate(() => {
        const R = window.MINDBLOWN_RENDERER, [x, y] = R.toWorld(700, 480);
        window.MINDBLOWN_MODIFIERS.restore({
          modifiers: [{ id: 'M1', target: R.nodes()[0].id, gain: 1, x, y }], edges: []
        });
      });
      await tick(p);
      await run(p);
      console.log('PASS ' + name);
    } catch (e) {
      failures.push(name + ': ' + e.message);
      console.error('FAIL ' + name + ': ' + e.message);
    } finally { await context.close(); }
  }
  async function point(p) {
    const box = await p.locator('#modifier-overlay button').first().boundingBox();
    assert(box, 'controller must be visible');
    return [box.x + box.width / 2 - 5, box.y + box.height / 2 - 5];
  }
  async function drag(p) {
    const [x, y] = await point(p);
    await p.mouse.move(x, y); await p.mouse.down();
    await p.mouse.move(x + 40, y + 20, { steps: 5 }); await p.mouse.up();
    await tick(p);
  }
  async function seedRedo(p) {
    await drag(p);
    await p.click('#modifiers-open'); await p.click('#modifier-undo');
    assert(await p.locator('#modifier-redo').isEnabled(), 'redo fixture must exist');
    await p.click('#modifier-close'); await tick(p);
    return snapshot(p);
  }

  await test('boundary IDs wrap, skip collisions and preserve the full saved layout', async p => {
    assert(await p.evaluate(() => {
      const M = window.MINDBLOWN_MODIFIERS, m = M.snapshot().modifiers[0];
      return M.restore({ modifiers: ['M9007199254740991', 'M1', 'M2'].map(id => ({ ...m, id })), edges: [] });
    }));
    await p.click('#modifiers-open');
    await p.click('#modifier-beside'); await p.click('#modifier-beside');
    const before = await snapshot(p), ids = before.modifiers.map(m => m.id);
    assert.equal(new Set(ids).size, 5, 'all five controllers need unique IDs');
    assert(ids.every(id => Number.isSafeInteger(+id.slice(1))), 'new IDs must remain safe integers');
    assert.deepEqual(ids.slice(-2), ['M3', 'M4'], 'wrapped allocator skips occupied M1 and M2');
    const restored = await p.evaluate(() => {
      const Q = window.MINDBLOWN_QA, M = window.MINDBLOWN_MODIFIERS;
      const layout = JSON.parse(JSON.stringify(Q.captureLayout('Boundary regression')));
      M.restore({ modifiers: [], edges: [] });
      return Q.applyLayout(layout);
    });
    assert.equal(restored, true);
    assert.deepEqual(await snapshot(p), before, 'restoring the layout must not discard controllers');
    await p.click('#modifier-beside');
    const next = await snapshot(p);
    assert.equal(new Set(next.modifiers.map(m => m.id)).size, 6, 'restoring must not reintroduce ID collisions');
    assert(next.modifiers.every(m => Number.isSafeInteger(+m.id.slice(1))));
  });

  await test('touch cancellation restores the start, preserves redo and allows the next drag', async p => {
    const before = await seedRedo(p), [x, y] = await point(p);
    const client = await p.context().newCDPSession(p);
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
    for (let i = 1; i <= 4; i++) {
      await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + 10 * i, y: y + 5 * i, id: 1 }] });
      await tick(p);
    }
    assert.notDeepEqual(await snapshot(p), before, 'touch must actually move the controller before cancellation');
    await client.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
    await tick(p);
    assert.deepEqual(await snapshot(p), before, 'cancel must roll back exactly');
    assert(await p.locator('#modifier-redo').isEnabled(), 'cancel must preserve redo');
    assert(!(await p.locator('#modifier-panel').isVisible()), 'cancel must not open the panel');
    await p.locator('#modifier-overlay button').focus(); await p.keyboard.press('Enter');
    assert(await p.locator('#modifier-panel').isVisible(), 'keyboard activation must still work after cancellation');
    await p.click('#modifier-close');
    await drag(p);
    assert.notDeepEqual(await snapshot(p), before, 'next completed drag must work');
    await p.click('#modifiers-open'); await p.click('#modifier-undo');
    assert.deepEqual(await snapshot(p), before, 'next drag gets exactly one undo step');
    await p.click('#modifier-undo');
    assert.equal((await snapshot(p)).modifiers.length, 0, 'cancel must not add an extra history entry');
  });

  await test('capture loss rolls back once; stale pointers cannot mutate a finished drag', async p => {
    const before = await seedRedo(p), [x, y] = await point(p);
    await p.evaluate(() => {
      const h = document.querySelector('#modifier-overlay button');
      h.addEventListener('pointerdown', e => { window.__qaPointer = e.pointerId; });
    });
    await p.mouse.move(x, y); await p.mouse.down();
    await p.mouse.move(x + 40, y + 20, { steps: 5 });
    assert.notDeepEqual(await snapshot(p), before);
    await p.evaluate(() => document.querySelector('#modifier-overlay button').releasePointerCapture(window.__qaPointer));
    // The next native pointer event delivers pending lostpointercapture.
    await p.mouse.move(x + 42, y + 22);
    await tick(p);
    assert.deepEqual(await snapshot(p), before, 'capture loss must roll back');
    await p.mouse.up();
    await p.mouse.move(x, y);
    assert.deepEqual(await snapshot(p), before, 'later pointer events must not revive a cancelled drag');
    assert(await p.locator('#modifier-redo').isEnabled());
    await drag(p);
    const completed = await snapshot(p);
    assert.notDeepEqual(completed, before, 'normal completion must survive implicit lostpointercapture');
    await p.click('#modifiers-open'); await p.click('#modifier-undo');
    assert.deepEqual(await snapshot(p), before);
    await p.click('#modifier-redo'); assert.deepEqual(await snapshot(p), completed);
  });

  await test('unrelated pointer events cannot replace or finish the active gesture', async p => {
    const before = await snapshot(p), [x, y] = await point(p);
    await p.evaluate(() => {
      document.querySelector('#modifier-overlay button').addEventListener('pointerdown', e => {
        if (e.isTrusted) window.__qaPointer = e.pointerId;
      });
    });
    await p.mouse.move(x, y); await p.mouse.down();
    await p.mouse.move(x + 15, y + 10, { steps: 3 });
    const during = await snapshot(p);
    await p.evaluate(() => {
      const h = document.querySelector('#modifier-overlay button');
      for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'lostpointercapture']) {
        h.dispatchEvent(new PointerEvent(type, { pointerId: window.__qaPointer + 100, clientX: 900, clientY: 700 }));
      }
    });
    assert.deepEqual(await snapshot(p), during, 'foreign pointer must be ignored');
    await p.mouse.move(x + 30, y + 20); await p.mouse.up();
    assert.notDeepEqual(await snapshot(p), during, 'original pointer must remain active');
    await p.click('#modifiers-open'); await p.click('#modifier-undo');
    assert.deepEqual(await snapshot(p), before);
  });

  await browser.close();
  if (errors.length) failures.push('page errors: ' + JSON.stringify(errors));
  console.log('failures: ' + JSON.stringify(failures));
  process.exitCode = failures.length ? 1 : 0;
})().catch(e => { console.error(e); process.exitCode = 1; });
