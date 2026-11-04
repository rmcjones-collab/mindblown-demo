const {chromium}=require('playwright');
const assert=require('node:assert/strict');
if(!process.argv[2])throw new Error('Usage: node tools/qa-cell-radius.cjs <brain-url>');
(async()=>{
 const b=await chromium.launch();
 try {
  for(const vp of [{width:375,height:667},{width:667,height:375}]){
   const p=await b.newPage({viewport:vp}),errors=[];
   p.on('pageerror',e=>errors.push(e.stack));
   await p.addInitScript(()=>{
    window.__badRadii=[];
    const arc=CanvasRenderingContext2D.prototype.arc;
    CanvasRenderingContext2D.prototype.arc=function(...a){
     if(a[2]<0)window.__badRadii.push({radius:a[2],stack:new Error().stack});
     return arc.apply(this,a);
    };
   });
   await p.goto(process.argv[2],{timeout:120000});
   await p.waitForFunction(()=>window.MINDBLOWN_QA);
   await p.waitForTimeout(2200);
   await p.evaluate(()=>MINDBLOWN_QA.setLayout('cell'));
   await p.waitForTimeout(1500);
   const result=await p.evaluate(()=>({view:MINDBLOWN_QA.captureLayout('test').view,bad:__badRadii}));
   console.log(JSON.stringify({viewport:vp,...result,errors}));
   assert.deepEqual(result.bad,[]);assert.deepEqual(errors,[]);
   await p.close();
  }
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
