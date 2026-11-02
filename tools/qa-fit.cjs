// MindBlown QA: screenshots of the network fit at several viewport sizes. usage: node tools/qa-fit.cjs <url>
const { chromium } = require(require.resolve('playwright', { paths: ['/home/user/workspace/mindblown-demo-qa/node_modules', require('child_process').execSync('npm root -g').toString().trim()] }));
(async () => { const b = await chromium.launch();
  for (const [w,h] of [[1280,720],[1366,848],[1920,1080],[1024,768]]) {
    const p = await b.newPage({ viewport: { width: w, height: h } }); const errs=[]; p.on('pageerror', e => errs.push(String(e)));
    await p.goto(process.argv[2]); await p.waitForTimeout(3000); await p.screenshot({ path: `qa/fit_${w}x${h}.png` }); if (w === 1366) { await p.waitForTimeout(6000); await p.screenshot({ path: 'qa/fit_late.png' }); } console.log(w,h,'errors',JSON.stringify(errs)); await p.close(); }
  await b.close(); })();
