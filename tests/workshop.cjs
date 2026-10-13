// Run with the local server and the same PLAYWRIGHT_MODULE / CHROME_PATH as browser.cjs.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const base='http://127.0.0.1:8769/docs/';
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{}),args:['--no-sandbox']});
 try {
  const context=await browser.newContext({viewport:{width:1280,height:900},reducedMotion:'reduce'});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base);await page.waitForSelector('.workshop-ready');
  assert.equal(await page.locator('.build-stage:visible').count(),1);
  assert.equal(await page.locator('[data-stage="1"]').isVisible(),true);
  await page.locator('[data-check="1-0"]').check();await page.locator('[data-check="1-1"]').check();
  assert.equal(await page.locator('#build-progress').evaluate(e=>e.value),1);
  await page.locator('[data-next="1"]').click();
  await page.locator('[data-part="board"]').selectOption('owned');
  await page.locator('[data-part="battery"]').selectOption('ordered');
  await page.locator('[data-tool="0"]').check();
  await page.reload();await page.waitForSelector('.workshop-ready');
  assert.equal(await page.locator('[data-stage="2"]').isVisible(),true);
  assert.equal(await page.locator('[data-part="board"]').inputValue(),'owned');
  assert.equal(await page.locator('[data-part="battery"]').inputValue(),'ordered');
  assert.match(await page.locator('#shopping-count').innerText(),/1 of 18 rows ready · 1 ordered · 16 still/);
  assert.equal(await page.locator('[data-tool="0"]').isChecked(),true);
  const exported=page.waitForEvent('download');await page.locator('#export-shopping').click();
  const download=await exported;await download.saveAs('build/shopping-check.txt');
  const list=await fs.readFile('build/shopping-check.txt','utf8');assert.match(list,/Already have.*DFRobot DFR1139/);assert.match(list,/Ordered.*Adafruit 1781/);assert.match(list,/TOOLS & WORKSPACE/);
  await page.evaluate(()=>{window.print=()=>{window.printRequested=true;};});
  await page.locator('#print-shopping').click();assert.equal(await page.evaluate(()=>window.printRequested),true);
  await page.emulateMedia({media:'print'});
  assert.equal(await page.locator('.build-stage:visible').count(),1);
  assert.equal(await page.locator('[data-stage="2"]').isVisible(),true);
  await page.pdf({path:'build/shopping.pdf',preferCSSPageSize:true,printBackground:true});
  await page.emulateMedia({media:'screen'});await page.evaluate(()=>dispatchEvent(new Event('afterprint')));
  // Real navigation to tools must reveal their parent stage in guided mode.
  await page.locator('.topbar a[href="#wiring-lab"]').click();
  await page.waitForSelector('#wire-picture svg');assert.equal(await page.locator('[data-stage="5"]').isVisible(),true);
  for(const [group,values] of [['rails',2],['oled',4],['controls',5],['reader',7],['amp',7]]) {
   await page.locator('#wire-group').selectOption(group);assert.equal(await page.locator('#wire-select option').count(),values);
   for(let i=0;i<values;i++) {
    const value=await page.locator('#wire-select option').nth(i).getAttribute('value');
    await page.locator('#wire-select').selectOption(value);
    const text=await page.locator('#wire-select option:checked').innerText();
    assert.ok((await page.locator('#wire-endpoints').innerText()).includes(text));
    assert.ok((await page.locator('#wire-picture svg').getAttribute('aria-label')).includes(text));
    const selected=await page.locator('#wire-picture [data-selected="true"]').count();
    assert.equal(selected,['GAIN → VIN','Speaker + / −'].includes(text)?2:1,`Highlighted module pads: ${text}`);
    if(['oled','reader','amp'].includes(group)) assert.equal(await page.locator('#wire-source').isVisible(),true);
   }
  }
  await page.locator('[data-stage-link="4"]').click();
  await page.locator('#ssid').fill('private-home');await page.locator('#password').fill('not-for-storage');
  // Browser software list must retain the tutorial's numbering across tables.
  assert.deepEqual(await page.locator('[data-stage="4"] > ol').evaluateAll(xs=>xs.map(x=>x.start)),[1,5,8,9]);
  await page.locator('[data-stage-link="7"]').click();
  assert.equal(await page.locator('#configure-radio #config-form').count(),1);
  assert.equal(await page.locator('#mode').inputValue(),'radio');
  assert.equal(await page.locator('#ssid').inputValue(),'private-home');
  assert.equal(await page.locator('#config-form').count(),1);
  const stored=await page.evaluate(()=>JSON.stringify(localStorage));assert.ok(!stored.includes('private-home'));assert.ok(!stored.includes('not-for-storage'));
  await page.locator('#reference-view').click();assert.equal(await page.locator('.build-stage:visible').count(),13);
  assert.equal(await page.locator('#configure-home #config-form').count(),1);
  await page.locator('#guided-view').click();assert.equal(await page.locator('.build-stage:visible').count(),1);
  await page.locator('[data-stage-link="12"]').click();
  assert.equal(await page.locator('#symptom option').count(),24);
  for(let i=0;i<23;i++) {
   await page.locator('#symptom').selectOption(String(i));
   let count=0;
   while(!(await page.locator('#fix-next').isDisabled())){await page.locator('#fix-next').click();assert.ok(++count<=5);}
   assert.match(await page.locator('#fix-status').innerText(),/Still stuck/);
   await page.locator('#fix-done').click();assert.match(await page.locator('#fix-status').innerText(),/Repeat this stage/);
  }
  // Every stage, both view modes, mobile and desktop; not just the landing page.
  for(const width of [360,390,768,1280,1920]) {
   await page.setViewportSize({width,height:900});
   for(let stage=1;stage<=13;stage++) {
    await page.locator(`[data-stage-link="${stage}"]`).click();
    const d=await page.evaluate(()=>({viewport:innerWidth,actual:document.documentElement.scrollWidth}));assert.ok(d.actual<=d.viewport,`Overflow ${width}px, stage ${stage}: ${d.actual}`);
   }
  }
  await page.locator('#hero-story').click();
  await page.waitForFunction(()=>document.querySelector('#audio').currentTime>.1);
  const duration=await page.locator('#audio').evaluate(a=>a.duration);assert.ok(duration>40&&duration<55,`Story duration ${duration}`);
  await page.locator('#preview-volume').fill('0');assert.equal(await page.locator('#audio').evaluate(a=>a.volume),0);
  await page.locator('#hero-stop').click();assert.equal(await page.locator('#audio').evaluate(a=>a.paused),true);
  await page.locator('#copy-story').click();assert.match(await page.locator('#demo-url').inputValue(),/pip-and-the-little-light.wav$/);assert.match(await page.locator('#player-status').innerText(),/local to your computer/);
  await page.locator('[data-stage-link="11"]').click();await page.locator('#radio-name').fill('Pip & Jo <3');await page.locator('#paper-theme').selectOption('ocean');
  const popup=context.waitForEvent('page');await page.locator('#print-labels').click();const paper=await popup;await paper.waitForSelector('.paper-ready');
  assert.equal(await paper.locator('#paper-radio-name').innerText(),'Pip & Jo <3');
  await paper.emulateMedia({media:'print'});
  assert.equal(await paper.locator('.paper-sheet:visible').count(),1);
  assert.equal(await paper.locator('#cards').isVisible(),true);
  await paper.pdf({path:'build/cards.pdf',preferCSSPageSize:true,printBackground:true});
  await paper.goto(base+'printables.html#layout');await paper.waitForSelector('.paper-ready');
  assert.equal(await paper.locator('.paper-sheet:visible').count(),1);
  assert.equal(await paper.locator('#layout').isVisible(),true);
  const mm=await paper.locator('#layout .scale-square').evaluate(el=>el.getBoundingClientRect().width/96*25.4);assert.ok(Math.abs(mm-50)<.1);
  await paper.pdf({path:'build/layout.pdf',preferCSSPageSize:true,printBackground:true});
  for (const sheet of ['bench','build-record']) {
   await paper.goto(base+'printables.html#'+sheet);await paper.waitForSelector('.paper-ready');
   assert.equal(await paper.locator('.paper-sheet:visible').count(),1);
   await paper.pdf({path:`build/${sheet}.pdf`,preferCSSPageSize:true,printBackground:true});
  }
  // Printing the guide includes hidden chapters and never the Wi-Fi form.
  await page.emulateMedia({media:'print'});assert.equal(await page.locator('.build-stage:visible').count(),13);assert.equal(await page.locator('#config-form').isVisible(),false);
  await page.emulateMedia({media:'screen'});
  const nojs=await browser.newContext({javaScriptEnabled:false});const staticPage=await nojs.newPage();await staticPage.goto(base);
  assert.equal(await staticPage.locator('.build-stage:visible').count(),13);assert.equal(await staticPage.locator('a[href="downloads/KangarooRadio_ABCKids.zip"]').first().isVisible(),true);
  assert.equal(await staticPage.locator('#ssid').isDisabled(),true);assert.equal(await staticPage.locator('#password').isDisabled(),true);assert.equal(await staticPage.locator('#config-form button[type="submit"]').isDisabled(),true);
  await nojs.close();
  const blocked=await browser.newContext();await blocked.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new Error('disabled');}}));
  const privatePage=await blocked.newPage();await privatePage.goto(base+'#wiring-lab');await privatePage.waitForSelector('.workshop-ready');
  assert.match(await privatePage.locator('#storage-status').innerText(),/storage is unavailable/);assert.equal(await privatePage.locator('#wiring-lab').isVisible(),true);await blocked.close();
  assert.deepEqual(errors,[]);
  console.log('Workshop: saved progress, all 25 wires, 23 troubleshooting flows, shopping export, form placement/privacy, 65 responsive stage views, real story audio, print/PDF scale and no-JS/storage fallbacks passed.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
