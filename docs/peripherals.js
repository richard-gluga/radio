// Original, simplified drawings. Header order and viewing orientation were
// checked against the primary sources linked below; outlines are not to scale.
export const modulePins = {
  oled: ['VCC', 'GND', 'SCL', 'SDA', 'D/C', 'CS'],
  reader: ['3.3V', 'RST', 'GND', 'IRQ', 'MISO', 'MOSI', 'SCK', 'SDA'],
  amp: ['LRC', 'BCLK', 'DIN', 'GAIN', 'SD', 'GND', 'VIN'],
};

export const moduleViews = {
  rails: {
    title: 'Breadboard supply rails',
    orientation: 'Rail sketch: confirm the connected holes and any split with your meter. Breadboards vary.',
  },
  oled: {
    title: 'DFR0650 · front',
    orientation: 'Screen facing you; the six-pin row is at the top. Left to right: VCC, GND, SCL, SDA, D/C, CS. Leave D/C and CS unconnected in factory I2C mode.',
    source: 'https://dfimg.dfrobot.com/nobody/wiki/0f30a5741938f8a67393f21c462f4786_0x0.png.webp',
    sourceLabel: 'DFRobot display pinout',
  },
  reader: {
    title: 'RC522 · component side',
    orientation: 'Components facing you; the eight-pin row is at the top and the antenna below. 3.3V is the left end, SDA the right. The lettering on the actual header may be upside down in this view. Leave IRQ unconnected.',
    source: 'https://docs.sunfounder.com/projects/inventor-lab-kit/en/latest/_images/33_rfid_module.png',
    sourceLabel: 'SunFounder reader photo',
  },
  amp: {
    title: 'Adafruit 3006 · component side',
    orientation: 'Green speaker terminal at the top; seven-pin row at the bottom. LRC is the left end, VIN the right. Speaker − is the left screw terminal and + the right. Leave SD unconnected.',
    source: 'https://cdn-shop.adafruit.com/970x728/3006-08.jpg',
    sourceLabel: 'Adafruit amplifier overhead photo',
  },
  controls: {
    title: 'Control terminal sketches',
    orientation: 'These show the electrical terminals, not exact housing dimensions. The pot centre lug is the wiper. A and B identify its two outer lugs in this drawing; swap only those two wires if clockwise lowers volume. The button has no polarity.',
  },
};

function pad(name, x, y, selected, labelY, square = false, size = 13) {
  const marker = square
    ? `<rect x="${x-6}" y="${y-6}" width="12" height="12" rx="1"`
    : `<circle cx="${x}" cy="${y}" r="6"`;
  return `<g data-peripheral-pin="${name}" data-selected="${selected}">
    ${selected ? `<circle cx="${x}" cy="${y}" r="12" fill="#ffdc90" stroke="#a74a29" stroke-width="2"/>` : ''}
    ${marker} fill="${selected ? '#fff5d8' : '#142f3c'}" stroke="#d9bd77" stroke-width="3"/>
    <text x="${x}" y="${labelY}" text-anchor="middle" font-size="${size}" font-weight="${selected ? 800 : 500}" fill="#fff6d9">${name}</text>
  </g>`;
}

function mountingHoles(points) {
  return points.map(([x,y]) => `<circle cx="${x}" cy="${y}" r="9" fill="#f1f1e8" stroke="#cbb17c" stroke-width="3"/>`).join('');
}

