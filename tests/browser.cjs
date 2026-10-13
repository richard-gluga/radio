// Start python3 -m http.server 8769 --bind 127.0.0.1 at the repo root first.
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
(async () => {
  const browser = await chromium.launch({headless: true, ...(process.env.CHROME_PATH ? {executablePath: process.env.CHROME_PATH} : {}), args: ['--no-sandbox']});
  try {
    const page = await browser.newPage({viewport: {width:1280,height:900}});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:8769/?review=1#configure');
    await page.waitForURL('**/docs/index.html?review=1#configure');
    await page.waitForSelector('.station-card');
    for (const width of [360,390,768,1280,1920]) {
      await page.setViewportSize({width,height:900});
      const dimensions = await page.evaluate(() => ({viewport: innerWidth, actual: document.documentElement.scrollWidth}));
      assert.ok(dimensions.actual <= dimensions.viewport, `Overflow at ${width}: ${dimensions.actual}`);
    }
    await page.locator('#mode').selectOption('radio');
    await page.locator('#ssid').fill(' Family"WiFi\\Name ');
    await page.locator('#password').fill('pass"word\\n');
    await page.locator('#volume-cap').fill('11');
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', {name:'Download complete sketch ZIP'}).click();
    const download = await downloadPromise;
    await fs.mkdir(path.resolve('build'), {recursive:true});
    await download.saveAs(path.resolve('build/browser-generated.zip'));
    assert.match(await page.locator('#config-status').innerText(), /Downloaded/);
    // A deployment changed halfway through a download: do not offer mixed files.
    await page.route('**/downloads/KangarooRadio_ABCKids/Hardware.h', route => route.fulfill({body:'changed', contentType:'text/plain'}));
    await page.getByRole('button', {name:'Download complete sketch ZIP'}).click();
    await page.waitForFunction(() => document.querySelector('#config-status').textContent.includes('updated during download'));
    await page.unroute('**/downloads/KangarooRadio_ABCKids/Hardware.h');

    // Actual browser decoding of the original WAV, not a mocked duration.
    await page.locator('#play-demo').click();
    await page.waitForFunction(() => document.querySelector('#audio').currentTime > .1);
    assert.equal(await page.locator('#audio').evaluate(a => a.duration), 5);
    await page.locator('#stop-audio').click();
    assert.equal(await page.locator('#player').isVisible(), false);
    assert.equal(await page.locator('#audio').evaluate(a => a.paused), true);

    // Deterministically deliver obsolete media events/promises after close/switch.
    await page.evaluate(() => {
      window.oldAudio = null;
      window.pendingPlay = [];
      HTMLMediaElement.prototype.play = function() {
        window.pendingPlay.push(this);
        return new Promise((resolve,reject) => { this.resolvePlay = resolve; this.rejectPlay = reject; });
      };
    });
    await page.locator('#play-demo').click();
    await page.evaluate(() => { window.oldAudio = document.querySelector('#audio'); });
    await page.locator('#stop-audio').click();
    await page.evaluate(() => oldAudio.rejectPlay(new Error('late error')));
    assert.equal(await page.locator('#player-status').innerText(), 'Stopped.');
    await page.locator('#play-demo').click();
    await page.evaluate(() => { window.oldAudio = document.querySelector('#audio'); });
    await page.getByRole('button', {name:'Listen to Fun Kids UK', exact:true}).click();
    await page.evaluate(() => {
      const next = document.querySelector('#audio');
      next.resolvePlay(); next.dispatchEvent(new Event('playing'));
      oldAudio.rejectPlay(new Error('obsolete failure')); oldAudio.dispatchEvent(new Event('ended'));
    });
    assert.equal(await page.locator('#player-title').innerText(), 'Fun Kids UK');
    assert.equal(await page.locator('#player-status').innerText(), 'Playing Fun Kids UK.');
    await page.evaluate(() => document.querySelector('#audio').dispatchEvent(new Event('error')));
    assert.match(await page.locator('#player-status').innerText(), /could not load/);
    await page.locator('#stop-audio').click();
    await page.locator('#copy-demo').click();
    assert.match(await page.locator('#player-status').innerText(), /local to your computer/);
    assert.deepEqual(errors, []);
    await page.setViewportSize({width:390,height:844});
    await page.locator('.parts-table').evaluate(el => el.scrollIntoView({block:'start',behavior:'instant'}));
    await page.screenshot({path:'build/mobile-parts.png'});
    await page.locator('#configure').scrollIntoViewIfNeeded();
    await page.screenshot({path:'build/mobile.png'});
    await page.setViewportSize({width:1280,height:900});
    await page.evaluate(() => scrollTo(0,0));
    await page.screenshot({path:'build/desktop.png'});
    console.log('Browser: responsive layout, ZIP download/integrity, real WAV, close/switch races and errors passed.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
