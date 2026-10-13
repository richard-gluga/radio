import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {wires, wiringSvg} from '../docs/wiring.js';

test('interactive signal endpoints match the firmware pin constants',async()=>{
 const source=await readFile(new URL('../firmware/KangarooRadio_ABCKids/Hardware.h',import.meta.url),'utf8');
 const mapping={'OLED SCL':'OLED_SCL','OLED SDA':'OLED_SDA','Pot middle lug':'VOLUME','Button terminal 1':'BUTTON','RC522 SDA / SS':'RFID_CS','RC522 SCK':'RFID_SCK','RC522 MOSI':'RFID_MOSI','RC522 MISO':'RFID_MISO','RC522 RST':'RFID_RST','Amplifier BCLK':'I2S_BCLK','Amplifier LRC':'I2S_LRC','Amplifier DIN':'I2S_DOUT'};
 assert.equal(wires.filter(w=>w[4]==='signal').length,Object.keys(mapping).length);
 for(const [target,constant] of Object.entries(mapping)){
  const pin=source.match(new RegExp(`PIN_${constant} = (\\d+);`))[1];
  assert.equal(wires.find(w=>w[2]===target)[1],pin,target);
 }
 assert.equal(wires.find(w=>w[2]==='Amplifier VIN')[1],'VCC');
 for(const target of ['OLED VCC','RC522 3.3V','Pot outer lug A']) assert.equal(wires.find(w=>w[2]===target)[1],'3V3');
 assert.match(wires.find(w=>w[1]==='speaker')[3],/Neither terminal connects to GND/);
});
test('every connection can render and describes the selected endpoints',()=>{
 for(let i=0;i<wires.length;i++){
  const svg=wiringSvg(i);assert.ok(svg.includes(wires[i][2]));assert.ok(svg.includes('component side'));assert.ok(svg.includes('SCHEMATIC ENDPOINTS'));assert.ok(!svg.includes('undefined'));
 }
});
