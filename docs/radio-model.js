import * as THREE from './vendor/three-r180/three.module.min.js';

// A deliberately simplified concept, with no dimensional or wiring authority.
export function createRadioModel(host, {onSelect, onUnavailable}) {
  const renderer = new THREE.WebGLRenderer({alpha:true, antialias:true, powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  const canvas = renderer.domElement;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Three-dimensional concept radio. Use the component buttons and camera controls to explore; drag horizontally to turn.');
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-4, 4, 3, -3, .1, 50);
  camera.position.set(0, 1.2, 12);
  camera.lookAt(0, .25, 0);
  scene.add(new THREE.HemisphereLight(0xfff7dc, 0x23473d, 1.8));
  const key = new THREE.DirectionalLight(0xffecd0, 3);
  key.position.set(-3, 6, 7); scene.add(key);
  const rim = new THREE.DirectionalLight(0xb8d9d3, 2);
  rim.position.set(5, 2, -4); scene.add(rim);
  const model = new THREE.Group(); scene.add(model);
  model.rotation.set(-.06, -.38, 0);
  const components = new Map();
  const textures = [];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let currentSpread=0, targetSpread=0, selected='case', spinning=false;
  let frame=0, lastTime=0, visible=true, lost=false, disposed=false;

  function texture(width, height, paint) {
    const c=document.createElement('canvas'); c.width=width; c.height=height;
    paint(c.getContext('2d'), width, height);
    const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace;
    textures.push(t); return t;
  }
  const wood=texture(256,256,(c,w,h)=>{
    c.fillStyle='#bc8959'; c.fillRect(0,0,w,h);
    for(let i=0;i<90;i++) {
      c.strokeStyle=i%3 ? '#8f643b20' : '#edd0a332'; c.lineWidth=i%4===0 ? 2 : 1;
      c.beginPath(); c.moveTo(0,i*3); c.bezierCurveTo(90,i*3-8,170,i*3+9,w,i*3); c.stroke();
    }
  });
  const grille=texture(256,256,(c,w,h)=>{
    c.fillStyle='#b6a789'; c.fillRect(0,0,w,h); c.fillStyle='#353e30';
    for(let x=5;x<w;x+=9) for(let y=5;y<h;y+=9) {c.beginPath();c.arc(x,y,1.8,0,Math.PI*2);c.fill();}
  });
  const oled=texture(384,192,(c,w,h)=>{
    c.fillStyle='#092e25';c.fillRect(0,0,w,h);c.fillStyle='#d7edaf';
    c.font='19px monospace';c.fillText('KANGAROO RADIO',24,43);
    c.fillStyle='#accf8c';c.font='bold 27px monospace';c.fillText('Hello, adventure.',24,93);
    c.fillStyle='#6c9b75';c.font='17px monospace';c.fillText('CONCEPT PREVIEW',24,155);
  });
  function material(color, options={}) { return new THREE.MeshStandardMaterial({color,roughness:.7,metalness:.05,...options}); }
  function mesh(parent, geometry, color, position=[0,0,0], options={}) {
    const m=new THREE.Mesh(geometry,material(color,options)); m.position.set(...position); parent.add(m); return m;
  }
  function box(parent,w,h,d,color,position,options) { return mesh(parent,new THREE.BoxGeometry(w,h,d),color,position,options); }
  function rounded(parent,w,h,d,r,color,position,options) {
    const s=new THREE.Shape(), x=-w/2, y=-h/2;
    s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);
    s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);
    const geometry=new THREE.ExtrudeGeometry(s,{depth:d,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.025,bevelThickness:.025,curveSegments:6});
    geometry.translate(0,0,-d/2);
    return mesh(parent,geometry,color,position,options);
  }
  function disc(parent,r,depth,color,pos) {
    const m=mesh(parent,new THREE.CylinderGeometry(r,r,depth,40),color,pos);m.rotation.x=Math.PI/2; return m;
  }
  function line(parent,points,color,radius=.012) {
    const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
    return mesh(parent,new THREE.TubeGeometry(curve,32,radius,6,false),color);
  }
  function component(id,number,closed,open) {
    const g=new THREE.Group();g.userData.component=id;model.add(g);
    const badgeMap=texture(64,64,(c)=>{c.fillStyle='#efd092';c.beginPath();c.arc(32,32,27,0,Math.PI*2);c.fill();c.fillStyle='#173b2f';c.textAlign='center';c.font='bold 29px monospace';c.fillText(number,32,42);});
    const badge=new THREE.Sprite(new THREE.SpriteMaterial({map:badgeMap,depthTest:false}));
    badge.scale.set(.32,.32,1);badge.renderOrder=10;g.add(badge);
    components.set(id,{g,closed:new THREE.Vector3(...closed),open:new THREE.Vector3(...open),badge});
    return g;
  }
  const shell=component('case','1',[0,0,0],[-1.45,.8,-.85]);
  const timber={map:wood};
  rounded(shell,4.15,2.55,.14,.16,0xffffff,[0,0,-.8],timber);
  box(shell,.15,2.4,1.55,0xffffff,[-2,0,0],timber);box(shell,.15,2.4,1.55,0xffffff,[2,0,0],timber);
  box(shell,3.9,.14,1.55,0xffffff,[0,1.23,0],timber);box(shell,3.9,.14,1.55,0xffffff,[0,-1.23,0],timber);
  line(shell,[[-.9,1.3,0],[-.9,1.85,0],[-.6,2,0],[.6,2,0],[.9,1.85,0],[.9,1.3,0]],0x6f4e33,.085);
  for(const x of [-1.55,1.55]) rounded(shell,.45,.13,.75,.04,0x233b2d,[x,-1.37,0]);
  components.get('case').badge.position.set(-1.75,1.4,0);

  const front=component('controls','7',[0,0,.86],[2.6,-.2,1.15]);
  rounded(front,4.1,2.55,.16,.14,0xffffff,[0,0,0],timber);
  rounded(front,1.91,2.05,.06,.12,0x805a3e,[-.85,0,.12]);
  rounded(front,1.77,1.91,.035,.1,0xb6a789,[-.85,0,.17]);
  mesh(front,new THREE.PlaneGeometry(1.64,1.78),0xffffff,[-.85,0,.22],{map:grille});
  rounded(front,1.45,.82,.08,.07,0x29362e,[1,.55,.13]);
  mesh(front,new THREE.PlaneGeometry(1.3,.67),0xffffff,[1,.55,.201],{map:oled,roughness:1,emissive:0x749d54,emissiveMap:oled,emissiveIntensity:.25});
  disc(front,.35,.16,0xd0af77,[.78,-.57,.25]);disc(front,.27,.025,0xf2d99d,[.78,-.57,.35]);
  box(front,.025,.12,.01,0x5c5036,[.78,-.36,.371]);disc(front,.13,.11,0x193f31,[1.53,-.57,.24]);
  components.get('controls').badge.position.set(1.86,1.12,.22);

  const speaker=component('speaker','2',[-.8,0,.42],[-2.65,-1.45,.85]);
  rounded(speaker,2.12,.97,.55,.15,0x202a27);
  disc(speaker,.41,.025,0x546353,[-.51,0,.3]);disc(speaker,.31,.028,0x26352c,[-.51,0,.32]);disc(speaker,.16,.03,0x70816b,[-.51,0,.35]);
  disc(speaker,.36,.025,0x67765f,[.59,0,.3]);disc(speaker,.29,.018,0x4d614b,[.59,0,.32]);
  components.get('speaker').badge.position.set(-.98,.48,.36);

  function pcb(g,w,h,color) {
    rounded(g,w,h,.06,.03,color);
    for(const x of [-w/2+.08,w/2-.08]) for(const y of [-h/2+.07,h/2-.07]) disc(g,.035,.008,0xd9b367,[x,y,.04]);
  }
  const brain=component('brain','3',[.8,.1,-.5],[-1.35,.7,1.75]);
  pcb(brain,1.2,.57,0x226747);box(brain,.47,.43,.095,0xacb6aa,[-.05,0,.1],{metalness:.65,roughness:.35});
  box(brain,.15,.25,.11,0xc1c9ba,[-.6,0,.065],{metalness:.65});
  line(brain,[[.3,-.17,.07],[.48,-.17,.07],[.48,-.08,.07],[.3,-.08,.07],[.3,.03,.07],[.48,.03,.07],[.48,.16,.07],[.3,.16,.07]],0xd6b56b,.012);
  for(let i=0;i<8;i++) for(const y of [-.24,.24]) box(brain,.045,.06,.05,0xd4ba7b,[-.44+i*.12,y,.07]);
  components.get('brain').badge.position.set(-.68,.3,.1);

  const reader=component('reader','4',[.1,1,.1],[1.3,2.1,.5]);
  pcb(reader,1.4,.94,0x327a8c);
  for(let i=0;i<3;i++) {
    const w=1.2-i*.11,h=.72-i*.11;
    const points=[[-w/2,-h/2,.055],[w/2,-h/2,.055],[w/2,h/2,.055],[-w/2,h/2,.055],[-w/2,-h/2,.055]];
    const geo=new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p)));
    reader.add(new THREE.Line(geo,new THREE.LineBasicMaterial({color:0xb8cdb2})));
  }
  box(reader,.26,.21,.05,0x17352e,[0,-.07,.1]);
  components.get('reader').badge.position.set(-.73,.48,.1);

  const amp=component('amp','5',[.6,-.5,.2],[-.3,-.85,1.8]);
  pcb(amp,.64,.63,0x376f85);box(amp,.2,.2,.055,0x25392f,[0,-.05,.08]);
  box(amp,.46,.18,.22,0x76a457,[0,.23,.12]);for(const x of [-.12,.12]) disc(amp,.05,.01,0xc3c7a7,[x,.23,.24]);
  for(let i=0;i<7;i++)box(amp,.035,.06,.04,0xc9ad69,[-.24+i*.08,-.29,.07]);
  components.get('amp').badge.position.set(-.42,.38,.25);

  const battery=component('battery','6',[.55,-.88,-.38],[.3,-1.85,.4]);
  const cell=mesh(battery,new THREE.CylinderGeometry(.2,.2,1.53,32),0x5686b1);cell.rotation.z=Math.PI/2;
  const cap=mesh(battery,new THREE.CylinderGeometry(.17,.17,.025,32),0xa1b4bc,[.77,0,0]);cap.rotation.z=Math.PI/2;
  line(battery,[[.75,.06,0],[.97,.09,0],[1.07,.28,0],[1.28,.3,0]],0xd76649,.017);
  line(battery,[[.75,-.06,0],[1,-.05,0],[1.13,.2,0],[1.28,.24,0]],0x26392e,.017);
  box(battery,.14,.13,.1,0xece9d3,[1.33,.27,0]);
  components.get('battery').badge.position.set(-.88,.22,0);

  function layout() {
    for(const {g,closed,open,badge} of components.values()) {
      g.position.lerpVectors(closed,open,currentSpread);badge.visible=currentSpread>.4;
    }
    reader.rotation.x=-(1-currentSpread)*Math.PI/2;
    const aspect=host.clientWidth/host.clientHeight;
    const height=Math.max(4.5+1.9*currentSpread,(5.5+4*currentSpread)/aspect);
    camera.left=-height*aspect/2;camera.right=height*aspect/2;
    camera.top=height/2+.35;camera.bottom=-height/2+.35;camera.updateProjectionMatrix();
  }
  function render(time) {
    frame=0;if(disposed||lost||!visible||document.hidden)return;
    const dt=Math.min((time-lastTime)/1000||.016,.05);lastTime=time;
    const delta=targetSpread-currentSpread;
    currentSpread=reduced.matches||Math.abs(delta)<.002 ? targetSpread : currentSpread+delta*(1-Math.exp(-dt*8));
    if(spinning&&!reduced.matches) model.rotation.y+=dt*.24;
    layout();renderer.render(scene,camera);
    if(Math.abs(targetSpread-currentSpread)>.001||(spinning&&!reduced.matches)) invalidate();
  }
  function invalidate() {if(!frame&&!disposed&&!lost&&visible&&!document.hidden)frame=requestAnimationFrame(render);}
  function resize() {if(!host.clientWidth||!host.clientHeight)return;renderer.setSize(host.clientWidth,host.clientHeight,false);invalidate();}
  function select(id) {
    selected=id;
    for(const [name,{g}] of components)g.traverse(o=>{
      if(o.isMesh) {o.material.emissive.set(name===id ? 0x65431b : 0x000000);o.material.emissiveIntensity=name===id?.15:0;}
    });
    invalidate();
  }
  let drag=null;
  const ray=new THREE.Raycaster();
  function pointerDown(e) {if(e.button!==0)return;drag={x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,moved:false};canvas.setPointerCapture(e.pointerId);}
  function pointerMove(e) {
    if(!drag)return;
    if(Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)>6)drag.moved=true;
    if(drag.moved) {model.rotation.y+=(e.clientX-drag.x)*.007;model.rotation.x=THREE.MathUtils.clamp(model.rotation.x+(e.clientY-drag.y)*.003,-.45,.45);invalidate();}
    drag.x=e.clientX;drag.y=e.clientY;
  }
  function pointerUp(e) {
    if(drag&&!drag.moved) {
      const bounds=canvas.getBoundingClientRect();
      ray.setFromCamera(new THREE.Vector2((e.clientX-bounds.left)/bounds.width*2-1,-(e.clientY-bounds.top)/bounds.height*2+1),camera);
      const hit=ray.intersectObject(model,true).find(h=>h.object.isMesh);
      if(hit){let o=hit.object;while(o&&!o.userData.component)o=o.parent;if(o)onSelect(o.userData.component);}
    }
    drag=null;
  }
  canvas.addEventListener('pointerdown',pointerDown);canvas.addEventListener('pointermove',pointerMove);canvas.addEventListener('pointerup',pointerUp);canvas.addEventListener('pointercancel',()=>{drag=null;});
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;cancelAnimationFrame(frame);frame=0;onUnavailable();});
  const resizer=new ResizeObserver(resize);resizer.observe(host);
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible){lastTime=0;invalidate();}else{cancelAnimationFrame(frame);frame=0;}},{threshold:0});observer.observe(host);
  const visibility=()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}else{lastTime=0;invalidate();}};
  document.addEventListener('visibilitychange',visibility);
  reduced.addEventListener('change',invalidate);
  host.append(canvas);resize();select(selected);
  return {
    select,
    spread(value){targetSpread=value;invalidate();},
    turn(direction){model.rotation.y+=direction*.35;invalidate();},
    spin(value){spinning=value;lastTime=0;invalidate();},
    reset(){model.rotation.set(-.06,-.38,0);invalidate();},
    dispose(){
      disposed=true;cancelAnimationFrame(frame);resizer.disconnect();observer.disconnect();
      document.removeEventListener('visibilitychange',visibility);reduced.removeEventListener('change',invalidate);
      model.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});textures.forEach(t=>t.dispose());renderer.dispose();canvas.remove();
    }
  };
}
