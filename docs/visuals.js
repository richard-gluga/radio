const $=id=>document.getElementById(id);
const parts={
  case:['The finishing touch','A home for your radio.','A non-metal enclosure keeps the finished build together. Plan around your received parts and test the card reader through the lid before drilling.','11-build-the-enclosure-after-the-bench-works','Build the enclosure'],
  speaker:['Core CE08483 · enclosed 8 Ω speaker','The part you can hear.','The speaker turns the amplifier’s output into sound. Its enclosure also contains a passive radiator. Keep both speaker leads away from GND; they connect only to the amplifier’s two output terminals.','6-add-the-amplifier-and-speaker','Connect the speaker'],
  brain:['DFRobot DFR1139 · ESP32','A tiny computer, a big job.','The ESP32 runs your sketch, joins 2.4 GHz Wi-Fi and decodes audio. It also reads the button, knob and story-card reader, and updates the display.','4-install-the-exact-software','Set up the software'],
  reader:['SunFounder CN0090 · RC522','A tap opens a story.','The reader gets a public audio link from an NTAG213 or NTAG215 card. The card holds the address; the radio fetches the audio over Wi-Fi. Check reading through your actual enclosure lid.','8-write-and-test-a-story-card','Make a story card'],
  amp:['Adafruit 3006 · MAX98357A','Small board. Essential job.','This amplifier takes digital audio from the ESP32 and drives the speaker. Power it from the board’s VCC pin and use the specified gain link. Start quietly.','6-add-the-amplifier-and-speaker','Wire the amplifier'],
  battery:['Adafruit 1781 · protected 3.7 V pack','Room to roam, within Wi-Fi.','The board charges the battery through USB-C. The separate battery switch must be ON for charging; USB can still power the radio when that switch is OFF.','10-add-rechargeable-battery-power','Understand battery power'],
  controls:['OLED · volume knob · station button','Made for hands, not menus.','Turn the knob to set volume within your configured cap. Press the station button to move to the next station. The OLED shows the radio’s current status.','5-wire-the-display-knob-button-and-reader','Connect the controls']
};
let model=null, selected='case', rotating=false;
const componentButtons=[...document.querySelectorAll('[data-component]')];
function selectComponent(id,open=true) {
  if(!parts[id])return;
  selected=id;
  const [type,title,copy,anchor,link]=parts[id];
  $('component-type').textContent=type;$('component-title').textContent=title;$('component-copy').textContent=copy;
  $('component-link').href='#'+anchor;$('component-link').textContent=link+' →';
  componentButtons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.component===id)));
  model?.select(id);
  if(open&&model)setSpread(100);
}
componentButtons.forEach(b=>{b.disabled=false;b.addEventListener('click',()=>selectComponent(b.dataset.component));});
function setSpread(value) {
  $('model-spread').value=String(value);model?.spread(value/100);
  $('model-closed').setAttribute('aria-pressed',String(value===0));$('model-open').setAttribute('aria-pressed',String(value===100));
}
function stopRotation() {rotating=false;model?.spin(false);$('model-spin').setAttribute('aria-pressed','false');}
$('model-closed').addEventListener('click',()=>setSpread(0));$('model-open').addEventListener('click',()=>setSpread(100));
$('model-spread').addEventListener('input',e=>setSpread(Number(e.target.value)));
$('model-left').addEventListener('click',()=>{stopRotation();model?.turn(-1);});$('model-right').addEventListener('click',()=>{stopRotation();model?.turn(1);});
$('model-reset').addEventListener('click',()=>{stopRotation();model?.reset();setSpread(0);selectComponent('case',false);});
$('model-spin').addEventListener('click',()=>{rotating=!rotating;model?.spin(rotating);$('model-spin').setAttribute('aria-pressed',String(rotating));});
const motion=matchMedia('(prefers-reduced-motion: reduce)');
function motionPreference() {if(motion.matches)stopRotation();$('model-spin').hidden=motion.matches;stopPath();}
motion.addEventListener('change',motionPreference);
let attempted=false;
function fallback() {
  model?.dispose();model=null;
  $('model-fallback').hidden=false;document.querySelector('.model-controls').hidden=true;
  $('model-status').textContent='Showing the illustrated view. The component buttons and build links still work.';
  $('radio-model').dataset.state='fallback';
}
async function loadModel() {
  if(attempted)return;attempted=true;
  $('model-status').textContent='Preparing the 3D explorer…';
  try {
    const {createRadioModel}=await import('./radio-model.js');
    model=createRadioModel($('radio-model'),{onSelect:selectComponent,onUnavailable:fallback});
    $('model-fallback').hidden=true;document.querySelector('.model-controls').hidden=false;
    $('radio-model').dataset.state='ready';
    $('model-status').textContent='Drag sideways to turn, or use the controls. Select a part to look inside.';
    model.select(selected);if(selected!=='case')setSpread(100);
    $('model-spin').hidden=motion.matches;
  } catch {fallback();}
}
if('IntersectionObserver' in window) {
  const lazy=new IntersectionObserver(entries=>{if(entries[0].isIntersecting){lazy.disconnect();loadModel();}},{rootMargin:'150px'});lazy.observe($('radio-model'));
} else loadModel();

