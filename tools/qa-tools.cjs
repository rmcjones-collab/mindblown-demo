// MindBlown QA: select & move tools. usage: node tools/qa-tools.cjs http://localhost:8128/index.html
// Drags a marquee over the first brain's hub, moves the group with the left button, moves one neuron with the middle button,
// then releases pins. Prints `errors: []` on success. Writes qa/tools_*.png.
const { chromium } = require(require.resolve('playwright', { paths: ['/home/user/workspace/mindblown-demo-qa/node_modules', require('child_process').execSync('npm root -g').toString().trim()] }));
const fs = require('fs');
(async () => {
  const url = process.argv[2] || 'http://localhost:8128/index.html';
  fs.mkdirSync('qa', { recursive: true });
  const b = await chromium.launch(); const errs = [];
  const p = await b.newPage({ viewport: { width: 1366, height: 848 } });
  p.on('pageerror', e => errs.push(String(e))); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.goto(url); await p.waitForTimeout(2600);
  const hub = await p.evaluate(() => window.MINDBLOWN_QA.screenOf(window.MINDBLOWN.centers ? window.MINDBLOWN.centers[0] : window.MINDBLOWN.center));
  console.log('hub at', hub.map(Math.round));
  // 1. marquee around the hub
  await p.mouse.move(hub[0] - 120, hub[1] - 90); await p.mouse.down(); await p.mouse.move(hub[0] - 60, hub[1] - 40, { steps: 4 }); await p.mouse.move(hub[0] + 120, hub[1] + 90, { steps: 8 });
  await p.screenshot({ path: 'qa/tools_marquee.png' });
  await p.mouse.up(); await p.waitForTimeout(300);
  const sel = await p.evaluate(() => window.MINDBLOWN_QA.selection());
  const hint1 = await p.textContent('#hint');
  console.log('selected', sel.length, '| hint:', hint1);
  // 2. drag the group by the hub with the left button
  const before = await p.evaluate(ids => ids.map(id => window.MINDBLOWN_QA.screenOf(id)), sel);
  await p.mouse.move(hub[0], hub[1]); await p.mouse.down(); await p.mouse.move(hub[0] + 60, hub[1] + 140, { steps: 10 }); await p.mouse.move(hub[0] + 120, hub[1] + 180, { steps: 10 }); await p.mouse.up();
  await p.waitForTimeout(400);
  const after = await p.evaluate(ids => ids.map(id => window.MINDBLOWN_QA.screenOf(id)), sel);
  const moved = before.filter((q, i) => Math.hypot(after[i][0] - q[0], after[i][1] - q[1]) > 60).length;
  const pinned = await p.evaluate(() => window.MINDBLOWN_QA.pinned().length);
  console.log('group moved:', moved, 'of', sel.length, '| pinned:', pinned);
  await p.screenshot({ path: 'qa/tools_group_moved.png' });
  // 3. middle-button drag of a single, unselected neuron: a shared one
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  const sid = await p.evaluate(() => (window.MINDBLOWN.pages.find(x => x.id === 'proto/sacn') || window.MINDBLOWN.pages.find(x => x.lobe !== 'self' && !x.parent)).id);
  const s0 = await p.evaluate(id => window.MINDBLOWN_QA.screenOf(id), sid);
  const vy = s0[1] > 424 ? -1 : 1, vx = s0[0] > 683 ? -1 : 1;   // toward the middle of the window, so the pan and click below stay on screen
  await p.mouse.move(s0[0], s0[1]); await p.mouse.down({ button: 'middle' }); await p.mouse.move(s0[0] + 40 * vx, s0[1] + 120 * vy, { steps: 10 }); await p.mouse.move(s0[0] + 80 * vx, s0[1] + 200 * vy, { steps: 10 }); await p.mouse.up({ button: 'middle' });
  await p.waitForTimeout(400);
  const s1 = await p.evaluate(id => window.MINDBLOWN_QA.screenOf(id), sid);
  console.log('mouse3 moved', sid, 'by', Math.round(Math.hypot(s1[0] - s0[0], s1[1] - s0[1])), 'px | pinned now', await p.evaluate(() => window.MINDBLOWN_QA.pinned().length));
  // 4. right-button drag on empty space pans; a click selects
  const t0 = await p.evaluate(id => window.MINDBLOWN_QA.screenOf(id), sid);
  await p.mouse.move(60 + 300, 760); await p.mouse.down({ button: 'right' }); await p.mouse.move(60 + 380, 700, { steps: 8 }); await p.mouse.up({ button: 'right' }); await p.waitForTimeout(200);
  const t1 = await p.evaluate(id => window.MINDBLOWN_QA.screenOf(id), sid);
  console.log('right-drag pan moved view by', Math.round(Math.hypot(t1[0] - t0[0], t1[1] - t0[1])), 'px');
  await p.mouse.click(t1[0], t1[1]); await p.waitForTimeout(1400);
  console.log('panel:', await p.textContent('#panel h2'), '| hidden:', await p.$eval('#panel', e => e.hidden));
  await p.screenshot({ path: 'qa/tools_selected_after_moves.png' });
  // 5. release
  await p.keyboard.press('Escape'); await p.click('#release-pins'); await p.waitForTimeout(300);
  console.log('pinned after release:', await p.evaluate(() => window.MINDBLOWN_QA.pinned().length), '| mode', await p.evaluate(() => window.MINDBLOWN_QA.mode()));
  await p.click('.tool-mode[data-mode=pan]'); console.log('pan mode:', await p.evaluate(() => window.MINDBLOWN_QA.mode()));
  console.log('errors:', JSON.stringify(errs)); await b.close();
})();
