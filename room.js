const canvas = document.querySelector('#room');
const drawing = canvas.getContext('2d');
// Give the player room to walk across the entry without hitting the plant table.
const view = { x: 0, z: 1.38, yaw: 0, pitch: -.06 };
const keys = new Set();
const walkVector = {x:0,y:0};
const layout = {
  cabinet: {x:-1.05,z:6.75},
  desk: {x:2.92,z:5.26},
  wine: {x:-2.68,z:5.32},
  player: {x:-2.30,z:2.66},
  nest: {x:3.56,z:4.37},
};
const {cabinet: cabinetSpot, desk: deskSpot, wine: wineSpot, player: playerSpot, nest} = layout;
const stations = [
  {id:'cabinet', x:cabinetSpot.x-.28, z:cabinetSpot.z-.40, y:.77, range:2.35},
  {id:'liftChest', x:cabinetSpot.x, z:cabinetSpot.z-.34, y:.63, range:2.35},
  {id:'chest', x:cabinetSpot.x, z:cabinetSpot.z-.14, y:1.16},
  {id:'camera', x:cabinetSpot.x-.19, z:cabinetSpot.z-.17, y:1.11},
  {id:'cameraCard', x:cabinetSpot.x+.19, z:cabinetSpot.z-.17, y:1.09},
  {id:'wine', x:-2.89, z:5.39, y:.97},
  {id:'glass', x:-2.46, z:5.27, y:.65},
  {id:'wineCard', x:wineSpot.x+.18, z:wineSpot.z+.28, y:.66},
  {id:'deskCard', x:deskSpot.x-.20, z:deskSpot.z+.39, y:1.01},
  {id:'computer', x:deskSpot.x-.21, z:deskSpot.z, y:1.18},
  {id:'record', x:3.68, z:7.34, y:1.11},
  {id:'player', x:playerSpot.x, z:playerSpot.z, y:1.02},
  {id:'needle', x:playerSpot.x+.35, z:playerSpot.z+.05, y:1.05},
  {id:'map', x:1.05, z:7.78, y:1.85},
  {id:'gift', x:0, z:4.75, y:1.33},
  {id:'candle', x:0, z:4.75, get y(){ return candleBase()+.37; }},
  {id:'floorLamp', x:-3.93, z:6.71, y:1.52},
  {id:'switch', x:-1.08, z:.24, y:1.39, range:2.2},
  {id:'cat', x:nest.x-.17, z:nest.z+.03, y:.48},
];
const roomFaces = [];
const furniture = [];
const wallMapGroup = {x:1.05,y:1.88,z:7.86};
const wineTableGroup = {x:wineSpot.x,y:.59,z:wineSpot.z};
function groupSurfaces(faces,start,group,layer) {
  for (let i=start;i<faces.length;i++) {
    faces[i].group=group;
    faces[i].layer=layer;
  }
}
const obstacles = [];
const wood = ['#a27656','#8c6148','#c0926d'];
const green = ['#657653','#4c5c45','#9aab76'];
const point = (x, y, z) => ({x, y, z});
function face(list, color, ...corners) {
  list.push({ color, corners: corners.map(corner => point(...corner)) });
}
function box(x, y, z, width, height, depth, colors, solid = false, faces = furniture) {
  const left = x - width / 2, right = x + width / 2;
  const front = z - depth / 2, back = z + depth / 2;
  const top = y + height;
  const [a,b,c] = colors;
  face(faces,a,[left,y,front],[right,y,front],[right,top,front],[left,top,front]);
  face(faces,a,[right,y,back],[left,y,back],[left,top,back],[right,top,back]);
  face(faces,b,[left,y,back],[left,y,front],[left,top,front],[left,top,back]);
  face(faces,b,[right,y,front],[right,y,back],[right,top,back],[right,top,front]);
  face(faces,c,[left,top,front],[right,top,front],[right,top,back],[left,top,back]);
  if (solid) obstacles.push({left, right, front, back});
}
function table(x,z,w,d,h) {
  for (const dx of [-1,1]) for (const dz of [-1,1]) {
    box(x + dx*(w/2-.1),0,z + dz*(d/2-.1),.12,h,.12,wood);
  }
  box(x,h,z,w,.12,d,wood,true);
}
function oval(list, color, x, y, z, radiusX, radiusZ) {
  const corners = Array.from({length: 40}, (_, i) => {
    const angle = i * Math.PI / 20;
    return [x + Math.cos(angle)*radiusX, y, z + Math.sin(angle)*radiusZ];
  });
  face(list, color, ...corners);
}
face(roomFaces,'#e5cda7',[-4.6,0,8],[4.6,0,8],[4.6,3.3,8],[-4.6,3.3,8]);
face(roomFaces,'#cfb18d',[-4.6,0,0],[-4.6,0,8],[-4.6,3.3,8],[-4.6,3.3,0]);
face(roomFaces,'#dfc59f',[4.6,0,8],[4.6,0,0],[4.6,3.3,0],[4.6,3.3,8]);
face(roomFaces,'#d9bb94',[4.6,0,0],[-4.6,0,0],[-4.6,3.3,0],[4.6,3.3,0]);
face(roomFaces,'#f4e0bc',[-4.6,3.3,0],[-4.6,3.3,8],[4.6,3.3,8],[4.6,3.3,0]);
for(let row=0;row<20;row++){
  const z=row*.4;
  const seams=[-4.6, -2.95+(row%3)*.62, -.35+(row%3)*.62, 2.25+(row%3)*.62, 4.6];
  for(let col=0;col<seams.length-1;col++){
    const x=seams[col], end=seams[col+1];
    const color=['#d8ab80','#dfb487','#e5bb91','#d5a77e'][(row*3+col*7)%4];
    face(roomFaces,color,[x,0,z],[end,0,z],[end,0,z+.4],[x,0,z+.4]);
  }
}
oval(roomFaces,'#b6a170',0,.006,4.75,2.04,1.7);
oval(roomFaces,'#e3ce9e',0,.007,4.75,1.96,1.63);
oval(roomFaces,'#ccb284',0,.008,4.75,1.63,1.36);
oval(roomFaces,'#e6d2a2',0,.009,4.75,1.55,1.29);
oval(roomFaces,'#a6ae86',3.14,.006,5.15,1.31,1.57);
box(-2.12,.92,7.96,4.1,2.13,.06,wood);
box(-2.12,1.01,7.91,3.92,1.95,.024,['#bad8d1','#bad8d1','#bad8d1']);
for(const surface of furniture.slice(-5)) surface.night='#394d78';
face(furniture,'#9bad83',[-4.05,1.02,7.89],[-.2,1.02,7.89],[-.2,1.48,7.89],[-.83,1.52,7.89],[-1.42,1.35,7.89],[-2.24,1.62,7.89],[-3.06,1.75,7.89],[-4.05,1.52,7.89]);
const sun = Array.from({length:32}, (_,i) => {
  const angle = i*Math.PI/16;
  return [-1.13+Math.cos(angle)*.27,2.48+Math.sin(angle)*.27,7.883];
});
face(furniture,'#f8e3a1',...sun);
furniture.at(-1).night='transparent';
for (const x of [-3.36,-.88]) box(x,1.02,7.866,.052,1.94,.04,wood);
box(-2.12,1.87,7.86,3.92,.052,.044,wood);
box(-2.12,.90,7.81,4.18,.07,.19,wood);
box(-2.12,3.08,7.78,4.22,.04,.045,wood);
for (const edge of [-4.02,-.22]) for (let pleat=0;pleat<4;pleat++) {
  const color = pleat%2 ? '#e0cba4' : '#f2e2bf';
  box(edge+(pleat-1.5)*.075,1.02,7.78+pleat%2*.026,.078,2.03,.09,[color,'#c9b693',color]);
}
const mapStart=furniture.length;
box(1.05,1.39,7.94,1.68,.97,.07,wood);
groupSurfaces(furniture,mapStart,wallMapGroup,0);
const mapPaperStart=furniture.length;
box(1.05,1.45,7.88,1.56,.85,.025,['#edd9a5','#edd9a5','#edd9a5']);
groupSurfaces(furniture,mapPaperStart,wallMapGroup,1);
// Overlapping washes, painted as narrow strips so the silhouette stays convex.
const landscapeRidges=[
  {y:1.77,z:7.849,color:'#b5b59a',heights:[.03,.12,.19,.29,.20,.25,.16,.09,.18,.30,.23,.13,.03]},
  {y:1.65,z:7.846,color:'#82988a',heights:[.02,.11,.24,.18,.13,.07,.12,.20,.28,.20,.14,.09,.02]},
  {y:1.57,z:7.843,color:'#60796b',heights:[.10,.21,.12,.075,.055,.025,.02,.06,.07,.05,.12,.15,.09]},
];
for(const {y,z,color,heights} of landscapeRidges) {
  for(let i=0;i<heights.length-1;i++) {
    const x=.34+i*.118, next=x+.118;
    face(furniture,color,[x,y,z],[next,y,z],[next,y+heights[i+1],z],[x,y+heights[i],z]);
    furniture.at(-1).soft=true;
  }
}
for(let i=0;i<3;i++) {
  const x=.55+i*.37,y=1.63+i*.027;
  face(furniture,'#ede4c7',[x,y,7.840],[x+.32,y+.006,7.840],[x+.38,y+.015,7.840],[x+.08,y+.017,7.840]);
  furniture.at(-1).soft=true;
}
const cx=cabinetSpot.x, cz=cabinetSpot.z;
box(cx,.11,cz+.29,.94,.75,.09,green);
for(const x of [cx-.43,cx+.43]) box(x,.07,cz,.085,.79,.64,green);
box(cx,.26,cz,.94,.08,.64,green,true);
box(cx,.84,cz,1.03,.075,.70,wood);
table(deskSpot.x,deskSpot.z,.78,1.34,.79);
table(playerSpot.x,playerSpot.z,1.30,.83,.65);
box(playerSpot.x,.77,playerSpot.z,1.12,.15,.64,['#845c49','#664536','#a57a5b']);

