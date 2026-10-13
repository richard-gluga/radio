// Run with the same server/environment as browser.cjs. Software WebGL enables headless rendering.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const base=process.env.RADIO_BASE_URL||'http://127.0.0.1:8769/docs/';
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{}),args:['--no-sandbox','--enable-unsafe-swiftshader']});
 try {
  await fs.mkdir('build',{recursive:true});
  const page=await browser.newPage({viewport:{width:1440,height:700},reducedMotion:'reduce'});
  const errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
  await page.goto(base);await page.waitForSelector('.workshop-ready');
  assert.equal(requests.some(url=>url.includes('three-r180')),false,'3D waits until near the viewport');
  await page.locator('.topbar a[href="#explore"]').click();await page.waitForSelector('#radio-model[data-state="ready"]');
  assert.equal(await page.locator('#model-fallback').isVisible(),false);
  assert.equal(await page.locator('#model-spin').isVisible(),false);
  const canvas=page.locator('#radio-model canvas');await page.waitForTimeout(150);
  const closed=await canvas.screenshot();
  await page.locator('#model-open').focus();await page.keyboard.press('Enter');await page.waitForTimeout(100);
  assert.equal(await page.locator('#model-spread').inputValue(),'100');
  const opened=await canvas.screenshot();assert.notDeepEqual(closed,opened,'Open changes rendered geometry');
  await page.locator('#model-left').click();await page.waitForTimeout(100);
  assert.notDeepEqual(await canvas.screenshot(),opened,'Camera buttons rotate the scene');
  await page.locator('#model-reset').click();await page.waitForTimeout(100);
  assert.deepEqual(await canvas.screenshot(),closed,'Reset restores the initial scene');
  const bounds=await canvas.boundingBox();
  await canvas.click({position:{x:bounds.width*.5,y:bounds.height*.6}});
  assert.equal(await page.locator('[data-component="controls"]').getAttribute('aria-pressed'),'true','Clicking the model selects the front controls');
  await page.locator('#model-reset').click();
  await page.mouse.move(bounds.x+bounds.width*.5,bounds.y+bounds.height*.6);await page.mouse.down();
  await page.mouse.move(bounds.x+bounds.width*.65,bounds.y+bounds.height*.6,{steps:8});await page.mouse.up();await page.waitForTimeout(100);
  assert.notDeepEqual(await canvas.screenshot(),closed,'Dragging rotates the model');
  for(const part of ['case','speaker','brain','reader','amp','battery','controls']) {
   const b=page.locator(`[data-component="${part}"]`);await b.focus();await page.keyboard.press('Enter');
   assert.equal(await b.getAttribute('aria-pressed'),'true');assert.equal(await page.locator('.component-buttons [aria-pressed="true"]').count(),1);
   assert.equal(await page.locator('#model-spread').inputValue(),'100');
   assert.ok(await page.locator('#component-link').evaluate(a=>Boolean(document.getElementById(a.hash.slice(1))?.closest('.build-stage'))));
  }
  await page.locator('#component-link').click();await page.waitForSelector('[data-stage="5"]:visible');
  await page.locator('#model-spread').focus();await page.keyboard.press('Home');assert.equal(await page.locator('#model-spread').inputValue(),'0');
  await page.keyboard.press('End');assert.equal(await page.locator('#model-spread').inputValue(),'100');
  for(const width of [320,360,390,768,1280,1920]) {
   await page.setViewportSize({width,height:900});
   for(const selector of ['#explore','#story-path','.story-feature']) {
    await page.locator(selector).scrollIntoViewIfNeeded();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Overflow at ${width}, ${selector}`);
   }
  }
  await page.setViewportSize({width:1440,height:1050});await page.locator('[data-path-step="0"]').click();
  for(let step=1;step<=4;step++) {
   await page.locator('#path-play').click();assert.equal(await page.locator(`[data-path-step="${step%4}"]`).getAttribute('aria-pressed'),'true');
   assert.equal(await page.locator('#story-path').evaluate(e=>e.classList.contains('path-running')),false);
  }
  await page.emulateMedia({reducedMotion:'no-preference'});await page.locator('#model-spin').click();
  assert.equal(await page.locator('#model-spin').getAttribute('aria-pressed'),'true');
  await page.emulateMedia({reducedMotion:'reduce'});
  // Media-query change events arrive asynchronously, including after emulateMedia resolves.
  await page.waitForFunction(()=>document.querySelector('#model-spin').getAttribute('aria-pressed')==='false');
  assert.equal(await page.locator('#model-spin').isVisible(),false);
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.waitForFunction(()=>document.querySelector('#path-play').textContent.startsWith('Follow'));
  await page.locator('#path-play').click();await page.waitForSelector('.path-running');
  await page.waitForFunction(()=>document.querySelector('[data-path-step="1"]').getAttribute('aria-pressed')==='true');
  await page.locator('#path-play').click();
  const paused=await page.locator('.signal-path [aria-pressed="true"]').getAttribute('data-path-step');await page.waitForTimeout(3700);
  assert.equal(await page.locator('.signal-path [aria-pressed="true"]').getAttribute('data-path-step'),paused);
  await page.locator('#play-story').click();await page.waitForSelector('.story-window.is-playing');
  await page.locator('#stop-audio').click();await page.waitForFunction(()=>!document.querySelector('.story-window').classList.contains('is-playing'));
  await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#model-open').click();
  await page.locator('#explore').screenshot({path:'build/visuals-desktop.png'});await page.locator('#story-path').screenshot({path:'build/visuals-story-path.png'});await page.locator('.story-feature').screenshot({path:'build/visuals-story-scene.png'});
  await canvas.evaluate(c=>c.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());
  await page.waitForSelector('#radio-model[data-state="fallback"]');assert.equal(await page.locator('#model-fallback').isVisible(),true);
  await page.locator('[data-component="battery"]').click();assert.match(await page.locator('#component-copy').innerText(),/ON for charging/);assert.deepEqual(errors,[]);
  const failed=await browser.newPage();await failed.route('**/radio-model.js',r=>r.abort());
  await failed.goto(base+'#explore');await failed.waitForSelector('#radio-model[data-state="fallback"]');
  await failed.locator('[data-component="brain"]').click();assert.match(await failed.locator('#component-copy').innerText(),/2.4 GHz/);
  await failed.locator('#component-link').click();await failed.waitForSelector('[data-stage="4"]:visible');
  const nojs=await browser.newPage({javaScriptEnabled:false,viewport:{width:390,height:844}});await nojs.goto(base+'#explore');
  assert.equal(await nojs.locator('#model-fallback').isVisible(),true);assert.equal(await nojs.locator('.signal-path li').count(),4);assert.equal(await nojs.locator('.model-controls').isVisible(),false);
  const unsupported=await browser.newPage();
  await unsupported.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/.test(type)?null:get.call(this,type,...args);};});
  await unsupported.goto(base+'#explore');await unsupported.waitForSelector('#radio-model[data-state="fallback"]');assert.equal(await unsupported.locator('#model-fallback').isVisible(),true);
  console.log('Visuals: WebGL rendering, lazy loading, seven parts, keyboard/camera controls, six widths, reduced motion, audio animation, context loss, failed imports and no-JS/no-WebGL fallbacks passed.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
