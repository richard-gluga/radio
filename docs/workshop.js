import {wires, pinLabels, wiringSvg} from './wiring.js';
import {moduleViews} from './peripherals.js';
const $ = id => document.getElementById(id);
const stages = [...document.querySelectorAll('.build-stage')];
const checks = [...document.querySelectorAll('[data-check]')];
const key = 'kangaroo-build-v1';
const allowedChecks = new Set(checks.map(c=>c.dataset.check));
const rows = [...document.querySelectorAll('.parts-table tbody tr')];
const partKeys = ['board','amplifier','speaker','display','reader','tags','battery','switch','button','pot','knob','extension','jumpers','breadboard-protoboard','mounting-wire','usb','enclosure','finishing'];
const choices = {need:'Need to buy',ordered:'Ordered',owned:'Already have',received:'Received'};
let state = {step:1,view:'guided',checks:[],shopping:{},tools:[]};
let persistent = true;
let lastFormStage = null;
try {
  const saved = JSON.parse(localStorage.getItem(key));
  if (saved && typeof saved === 'object') {
    state.step = Number.isInteger(saved.step) && saved.step>=1 && saved.step<=13 ? saved.step : 1;
    state.view = saved.view === 'reference' ? 'reference' : 'guided';
    state.checks = Array.isArray(saved.checks) ? saved.checks.filter(c=>allowedChecks.has(c)) : [];
    state.shopping = Object.fromEntries(partKeys.map(k=>[k,Object.hasOwn(choices,saved.shopping?.[k])?saved.shopping[k]:'need']));
    state.tools = Array.isArray(saved.tools) ? saved.tools.filter(x=>Number.isInteger(x)&&x>=0&&x<9) : [];
  }
} catch { persistent = false; }
function save() {
  try { localStorage.setItem(key,JSON.stringify(state)); persistent = true; }
  catch { persistent = false; }
  $('storage-status').textContent = persistent ? 'Checkmarks and shopping choices stay on this browser. Wi-Fi details are never saved.' : 'Browser storage is unavailable. Progress works in this tab but may be lost when you leave. Wi-Fi details are never saved.';
}
function progress() {
  let complete = 0;
  for (let i=1;i<=13;i++) {
    const group = checks.filter(c=>c.dataset.check.startsWith(i+'-'));
    const done = group.every(c=>c.checked);
    if (done) complete++;
    const a = document.querySelector(`[data-stage-link="${i}"]`);
    a.classList.toggle('complete',done);
    a.querySelector('.step-tick').textContent = done?'✓':'';
    a.setAttribute('aria-label',`${i}. ${a.children[1].textContent}${done?', checked':''}`);
  }
  $('build-progress').value=complete;
  $('progress-text').textContent=`${complete} of 13 stages checked · currently on step ${state.step}.`;
  $('progress-title').textContent=complete===13?'Your build notes are complete.':'One small step at a time.';
}
function reveal(step,{focus=false,hash=false}={}) {
  state.step=step;
  document.body.classList.toggle('guided-mode',state.view==='guided');
  for (const stage of stages) stage.hidden=state.view==='guided' && Number(stage.dataset.stage)!==step;
  // One live form, moved between the two upload stages. Values are never copied
  // to storage or a second hidden form, so switching modes preserves input.
  (state.view==='guided'&&step===7?$('configure-radio'):$('configure-home')).append($('configure'));
  if (state.view==='guided' && [4,7].includes(step) && lastFormStage!==step) {
    $('mode').value=step===7?'radio':'test';
    lastFormStage=step;
  }
  $('configure-title').textContent=state.view==='guided'&&step===7?'Download Normal radio firmware':'Make your firmware download';
  for (const link of document.querySelectorAll('[data-stage-link]')) {
    if(Number(link.dataset.stageLink)===step) link.setAttribute('aria-current','step'); else link.removeAttribute('aria-current');
  }
  $('guided-view').setAttribute('aria-pressed',String(state.view==='guided'));
  $('reference-view').setAttribute('aria-pressed',String(state.view==='reference'));
  const title=stages[step-1].querySelector('h2');
  if(hash) history.replaceState(null,'','#'+title.id);
  if(focus) { title.focus({preventScroll:true}); title.scrollIntoView({block:'start'}); }
  progress(); save();
}
function followHash() {
  let id;
  try { id=decodeURIComponent(location.hash.slice(1)); } catch { return; }
  const target=$(id);
  if(!target) return;
  const stage=target.closest('.build-stage');
  if(stage) { reveal(Number(stage.dataset.stage)); requestAnimationFrame(()=>target.scrollIntoView({block:'start'})); }
}
checks.forEach(c=>{
  c.checked=state.checks.includes(c.dataset.check);
  c.addEventListener('change',()=>{ state.checks=checks.filter(x=>x.checked).map(x=>x.dataset.check); progress();save(); });
});
document.querySelectorAll('[data-tool]').forEach(c=>{
  c.checked=state.tools.includes(Number(c.dataset.tool));
  c.addEventListener('change',()=>{state.tools=[...document.querySelectorAll('[data-tool]:checked')].map(x=>Number(x.dataset.tool)); save();});
});
document.querySelectorAll('[data-next]').forEach(b=>b.addEventListener('click',()=>{
  const n=Number(b.dataset.next);
  if(n<13) reveal(n+1,{focus:true,hash:true});
  else { $('build-dashboard').scrollIntoView({block:'start'}); $('progress-title').setAttribute('tabindex','-1'); $('progress-title').focus({preventScroll:true}); }
}));
document.querySelectorAll('[data-previous]').forEach(b=>{
  const n=Number(b.dataset.previous);b.disabled=n===1;
  b.addEventListener('click',()=>reveal(n-1,{focus:true,hash:true}));
});
document.querySelectorAll('[data-stage-link]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();reveal(Number(a.dataset.stageLink),{focus:true,hash:true});}));
$('guided-view').addEventListener('click',()=>{state.view='guided';reveal(state.step,{focus:true});});
$('reference-view').addEventListener('click',()=>{state.view='reference';reveal(state.step);});
for(const id of ['start-build','resume-build']) $(id).addEventListener('click',e=>{e.preventDefault();reveal(state.step,{focus:true,hash:true});});
$('reset-build').addEventListener('click',()=>{
  if(!confirm('Clear build and tool checkmarks on this browser? Shopping choices and Wi-Fi form entries are unchanged.'))return;
  state.checks=[]; state.tools=[];checks.forEach(c=>c.checked=false);document.querySelectorAll('[data-tool]').forEach(c=>c.checked=false);reveal(1,{focus:true,hash:true});
});
addEventListener('hashchange',followHash);
// The same hash may already be selected when a hidden-stage link is clicked.
document.addEventListener('click',e=>{
  const a=e.target.closest('a[href^="#"]');
  if(a?.hash===location.hash) followHash();
});

function shoppingCount() {
  const counts={need:0,ordered:0,ready:0};
  for(const k of partKeys) { const v=state.shopping[k]||'need'; counts[v==='owned'||v==='received'?'ready':v]++; }
  $('shopping-count').textContent=`${counts.ready} of ${rows.length} rows ready · ${counts.ordered} ordered · ${counts.need} still to buy`;
}
rows.forEach((row,i)=>{
  const select=document.createElement('select');select.dataset.part=partKeys[i];
  select.setAttribute('aria-label','Shopping status: '+row.cells[1].textContent);
  for(const [value,label] of Object.entries(choices)) { const option=new Option(label,value);select.append(option); }
  select.value=state.shopping[partKeys[i]]||'need';
  const td=document.createElement('td');td.dataset.label='My checklist';td.className='shopping-status';td.append(select);row.append(td);
  const update=()=>row.classList.toggle('part-ready',['owned','received'].includes(select.value)); update();
  select.addEventListener('change',()=>{state.shopping[partKeys[i]]=select.value;update();shoppingCount();save();});
});
const th=document.createElement('th');th.textContent='My checklist';document.querySelector('.parts-table thead tr').append(th);
function download(text,name,type='text/plain') {
  const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
$('export-shopping').addEventListener('click',()=>{
  const list=rows.map((r,i)=>`[${choices[state.shopping[partKeys[i]]||'need']}] ${r.cells[0].textContent} × ${r.cells[1].textContent}\n${r.cells[2].textContent}\n${[...r.cells[3].querySelectorAll('a')].map(a=>a.href).join('\n')}`).join('\n\n');
  const tools=[...document.querySelectorAll('[data-tool]')].map(c=>`[${c.checked?'ready':'need'}] ${c.parentElement.textContent}`).join('\n');
  download('KANGAROO RADIO — SHOPPING CHECKLIST\n'+list+'\n\nTOOLS & WORKSPACE\n'+tools+'\n\nCheck current prices, package contents, quantities and delivery.\n','kangaroo-shopping-list.txt');
});
$('print-shopping').addEventListener('click',()=>{document.body.classList.add('printing-shopping');window.print();});
addEventListener('afterprint',()=>document.body.classList.remove('printing-shopping'));

let wireIndex=0;
function drawWire() {
  const wire=wires[wireIndex];
  const siblings=wires.map((w,i)=>({w,i})).filter(x=>x.w[0]===wire[0]);
  $('wire-group').value=wire[0];$('wire-select').replaceChildren(...siblings.map(({w,i})=>new Option(w[2],i,i===wireIndex,i===wireIndex)));
  $('wire-picture').innerHTML=wiringSvg(wireIndex);
  $('wire-count').textContent=`Connection ${siblings.findIndex(x=>x.i===wireIndex)+1} of ${siblings.length} in this group`;
  $('wire-endpoints').textContent=(pinLabels[wire[1]]?pinLabels[wire[1]]+' → ':'')+wire[2];
  $('wire-note').textContent=wire[3];$('wire-back').disabled=wireIndex===0;$('wire-next').disabled=wireIndex===wires.length-1;
  const view=moduleViews[wire[0]];
  $('wire-orientation').textContent=view.orientation;
  $('wire-source').hidden=!view.source;
  if(view.source){$('wire-source').href=view.source;$('wire-source').textContent=view.sourceLabel;}
  else $('wire-source').removeAttribute('href');
}
$('wire-group').addEventListener('change',()=>{wireIndex=wires.findIndex(w=>w[0]===$('wire-group').value);drawWire();});
$('wire-select').addEventListener('change',()=>{wireIndex=Number($('wire-select').value);drawWire();});
$('wire-back').addEventListener('click',()=>{wireIndex=Math.max(0,wireIndex-1);drawWire();});
$('wire-next').addEventListener('click',()=>{wireIndex=Math.min(wires.length-1,wireIndex+1);drawWire();});
$('wire-zoom').addEventListener('change',()=>{$('wire-picture').classList.toggle('zoomed',$('wire-zoom').checked);});
document.querySelectorAll('[data-wire-jump]').forEach(a=>a.addEventListener('click',()=>{wireIndex=wires.findIndex(w=>w[0]===a.dataset.wireJump);drawWire();}));

// Each symptom starts with a focused check. The complete canonical advice stays
// visible in the table underneath, including when JavaScript is unavailable.
const troubleshooting=[...document.querySelectorAll('.troubleshooting-table tbody tr')];
const sequences = [
 ['Try a known USB data cable with the bare board.','Try another computer USB port.','Check the CH340 driver and, on Linux, serial-port permissions.'],
 ['Select the port that appears when you plug in the board.','Close other serial programs, reset and retry Upload.','Follow the temporary GPIO0-to-GND procedure in step 4; remove the jumper afterward.'],
 ['Read the missing header name in the first compiler error.','Install the matching pinned library from step 4.','Extract a complete ZIP with every .ino and .h file in one sketch folder.'],
 ['Check the ESP32 core version against step 4.','Check all five library versions, including dependencies.','Restore the pinned versions and Verify the complete sketch again.'],
 ['Select the 16 MB flash setting.','Select the 16M Flash (3MB APP/9.9MB FATFS) partition.','Verify again before uploading.'],
 ['Confirm the board packaging says DFR1139 / N16R2.','Select ESP32 Dev Module and PSRAM Enabled.','Upload again and read Serial Monitor at 115200.'],
 ['Unplug USB and battery; inspect OLED 3V3 and GND.','Match OLED SDA to GPIO21 and SCL to GPIO22.','Check factory I2C mode, 0x3C and the solder joints; reconnect USB and run Hardware test.'],
 ['Unplug power; check reader 3.3V and common GND.','Check SDA-to-GPIO4 and RST-to-GPIO17.','Check SCK, MOSI, MISO and solder joints; shorten leads, then rerun Hardware test.'],
 ['Unplug power; check the middle pot lug goes to GPIO35 / A3.','Check the outer lugs go to 3V3 and GND.','If rotation is reversed, swap only the outer wires while unpowered; rerun Hardware test.'],
 ['Unplug power and identify the two-terminal normally-open button.','Check GPIO14 / D6 and GND connections.','With the switch disconnected, check continuity: open released, nearly zero ohms pressed.'],
 ['Check the exact Wi-Fi name and password, including spaces and case.','Enable 2.4 GHz and WPA2-compatible access without a browser login.','Generate a new Normal radio ZIP, upload and inspect Serial messages.'],
 ['Turn the volume knob a little above minimum.','Unplug power; inspect amp VIN from VCC, GND, I2S leads and speaker terminals.','Power up and try another station; read the Serial audio errors.'],
 ['Check ABC’s official player on the same internet connection.','Confirm the connection has an Australian public IP and no overseas VPN route.','Try a non-ABC station to separate source availability from the audio wiring.'],
 ['Open the source URL in a browser.','Check internet and DNS by trying another station.','Check supply stability and Serial errors; radio retries can wait up to 30 seconds.'],
 ['Turn the volume down.','Inspect the power leads and check battery charge.','Compare with the specified 5 V / 2 A USB wall supply and a known good cable.'],
 ['Read the tag type with your phone: it must be NTAG213 or NTAG215.','Write exactly one URL/URI record.','Read it back and compare the full URL; do not use the supplied S50 key fob.'],
 ['Test the same tag with the lid open.','Move metal, the speaker magnet and battery away from the antenna.','Try a thinner non-metal tapping area and different tag orientation before fixing it permanently.'],
 ['Open the full URL on your phone; it must return audio without a login.','Check the supported format, expiry and expanded 255-byte URL limit.','Try the project’s public audio-check WAV on the radio and read Serial errors.'],
 ['Check whether the source provides a duration.','Try a constant-bitrate MP3 with a known duration.','If an early-end error remains, retest the source or press the station button to return to radio.'],
 ['Unplug USB as well as turning the battery switch OFF.','Compare with the four USB/switch states in step 10.'],
 ['Turn the battery switch ON and check the USB supply and cable.','Disconnect power before inspecting polarity and connector seating.','Remember: a charge LED that is off can mean disconnected, not only full.'],
 ['Open the station’s official player.','Try the local five-second WAV in the browser.','If the radio works, continue building; the optional browser preview has different media and CORS restrictions.'],
 ['Open the published guide over HTTPS, not a double-clicked HTML file.','Reload the page to avoid mixing files from a site update.','Use the complete unconfigured ZIP and the manual configuration instructions if needed.']
];
troubleshooting.forEach((r,i)=>$('symptom').append(new Option(r.cells[0].textContent,i)));
let fixStep=0;
function showFix() {
  const value=$('symptom').value;$('fix-card').hidden=value==='';$('fix-status').textContent='';if(value==='')return;
  const i=Number(value);const steps=sequences[i]||[troubleshooting[i].cells[1].textContent];
  $('fix-count').textContent=`Check ${fixStep+1} of ${steps.length}`;$('fix-action').textContent=steps[fixStep];
  $('fix-detail').textContent='After making this check, retest the symptom. Disconnect all power before changing wiring; continuity and resistance tests require an unpowered circuit.';
  $('fix-back').disabled=fixStep===0;$('fix-next').disabled=false;$('fix-next').textContent=fixStep===steps.length-1?'Show what to record':'Still not working';
}
$('symptom').addEventListener('change',()=>{fixStep=0;showFix();});
$('fix-back').addEventListener('click',()=>{fixStep=Math.max(0,fixStep-1);showFix();});
$('fix-next').addEventListener('click',()=>{
  const i=Number($('symptom').value); const length=(sequences[i]||[]).length||1;
  if(fixStep<length-1){fixStep++;showFix();$('fix-action').focus();}
  else {$('fix-status').textContent='Still stuck? Record the exact symptom, board/part numbers, operating mode, checks tried and the first Serial/compiler error. Remove passwords and private URLs before sharing. Keep power disconnected if wiring is uncertain.';$('fix-next').disabled=true;}
});
$('fix-done').addEventListener('click',()=>{$('fix-card').hidden=true;$('fix-status').textContent='Good work. Repeat this stage’s checkpoint before moving on.';});

const themes={fern:['#e8edda','#225d47'],sunset:['#fae1cf','#943f37'],ocean:['#ddeff3','#215b71']};
function labelPreview(){const c=themes[$('paper-theme').value];$('label-name').textContent=$('radio-name').value||'Kangaroo Radio';$('label-preview').style.background=c[0];$('label-preview').style.color=c[1];}
$('radio-name').addEventListener('input',labelPreview);$('paper-theme').addEventListener('change',labelPreview);
$('print-labels').addEventListener('click',()=>{
  const params=new URLSearchParams({name:$('radio-name').value||'Kangaroo Radio',theme:$('paper-theme').value});
  window.open('printables.html?'+params+'#cards','_blank','noopener');
});
document.body.classList.add('workshop-ready');
shoppingCount();drawWire();labelPreview();reveal(state.step);followHash();
