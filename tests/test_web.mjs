import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {configuration, cppString, zipFiles, PlaybackSession} from '../docs/lib.js';

const values = {ssid: ' Family"WiFi\\Name ', password: 'pass"word\\n', backupSsid: '', backupPassword: '', cap: '10', startup: '0', mode: 'radio'};
test('credentials preserve spaces, quotes, backslashes and UTF-8 bytes', () => {
  const config = configuration(values);
  assert.ok(config.includes('" Family\\"WiFi\\\\Name "'));
  assert.ok(config.includes('"pass\\"word\\\\n"'));
  assert.equal(cppString('éA'), '"\\303\\251A"');
  assert.equal(cppString(''), '""');
});
test('empty passwords stay empty, missing networks and invalid limits fail', () => {
  assert.ok(configuration({...values, password: ''}).includes('WIFI_PASSWORD[] = "";'));
  assert.throws(() => configuration({...values, ssid: '', password: ''}));
  assert.ok(configuration({...values, ssid: '', password: '', mode: 'test'}).includes('HARDWARE_TEST = true'));
  for (const cap of ['22', '-1', '1.5', 'NaN']) assert.throws(() => configuration({...values, cap}));
  assert.throws(() => configuration({...values, startup: '6'}));
  assert.throws(() => configuration({...values, ssid: 'é'.repeat(17)}));
  assert.throws(() => configuration({...values, backupPassword: 'password'}));
  assert.throws(() => configuration({...values, password: 'short'}));
});
test('replacing/stopping a playback session invalidates callbacks and cleans once', () => {
  const player = new PlaybackSession();
  let first = 0, second = 0;
  const a = player.begin(() => ++first);
  assert.equal(player.current(a), true);
  const b = player.begin(() => ++second);
  assert.equal(first, 1); assert.equal(second, 0);
  assert.equal(player.current(a), false); assert.equal(player.current(b), true);
  player.stop(); player.stop();
  assert.equal(second, 1); assert.equal(player.current(b), false);
});
test('produce configured ZIP for independent Python/C++ verification', async () => {
  const manifest = JSON.parse(await readFile(new URL('../docs/downloads/manifest.json', import.meta.url)));
  const files = {};
  for (const item of manifest.files) files[`${manifest.folder}/${item.name}`] = item.name === 'RadioConfig.h' ? configuration(values) : new Uint8Array(await readFile(new URL(`../firmware/${manifest.folder}/${item.name}`, import.meta.url)));
  const archive = new Uint8Array(await zipFiles(files).arrayBuffer());
  assert.equal(new DataView(archive.buffer).getUint32(0, true), 0x04034b50);
  await mkdir(new URL('../build/', import.meta.url), {recursive: true});
  await writeFile(new URL('../build/web-generated.zip', import.meta.url), archive);
  await writeFile(new URL('../build/web-generated-config.h', import.meta.url), configuration(values));
});