export function peripheralDrawing(group, target) {
  const view = moduleViews[group];
  let body = '', pads = '', destination = null, leadY = 149, localRoutes = '';
  if (group === 'oled') {
    const active = target.replace('OLED ', '');
    body = `<rect x="470" y="178" width="260" height="260" rx="12" fill="#263633"/>
      ${mountingHoles([[484,193],[716,193],[484,423],[716,423]])}
      <rect x="486" y="239" width="228" height="170" rx="3" fill="#59625c"/>
      <rect x="502" y="256" width="196" height="131" fill="#121d22"/>
      <text x="600" y="316" text-anchor="middle" font-size="14" fill="#c4d3c9">screen off</text>
      <text x="600" y="337" text-anchor="middle" font-size="12" fill="#9bac9f">disconnect power to wire</text>`;
    modulePins.oled.forEach((name,i) => {
      const x=516+i*33, y=197;
      pads += pad(name,x,y,name===active,226,i===0,12);
      if(name===active) destination={x,y};
    });
  } else if (group === 'reader') {
    const active=target.replace('RC522 ','').replace('SDA / SS','SDA');
    body=`<rect x="470" y="177" width="260" height="377" rx="7" fill="#205978"/>
      ${mountingHoles([[484,310],[716,310],[491,527],[709,527]])}
      <rect x="581" y="252" width="39" height="39" fill="#132a36"/>
      <rect x="685" y="240" width="20" height="48" rx="9" fill="#c9d0c6"/>
      ${[0,1,2,3].map(i=>`<rect x="${483+i*6}" y="${331+i*6}" width="${234-i*12}" height="${208-i*12}" rx="${24-i*3}" fill="none" stroke="#2e7690" stroke-width="3"/>`).join('')}
      <path d="M553 386 Q520 435 553 484 M569 398 Q545 435 569 472 M647 386 Q680 435 647 484 M631 398 Q655 435 631 472" stroke="#d1e0d8" stroke-width="4" fill="none"/>
      <circle cx="600" cy="435" r="8" fill="#d1e0d8"/>
      <text x="600" y="514" text-anchor="middle" font-size="16" fill="#e7ece2">RFID-RC522</text>`;
    modulePins.reader.forEach((name,i)=>{
      const x=491+i*31, y=197;
      pads+=pad(name,x,y,name===active,225,name==='SDA',11);
      if(name===active) destination={x,y};
    });
  } else if (group === 'amp') {
    const active=target.replace('Amplifier ','');
    const gainLink=active==='GAIN → VIN';
    const speaker=active==='Speaker + / −';
    body=`<rect x="473" y="175" width="254" height="260" rx="17" fill="#146080"/>
      ${mountingHoles([[495,198],[705,198]])}
      <rect x="540" y="178" width="120" height="72" rx="4" fill="#71aa82" stroke="#335b42" stroke-width="3"/>
      <circle cx="570" cy="211" r="17" fill="#ced6c8"/><circle cx="630" cy="211" r="17" fill="#ced6c8"/>
      <path d="M557 220l26-18 M617 220l26-18" stroke="#6a7769" stroke-width="4"/>
      <text x="526" y="217" text-anchor="middle" font-size="24" fill="white">−</text><text x="674" y="217" text-anchor="middle" font-size="24" fill="white">+</text>
      <rect x="583" y="286" width="34" height="36" fill="#16323c"/>
      <text x="600" y="274" text-anchor="middle" font-size="15" fill="#edf1e5">MAX98357A</text>
      <rect x="498" y="516" width="224" height="100" rx="12" fill="#39403a"/>
      <circle cx="554" cy="566" r="37" fill="#1c2a24" stroke="#7c897d" stroke-width="4"/>
      <circle cx="666" cy="566" r="37" fill="#1c2a24" stroke="#7c897d" stroke-width="4"/>
      <text x="610" y="641" text-anchor="middle" font-size="13" fill="#17352e">Enclosed speaker · two leads only</text>`;
    modulePins.amp.forEach((name,i)=>{
      const x=497+i*34, y=389;
      pads+=pad(name,x,y,name===active||(gainLink&&['GAIN','VIN'].includes(name)),i%2===0?371:420,false,13);
      if(name===active) destination={x,y};
    });
    if(gainLink) localRoutes='<path data-local-link="gain" d="M599 389 C599 322 701 322 701 389" stroke="#a94b26" stroke-width="5" fill="none"/>';
    if(speaker) {
      localRoutes='<path d="M570 211 V140 H455 V503 H555 V530" stroke="#35454b" stroke-width="5" fill="none"/><path d="M630 211 V150 H747 V503 H667 V530" stroke="#b84532" stroke-width="5" fill="none"/>';
      pads+=`<g data-peripheral-pin="speaker-minus" data-selected="true"><circle cx="570" cy="211" r="21" fill="none" stroke="#ffdb91" stroke-width="4"/></g><g data-peripheral-pin="speaker-plus" data-selected="true"><circle cx="630" cy="211" r="21" fill="none" stroke="#ffdb91" stroke-width="4"/></g>`;
    }
    leadY=470;
  } else if (group === 'controls') {
    body=`<circle cx="600" cy="238" r="65" fill="#d1c6a6" stroke="#7e7253" stroke-width="5"/>
      <circle cx="600" cy="238" r="29" fill="#a9966c"/>
      <text x="600" y="245" text-anchor="middle" font-size="15" fill="#27392f">10 kΩ</text>
      <rect x="537" y="298" width="126" height="46" rx="5" fill="#445143"/>
      <text x="600" y="375" text-anchor="middle" font-size="14" fill="#17352e">Pot terminals · centre = wiper</text>
      <circle cx="600" cy="470" r="49" fill="#536254" stroke="#aab3a4" stroke-width="6"/>
      <rect x="558" y="491" width="84" height="49" rx="6" fill="#344136"/>
      <text x="600" y="575" text-anchor="middle" font-size="14" fill="#17352e">Button terminals · no polarity</text>`;
    const lugs=[['Pot outer lug A','A',554,316],['Pot middle lug','middle',600,316],['Pot outer lug B','B',646,316],['Button terminal 1','1',576,510],['Button terminal 2','2',624,510]];
    for(const [name,label,x,y] of lugs){pads+=pad(label,x,y,name===target,y+22,false,12);if(name===target)destination={x,y};}
    leadY=destination.y;
  } else {
    body=`<rect x="473" y="182" width="254" height="365" rx="10" fill="#e0dfd0" stroke="#b7bcab"/>
      <text x="600" y="218" text-anchor="middle" font-size="15" fill="#17352e">Mark these rails yourself</text>
      <path d="M553 260 V460" stroke="#b84532" stroke-width="5"/><path d="M648 260 V460" stroke="#35454b" stroke-width="5"/>
      ${[0,1,2,3,4,5].map(i=>`<circle cx="553" cy="${266+i*36}" r="5" fill="#5c675c"/><circle cx="648" cy="${266+i*36}" r="5" fill="#5c675c"/>`).join('')}
      <text x="553" y="246" text-anchor="middle" font-size="17" fill="#923724">3V3</text><text x="648" y="246" text-anchor="middle" font-size="17" fill="#273c44">GND</text>
      <text x="600" y="505" text-anchor="middle" font-size="13" fill="#17352e">Rail sketch · check continuity</text>`;
    destination={x:target==='3V3 rail'?553:648,y:266};
    pads=`<circle data-peripheral-pin="${target}" data-selected="true" cx="${destination.x}" cy="266" r="12" fill="#ffdc90" stroke="#a74a29" stroke-width="3"/>`;
    leadY=160;
  }
  return {body,pads,destination,leadY,localRoutes,title:view.title};
}
