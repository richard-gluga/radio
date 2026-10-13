// Endpoints match Hardware.h and README. Coordinates follow DFR1139's official
// component-side pinout (USB at the top); peripheral endpoints are schematic.
export const wires = [
  ['rails','3V3','3V3 rail','Use one board 3V3 pin for the marked breadboard supply rail. Check any rail split with continuity while unpowered.','power'],
  ['rails','GND','GND rail','Use one board GND pin for the ground rail. Keep this rail separate from 3V3.','ground'],
  ['oled','3V3','OLED VCC','Connect via the 3V3 rail. The screen’s VCC label does not mean the board’s VCC pin.','power'],
  ['oled','GND','OLED GND','Connect via the GND rail.','ground'],
  ['oled','22','OLED SCL','Board label SCL / GPIO22. Keep factory I2C mode on the DFR0650.','signal'],
  ['oled','21','OLED SDA','Board label SDA / GPIO21. Leave OLED D/C and CS unconnected.','signal'],
  ['controls','3V3','Pot outer lug A','Connect one outer lug to the 3V3 rail. Outer-lug letters here are diagram labels, not markings on the part.','power'],
  ['controls','GND','Pot outer lug B','Connect the other outer lug to GND. If clockwise later lowers volume, unplug power and swap only the two outer wires.','ground'],
  ['controls','35','Pot middle lug','GPIO35 / A3 goes to the centre lug (wiper). Keep this centre connection when reversing the outer wires.','signal'],
  ['controls','14','Button terminal 1','GPIO14 / D6. Use the two-terminal normally-open momentary button.','signal'],
  ['controls','GND','Button terminal 2','Connect to GND. The firmware supplies the pull-up; no external resistor is needed.','ground'],
  ['reader','3V3','RC522 3.3V','Connect via the 3V3 rail. Never power the reader from board VCC.','power'],
  ['reader','GND','RC522 GND','Connect via the shared GND rail.','ground'],
  ['reader','4','RC522 SDA / SS','GPIO4 / D12. On this reader, SDA is SPI chip select; it is not the OLED SDA connection.','signal'],
  ['reader','18','RC522 SCK','GPIO18 / SCK. Keep SPI leads short, preferably under 15 cm.','signal'],
  ['reader','23','RC522 MOSI','GPIO23 / MOSI.','signal'],
  ['reader','19','RC522 MISO','GPIO19 / MISO.','signal'],
  ['reader','17','RC522 RST','GPIO17 / D10. Leave IRQ unconnected.','signal'],
  ['amp','VCC','Amplifier VIN','Use a short 22 AWG soldered lead from board VCC. Measure supplies as described in step 6 before completing this connection.','power'],
  ['amp','GND','Amplifier GND','Use a short 22 AWG soldered lead. Keep the board’s signal-ground rail connection too.','ground'],
  ['amp','26','Amplifier BCLK','GPIO26 / D3.','signal'],
  ['amp','25','Amplifier LRC','GPIO25 / D2. LRC can also be labelled LRCLK or WS.','signal'],
  ['amp','13','Amplifier DIN','GPIO13 / D7. This is digital audio data.','signal'],
  ['amp','local','GAIN → VIN','Solder an insulated link between GAIN and VIN on the amplifier for 6 dB gain. Leave SD unconnected.','local'],
  ['amp','speaker','Speaker + / −','The speaker’s two leads go to the two amplifier output terminals only. Neither terminal connects to GND. Keep the speaker enclosure intact.','local'],
];
export const pinLabels = {'3V3':'3V3','GND':'GND','VCC':'VCC','22':'GPIO22 / SCL','21':'GPIO21 / SDA','35':'GPIO35 / A3','14':'GPIO14 / D6','4':'GPIO4 / D12','18':'GPIO18 / SCK','23':'GPIO23 / MOSI','19':'GPIO19 / MISO','17':'GPIO17 / D10','26':'GPIO26 / D3','25':'GPIO25 / D2','13':'GPIO13 / D7'};
const left = ['RST','3V3','3V3','GND','EN','18','23','19','22','21','2','13','14','0','26','25','1','3'];
const right = ['VCC','3V3','GND','22','21','15','35','34','39','36','12','4','NC','17'];
const colours = {power:'#b84532',ground:'#273c44',signal:'#216c8e',local:'#8b5730'};
export function wiringSvg(index) {
  const [group,pin,target,,kind] = wires[index];
  const colour = colours[kind];
  let points = '';
  let selected = null;
  for (const [side,list] of [['left',left],['right',right]]) {
    list.forEach((name,i) => {
      const x = side === 'left' ? 115 : 305, y = 143 + (i + (side === 'right' ? 4 : 0)) * 26;
      const on = name === pin;
      if (on) selected = {x,y};
      points += `<g><circle cx="${x}" cy="${y}" r="${on?8:5}" fill="${on?'#ffe3a5':'#d2dcd3'}" stroke="${on?'#af572e':'#6f8177'}" stroke-width="${on?3:1}"/><text x="${side==='left'?98:322}" y="${y+5}" text-anchor="${side==='left'?'end':'start'}" fill="${on?'#9a3c23':'#53665f'}" font-size="16" font-weight="${on?800:400}">${name}</text></g>`;
    });
  }
  const labels = {rails:'Breadboard rails',oled:'DFR0650 OLED',controls:'Knob & button',reader:'CN0090 RC522',amp:'Adafruit 3006'};
  const from = pinLabels[pin] || (pin==='local'?'On the amplifier':'Speaker outputs');
  const endpoints = wires.filter(w=>w[0]===group);
  const active = endpoints.findIndex(w=>w===wires[index]);
  const targetY = 176 + active * 43;
  let route = '';
  if (selected) {
    const viaRail = (pin==='3V3' || pin==='GND') && group!=='amp' && group!=='rails';
    route = `<path d="M${selected.x} ${selected.y} H402 V${targetY} H465" stroke="${colour}" stroke-width="4" fill="none" stroke-linejoin="round"/>`;
    if (viaRail) route += `<rect x="373" y="${targetY-11}" width="56" height="22" rx="4" fill="#fff4d8" stroke="${colour}"/><text x="401" y="${targetY+4}" text-anchor="middle" font-size="12">via rail</text>`;
  } else {
    route = `<path d="M466 ${targetY} H430 V${targetY+23} H466" stroke="${colour}" stroke-width="4" fill="none"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 685" role="img" aria-label="${from} to ${target}"><rect x="0" y="0" width="760" height="685" rx="20" fill="#f1f1e8"/><text x="208" y="36" text-anchor="middle" font-size="17" fill="#17352e">DFR1139 · component side</text><rect x="105" y="68" width="210" height="561" rx="18" fill="#35493d"/><rect x="180" y="58" width="61" height="47" rx="5" fill="#cbd3cc" stroke="#718077"/><text x="210" y="87" text-anchor="middle" font-size="13">USB-C</text><rect x="144" y="399" width="134" height="158" rx="5" fill="#c6ccc3"/><text x="211" y="452" text-anchor="middle" font-size="17">ESP32</text><text x="211" y="480" text-anchor="middle" font-size="16">N16R2</text><path d="M150 584h12v20h12v-20h12v20h12v-20h12v20h12v-20h12v20h12v-20h12" fill="none" stroke="#c6a557" stroke-width="4"/><rect x="243" y="138" width="44" height="63" fill="#e8dfb0"/><text x="265" y="172" text-anchor="middle" font-size="12">BAT</text>${points}${route}<rect x="459" y="91" width="279" height="${endpoints.length*43+95}" rx="12" fill="white" stroke="#bbcabc"/><text x="599" y="125" text-anchor="middle" font-size="18" fill="#17352e">${labels[group]}</text><text x="599" y="145" text-anchor="middle" font-size="12" fill="#53665f">SCHEMATIC ENDPOINTS</text>${endpoints.map((w,i)=>`<g><rect x="472" y="${159+i*43}" width="253" height="34" rx="6" fill="${i===active?'#ffebbf':'#f3f5ef'}" stroke="${i===active?colour:'#d4dcd3'}"/><circle cx="474" cy="${176+i*43}" r="5" fill="${i===active?colour:'#a9b8aa'}"/><text x="490" y="${181+i*43}" font-size="16" fill="#17352e" font-weight="${i===active?700:400}">${w[2]}</text></g>`).join('')}<text x="380" y="661" text-anchor="middle" font-size="16" fill="#17352e">POWER DISCONNECTED · Match labels before connecting</text></svg>`;
}