const details=[
  'The RC522 reads the card’s NDEF URI record: a public, direct audio URL. The recording itself is stored on an internet host.',
  'The ESP32 uses your configured 2.4 GHz Wi-Fi to request the audio. A card cannot play its linked story without a reachable host and network.',
  'The ESP32 decodes the recording and sends digital audio over I2S. The MAX98357A amplifier converts it and drives the speaker.',
  'The speaker turns that electrical signal into sound. Set a quiet volume first. To hear this story on your computer or phone, use the browser preview below.'
];
const pathButtons=[...document.querySelectorAll('[data-path-step]')];
let pathIndex=0,pathTimer=null,pathRunning=false;
function showStep(index) {
  pathIndex=index;
  pathButtons.forEach((b,i)=>{b.setAttribute('aria-pressed',String(i===index));b.parentElement.classList.toggle('is-current',i===index);});
  $('path-detail').textContent=details[index];
}
function stopPath() {
  clearTimeout(pathTimer);pathTimer=null;pathRunning=false;
  $('story-path').classList.remove('path-running');
  if($('path-play'))$('path-play').textContent=motion.matches?'Next part of the story →':'Follow the story →';
}
function scheduleStep() {
  pathTimer=setTimeout(()=>{
    if(document.hidden){stopPath();return;}
    if(pathIndex===3){stopPath();return;}
    showStep(pathIndex+1);scheduleStep();
  },3500);
}
pathButtons.forEach((b,i)=>{b.disabled=false;b.addEventListener('click',()=>{stopPath();showStep(i);});});
$('path-play').hidden=false;
$('path-play').addEventListener('click',()=>{
  if(motion.matches){showStep((pathIndex+1)%4);return;}
  if(pathRunning){stopPath();return;}
  showStep(0);pathRunning=true;$('story-path').classList.add('path-running');$('path-play').textContent='Pause the story path';scheduleStep();
});
document.addEventListener('visibilitychange',()=>{if(document.hidden){stopPath();stopRotation();}});
if('IntersectionObserver' in window) {
  new IntersectionObserver(entries=>{if(!entries[0].isIntersecting)stopPath();},{threshold:0}).observe($('story-path'));
}
motionPreference();
// Fireflies move only while real preview audio is playing, never on a timer pretending to be sound.
const storyWindow=document.querySelector('.story-window');
let storyOnscreen=true,storyPlaying=false;
function syncStoryMotion(){storyWindow.classList.toggle('is-playing',storyOnscreen&&storyPlaying&&!document.hidden);}
if('IntersectionObserver' in window)new IntersectionObserver(entries=>{storyOnscreen=entries[0].isIntersecting;syncStoryMotion();}).observe(storyWindow);
document.addEventListener('playing',e=>{if(e.target instanceof HTMLMediaElement){storyPlaying=e.target.currentSrc.includes('/pip-and-the-little-light.wav');syncStoryMotion();}},true);
for(const event of ['pause','ended','emptied','error','waiting'])document.addEventListener(event,e=>{if(e.target instanceof HTMLMediaElement){storyPlaying=false;syncStoryMotion();}},true);
document.addEventListener('visibilitychange',syncStoryMotion);