box(-3.99,.11,5.35,.83,.39,2.25,green,true);
oval(roomFaces,'#b28c73',-2.85,.014,4.63,.38,.34);
oval(roomFaces,'#d8ae8b',-2.85,.022,4.63,.35,.31);
box(-4.04,0,6.82,.37,.07,.37,wood);
box(-4.04,.06,6.82,.046,1.53,.046,wood);
box(0,2.89,4.5,.58,.22,.58,['#ead7ac','#d8bf8d','#fff0c8']);
box(0,3.11,4.5,.035,.19,.035,wood);

function cameraSpace(p, basis) {
  const x=p.x-view.x, z=p.z-view.z, y=p.y-1.48;
  const forward=z*basis.cos+x*basis.sin;
  return {
    x:x*basis.cos-z*basis.sin,
    y:y*basis.pitchCos-forward*basis.pitchSin,
    z:forward*basis.pitchCos+y*basis.pitchSin,
  };
}
const clipDepth=.08;
function clip(corners) {
  const visible=[];
  for (let i=0;i<corners.length;i++){
    const a=corners[i], b=corners[(i+1)%corners.length];
    if(a.z>=clipDepth) visible.push(a);
    if((a.z>=clipDepth)!==(b.z>=clipDepth)){
      const t=(clipDepth-a.z)/(b.z-a.z);
      visible.push(point(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t,clipDepth));
    }
  }
  return visible;
}
const visibleTargets = [];
const projectedPianoKeys = [];
const depthRenderer = typeof createDepthRenderer === 'function' ? createDepthRenderer() : null;
function render(time) {
  const w=canvas.clientWidth, h=canvas.clientHeight;
  const ratio=Math.min(window.devicePixelRatio||1,1.7);
  if(canvas.width!==Math.round(w*ratio)||canvas.height!==Math.round(h*ratio)){
    canvas.width=Math.round(w*ratio);
    canvas.height=Math.round(h*ratio);
  }
  drawing.setTransform(ratio,0,0,ratio,0,0);
  drawing.fillStyle='#d6b893';
  drawing.fillRect(0,0,w,h);
  const lens=Math.max(w*.54,h*.63);
  const basis={sin:Math.sin(view.yaw),cos:Math.cos(view.yaw),pitchSin:Math.sin(view.pitch),pitchCos:Math.cos(view.pitch)};
  const project=p=>[w/2+p.x*lens/p.z,h/2-p.y*lens/p.z];
  function paint(surface, corners, stroke) {
    drawing.beginPath();
    drawing.moveTo(...project(corners[0]));
    for(const p of corners.slice(1)) drawing.lineTo(...project(p));
    drawing.closePath();
    const color = lightsOff ? surface.night ?? surface.color : surface.color;
    if(color==='transparent') return;
    drawing.fillStyle=color;
    drawing.fill();
    if (surface.soft) return;
    drawing.strokeStyle=stroke;
    drawing.lineWidth=.8;
    drawing.stroke();
  }
  const roomItems=[];
  for(const surface of roomFaces){
    const corners=clip(surface.corners.map(p=>cameraSpace(p,basis)));
    if(corners.length>=3) roomItems.push({surface,corners,stroke:'#7b584934'});
  }
  const props=[...furniture,...sceneFaces(time)].map(surface=>{
    const corners=clip(surface.corners.map(p=>cameraSpace(p,basis)));
    const depth=corners.reduce((sum,p)=>sum+p.z,0)/corners.length;
    const groupDepth=surface.group ? cameraSpace(surface.group,basis).z : depth;
    return {surface,corners,depth,groupDepth,stroke:'#51362870'};
  }).filter(item=>item.corners.length>=3);
  const layer=depthRenderer?.([...roomItems,...props],canvas.width,canvas.height,lens*ratio);
  if(layer) drawing.drawImage(layer,0,0,w,h);
  else {
    for(const {surface,corners,stroke} of roomItems) paint(surface,corners,stroke);
    props.sort((a,b)=>b.groupDepth-a.groupDepth ||
      (a.surface.group && a.surface.group===b.surface.group ? a.surface.layer-b.surface.layer : 0) ||
      b.depth-a.depth)
    .forEach(({surface,corners,stroke})=>paint(surface,corners,stroke));
  }
  const catBack=drawSleepingCat(basis,project);
  const daylight=cameraSpace(point(-2.12,2.08,7.75),basis);
  const nightLevel=lightsOff ? 1 : progress(nightFadeStarted,time,nightFadeDuration);
  if(!lightsOff && daylight.z>.65){
    const [x,y]=project(daylight);
    const glow=drawing.createRadialGradient(x,y,0,x,y,Math.max(w,h)*.56);
    glow.addColorStop(0,'#fff3b92b');
    glow.addColorStop(1,'#fff3b900');
    drawing.fillStyle=glow;
    drawing.globalAlpha=1-nightLevel;
    drawing.fillRect(0,0,w,h);
    drawing.globalAlpha=1;
  }
  if(nightLevel>0){
    drawing.fillStyle='rgba(25,26,54,' + (163/255*nightLevel) + ')';
    drawing.fillRect(0,0,w,h);
  }
  drawSceneDetails(basis, project, w, h, time);
  projectedPianoKeys.length=0;
  if(entered && view.x<3.83 && Math.hypot(view.x-3.85,view.z-1.47)<1.8) {
    for(const key of pianoKeys) {
      const y=key.y+.032;
      const corners=[
        point(key.x-key.w/2,y,key.z-key.d/2),point(key.x+key.w/2,y,key.z-key.d/2),
        point(key.x+key.w/2,y,key.z+key.d/2),point(key.x-key.w/2,y,key.z+key.d/2),
      ].map(p=>cameraSpace(p,basis));
      if(corners.every(p=>p.z>clipDepth)) {
        projectedPianoKeys.push({note:key.note,corners:corners.map(project),height:y});
      }
    }
    projectedPianoKeys.sort((a,b)=>b.height-a.height);
  }
  visibleTargets.length=0;
  for(const station of stations){
    if(!entered || !stationAvailable(station)) continue;
    const p=cameraSpace(station,basis);
    if(p.z<.4) continue;
    if(station.id==='cat' && !catBack) continue;
    const [x,y]=station.id==='cat' ? catBack : project(p);
    if(x<15||x>w-15||y<65||y>h-24) continue;
    if(Math.hypot(station.x-view.x,station.z-view.z)<(station.range??2.15)) visibleTargets.push({station,x,y});
  }
}
function move(dt, activeKeys = keys) {
  const forward=walkVector.y+Number(activeKeys.has('w')||activeKeys.has('arrowup'))-Number(activeKeys.has('s')||activeKeys.has('arrowdown'));
  const side=walkVector.x+Number(activeKeys.has('d'))-Number(activeKeys.has('a'));
  view.yaw+=dt*1.85*(Number(activeKeys.has('turnright'))-Number(activeKeys.has('turnleft')));
  if(!forward&&!side) return;
  const distance=dt*2.65/Math.max(1,Math.hypot(forward,side));
  const dx=(Math.sin(view.yaw)*forward+Math.cos(view.yaw)*side)*distance;
  const dz=(Math.cos(view.yaw)*forward-Math.sin(view.yaw)*side)*distance;
  const clear=(x,z)=>x>-4.34&&x<4.34&&z>.25&&z<7.76&&
    !obstacles.some(o=>x>o.left-.19&&x<o.right+.19&&z>o.front-.19&&z<o.back+.19);
  if(clear(view.x+dx,view.z)) view.x+=dx;
  if(clear(view.x,view.z+dz)) view.z+=dz;
}
function nearbyStation() {
  let best=null, score=Infinity;
  for(const target of visibleTargets){
    const dx=(target.x-canvas.clientWidth/2)/canvas.clientWidth;
    const dy=(target.y-canvas.clientHeight/2)/canvas.clientHeight;
    const candidate=dx*dx+dy*dy;
    if(candidate>=score) continue;
    best=target.station;
    score=candidate;
  }
  return best;
}
