import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {wires, wiringSvg, boardHeaders} from '../docs/wiring.js';
import {modulePins, peripheralDrawing} from '../docs/peripherals.js';

test('physical power and unconnected pads match the DFR1139 v1.0 schematic P1/P3',()=>{
 assert.deepEqual(boardHeaders.left.slice(0,5),['RST','3V3','NC','GND','EN']);
 assert.deepEqual(boardHeaders.right.slice(0,3),['VCC','3V3','GND']);
 assert.equal(boardHeaders.right[12],'NC');
 assert.equal(boardHeaders.left.length,18);assert.equal(boardHeaders.right.length,14);
});

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
  const svg=wiringSvg(i);assert.ok(svg.includes(wires[i][2]));assert.ok(svg.includes('component side'));assert.ok(svg.includes('data-selected="true"'));assert.ok(!svg.includes('undefined'));
 }
});

test('peripheral pin orders match front/component-side manufacturer references',()=>{
 assert.deepEqual(modulePins.oled,['VCC','GND','SCL','SDA','D/C','CS']);
 assert.deepEqual(modulePins.reader,['3.3V','RST','GND','IRQ','MISO','MOSI','SCK','SDA']);
 assert.deepEqual(modulePins.amp,['LRC','BCLK','DIN','GAIN','SD','GND','VIN']);
 for(const [group,pin,target] of wires){
  const drawing=peripheralDrawing(group,target);
  if(!['local','speaker'].includes(pin)){
   assert.ok(drawing.destination, target);
   assert.ok(drawing.destination.x>=470 && drawing.destination.x<=730, target);
   assert.ok(drawing.destination.y>=175 && drawing.destination.y<=550, target);
  }
 }
 const gain=peripheralDrawing('amp','GAIN → VIN');
 for(const pin of ['GAIN','VIN']) assert.match(gain.pads,new RegExp(`data-peripheral-pin="${pin}" data-selected="true"`));
 const speaker=peripheralDrawing('amp','Speaker + / −');
 for(const pin of ['speaker-minus','speaker-plus']) assert.match(speaker.pads,new RegExp(`data-peripheral-pin="${pin}" data-selected="true"`));
});
