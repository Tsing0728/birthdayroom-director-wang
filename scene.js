let lightsOff = false;
let nightFadeStarted = null;
let nightFadeTimer;
const nightFadeDuration = 1800;
let floorLampOn = false;
const props = {chest:0, liftChest:0, pour:0, sip:0, lid:0, cat:0, needle:0};
const cabinetDoor = {open:false,from:0,started:0};
function cabinetAngle(time) {
  const t=progress(cabinetDoor.started,time,720);
  return cabinetDoor.from+((cabinetDoor.open ? 1 : 0)-cabinetDoor.from)*t;
}
let recordSpinning = false;
let recordAngle = 0;
let lastSceneTime = 0;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
function progress(start, time, duration) {
  if (!start) return 0;
  const t = reducedMotion.matches ? 1 : Math.max(0, Math.min(1, (time-start)/duration));
  return t*t*(3-2*t);
}
const brass = ['#be975c','#957342','#e6c48a'];
const cream = ['#f2deba','#d4b991','#fff0cc'];
const leather = ['#996958','#754b41','#bd866b'];
const dark = ['#554039','#362d31','#785e52'];
function disc(faces,x,y,z,r,h,colors,sides=24,cut=0) {
  const rim = Array.from({length:cut ? sides+1 : sides},(_,i)=>{
    const a=cut/2+Math.PI*1.5+i*(2*Math.PI-cut)/sides;
    return [x+r*Math.cos(a),y+h,z+r*Math.sin(a)];
  });
  for (let i=0;i<sides;i++) {
    const a=rim[i], b=rim[(i+1)%rim.length];
    face(faces,colors[(a[2]+b[2])/2<z ? 0 : 1], [a[0],y,a[2]],[b[0],y,b[2]],b,a);
  }
  if(cut) {
    for(const edge of [rim[0],rim.at(-1)]) face(faces,colors[0],[x,y,z],[edge[0],y,edge[2]],edge,[x,y+h,z]);
    rim.push([x,y+h,z]);
  }
  face(faces,colors[2],...rim);
}
function propBox(faces,x,y,z,w,h,d,colors) {
  box(x,y,z,w,h,d,colors,false,faces);
}
function softShape(faces,x,y,z,rx,ry,rz,colors) {
  const rings = 5, sides = 14;
  function vertex(ring, side) {
    const latitude = Math.PI * (ring / rings - .5);
    const angle = Math.PI * 2 * side / sides;
    return [x + rx * Math.cos(latitude) * Math.cos(angle),
      y + ry * Math.sin(latitude), z + rz * Math.cos(latitude) * Math.sin(angle)];
  }
  for (let ring = 0; ring < rings; ring++) {
    for (let side = 0; side < sides; side++) {
      const tone = ring < 2 ? 0 : ring > 3 ? 2 : 1;
      face(faces, colors[tone], vertex(ring,side), vertex(ring,side+1),
        vertex(ring+1,side+1), vertex(ring+1,side));
      faces.at(-1).soft = true;
    }
  }
}
function rotateFaces(faces,from,pivot,angle,axis) {
  const c=Math.cos(angle), s=Math.sin(angle);
  for (const surface of faces.slice(from)) for (const p of surface.corners) {
    const dx=p.x-pivot.x, dy=p.y-pivot.y, dz=p.z-pivot.z;
    if (axis==='y') {
      p.x=pivot.x+dx*c+dz*s;
      p.z=pivot.z-dx*s+dz*c;
    } else if (axis==='x') {
      p.y=pivot.y+dy*c-dz*s;
      p.z=pivot.z+dy*s+dz*c;
    } else {
      p.x=pivot.x+dx*c-dy*s;
      p.y=pivot.y+dx*s+dy*c;
    }
  }
}
function roundedBox(faces,x,y,z,w,h,d,r,colors) {
  r=Math.min(r,w*.46,h*.46,d*.46);
  const rings=[[0,r*.55],[r,0],[h-r,0],[h,r*.55]].map(([height,inset])=>{
    const ring=[];
    for(let corner=0;corner<4;corner++){
      const angle=corner*Math.PI/2;
      const cx=x+Math.sign(Math.cos(angle+.3))*(w/2-r);
      const cz=z+Math.sign(Math.sin(angle+.3))*(d/2-r);
      for(let step=0;step<=4;step++){
        const a=angle+step*Math.PI/8;
        ring.push([cx+Math.cos(a)*(r-inset),y+height,cz+Math.sin(a)*(r-inset)]);
      }
    }
    return ring;
  });
  for(let k=0;k<3;k++) for(let i=0;i<20;i++){
    const next=(i+1)%20;
    face(faces,colors[k===2 ? 2 : k===0 ? 1 : 0],rings[k][i],rings[k][next],rings[k+1][next],rings[k+1][i]);
    faces.at(-1).soft=true;
  }
  face(faces,colors[2],...rings[3]); faces.at(-1).soft=true;
}
const upholstery=['#7e906e','#6f8061','#a0ac86'];
const cushions=['#97a681','#788967','#b2bd95'];
roundedBox(furniture,-4.29,.38,5.35,.34,.67,2.20,.12,upholstery);
for (const z of [4.31,6.39]) roundedBox(furniture,-3.97,.29,z,.87,.43,.24,.09,upholstery);
for (const z of [4.86,5.84]) roundedBox(furniture,-3.92,.45,z,.72,.18,.96,.08,cushions);
roundedBox(furniture,-4.11,.60,4.82,.19,.34,.44,.08,['#d49b72','#be825c','#e7b38c']);
roundedBox(furniture,-4.11,.60,5.91,.19,.34,.43,.08,['#e1cfaa','#c9b487','#f0dfb9']);
for(const z of [4.38,6.32]) for(const x of [-4.27,-3.72]) {
  roundedBox(furniture,x,0,z,.10,.13,.10,.022,wood);
}

function lathe(faces,x,z,profile,colors,sides=24) {
  const rings=profile.map(([y,r])=>Array.from({length:sides},(_,i)=>{
    const a=i*Math.PI*2/sides;
    return [x+r*Math.cos(a),y,z+r*Math.sin(a)];
  }));
  for(let k=0;k<rings.length-1;k++) for(let i=0;i<sides;i++){
    const j=(i+1)%sides;
    const color=colors[k][Math.floor(3*(1+Math.cos((i+.5)*2*Math.PI/sides))/2)];
    face(faces,color,rings[k][i],rings[k][j],rings[k+1][j],rings[k+1][i]);
    faces.at(-1).soft=true;
  }
}
function book(x,y,z,w,d,cover) {
  roundedBox(furniture,x,y,z,w,.012,d,.005,cover);
  roundedBox(furniture,x,y+.011,z,w-.023,.034,d-.019,.007,cream);
  roundedBox(furniture,x,y+.045,z,w,.012,d,.005,cover);
  roundedBox(furniture,x-w/2+.012,y+.004,z,.023,.049,d,.009,cover);
  for(const offset of [.021,.031]) {
    box(x+.006,y+offset,z-d/2+.009,w-.037,.002,.002,['#c7ad88','#c7ad88','#c7ad88']);
  }
}
function openBox(faces,x,y,z,w,h,d,open,colors,base=true) {
  const wall=.04;
  if(base) propBox(faces,x,y,z,w,wall,d,colors);
  for (const side of [-1,1]) {
    propBox(faces,x+side*(w-wall)/2,y,z,wall,h,d,colors);
    propBox(faces,x,y,z+side*(d-wall)/2,w,h,wall,colors);
  }
  const start=faces.length;
  roundedBox(faces,x,y+h,z,w+.035,.052,d+.03,.023,colors);
  propBox(faces,x,y+h+.045,z,w*.18,.006,d+.03,brass);
  rotateFaces(faces,start,point(x,y+h,z+d/2),open*1.84,'x');
}
// 玄关在出生点后方，开关和衣钩都装在门边。
box(0,0,.035,1.58,2.55,.085,wood);
box(0,.05,.105,1.39,2.38,.07,green);
for (const y of [.23,1.35]) box(0,y,.151,1.06,.81,.035,['#7c8e69','#657555','#92a07c']);
box(-.48,1.03,.19,.11,.11,.085,brass);
box(-1.08,1.17,.12,.22,.31,.075,cream);
box(-1.08,1.23,.176,.12,.17,.06,green);
box(-2.7,1.89,.12,1.74,.18,.12,wood);
// Indoor AC above the coat hooks, with a recessed outlet and status light.
roundedBox(furniture,-2.45,2.72,.15,1.27,.31,.25,.08,
  ['#e9e1d0','#cfc6b4','#faf2e2']);
roundedBox(furniture,-2.45,2.758,.280,1.08,.075,.024,.010,dark);
for(const y of [2.776,2.798,2.820]) {
  box(-2.45,y,.295,.99,.006,.012,['#b3a999','#968a79','#c9bead']);
}
box(-2.03,2.915,.282,.030,.013,.013,['#779573','#648268','#aec09a']);
for(const x of [-3.22,-2.7,-2.18]) box(x,1.88,.23,.11,.10,.19,brass);
table(-2.7,.46,1.62,.55,.38);
table(2.16,.55,1.02,.63,.59);
function plant(x,y,z,scale) {
  const clay=['#a66d51','#bc8869','#cf9a79'];
  const rim=['#bd8666','#d8a686','#e0b093'];
  const potProfile=[[0,.139],[.025,.153],[.207,.191],[.218,.207],[.245,.207],[.252,.183],[.234,.178]];
  lathe(furniture,x,z,potProfile.map(([h,r])=>[y+h*scale,r*scale]),
    [clay,clay,rim,rim,rim,clay],32);
  disc(furniture,x,y+.222*scale,z,.178*scale,.009*scale,['#65533b','#65533b','#725c43'],32);
  const leaves=[
    [-2.5,.34,.69,.19,.105],[-1.55,.23,.62,.18,.092],[-.67,.35,.56,.19,.096],
    [.28,.34,.72,.22,.106],[1.26,.20,.88,.23,.099],[2.3,.34,.74,.22,.113],
    [3.08,.26,.60,.18,.099],
  ];
  for(const [i,[angle,reach,height,length,width]] of leaves.entries()) {
    const dx=Math.cos(angle),dz=Math.sin(angle);
    const stem=t=>[x+dx*reach*scale*t*t,y+(.228+(height-.228)*t)*scale,z+dz*reach*scale*t*t];
    const stemRings=Array.from({length:9},(_,j)=>{
      const [sx,sy,sz]=stem(j/8);
      return Array.from({length:7},(_,k)=>{
        const a=k*2*Math.PI/7,r=.015*scale*(1-j/18);
        return [sx+Math.cos(a)*r,sy,sz+Math.sin(a)*r];
      });
    });
    for(let j=0;j<8;j++) for(let k=0;k<7;k++){
      const next=(k+1)%7;
      face(furniture,k<3?'#667953':'#506248',stemRings[j][k],stemRings[j][next],stemRings[j+1][next],stemRings[j+1][k]);
      furniture.at(-1).soft=true;
    }
    const [cx,cy,cz]=stem(1);
    const tilt=.41+(i%3)*.25;
    const leaf=Array.from({length:24},(_,j)=>{
      const a=j*Math.PI/12, u=Math.cos(a)*length*scale,v=Math.sin(a)*width*scale;
      return [cx+dx*u*tilt-dz*v,cy+u*.82,cz+dz*u*tilt+dx*v];
    });
    const colors=i%2 ? ['#9aaa7d','#889a70','#7d9065'] : ['#819775','#6d8969','#657e61'];
    const middle=[cx-dx*.022*scale,cy+.012*scale,cz-dz*.022*scale];
    for(let j=0;j<24;j++){
      face(furniture,colors[j<12 ? 0 : j<20 ? 1 : 2],middle,leaf[j],leaf[(j+1)%24]);
      furniture.at(-1).soft=true;
    }
  }
}
plant(2.16,.71,.55,1);
plant(3.19,0,.52,1.45);
box(4.55,1.72,deskSpot.z,.075,1.21,.88,wood);
box(4.50,1.79,deskSpot.z,.045,1.07,.73,cream);
face(furniture,'#a55041',[4.474,1.90,deskSpot.z-.12],[4.474,1.90,deskSpot.z-.19],[4.474,1.98,deskSpot.z-.19],[4.474,1.98,deskSpot.z-.12]);
const inkStrokes = [
  [[.32,.16],[.30,.30],[.29,.43]], [[.11,.24],[.31,.22],[.46,.19]],
  [[.15,.32],[.32,.29],[.44,.28]], [[.08,.43],[.30,.40],[.48,.37]],
  [[.17,.49],[.15,.68],[.16,.87]], [[.17,.51],[.43,.46],[.42,.82],[.36,.90],[.30,.84]],
  [[.17,.60],[.40,.56]], [[.17,.70],[.40,.65]],
  [[.67,.15],[.63,.23],[.53,.32]], [[.64,.25],[.85,.22],[.76,.36]],
  [[.56,.39],[.90,.35],[.85,.59]], [[.52,.50],[.94,.44]], [[.56,.61],[.84,.56]],
  [[.72,.37],[.71,.67],[.69,.90],[.62,.93],[.56,.86]],
];
function decorateWalls() {
  for (const [z, height, accent] of [[4.20,1.63,'#8c9d84'],[5.20,1.89,'#ce9e76']]) {
    box(-4.55,height,z,.08,.70,.65,wood);
    box(-4.49,height+.055,z,.045,.59,.53,cream);
    const x=-4.459;
    const shape=Array.from({length:18},(_,i)=>{
      const a=i*Math.PI/9;
      return [x,height+.38+Math.sin(a)*.143,z+Math.cos(a)*.164];
    });
    face(furniture,accent,...shape);
    face(furniture,'#a7896e',[x,height+.155,z-.17],[x,height+.155,z+.17],[x,height+.17,z+.17],[x,height+.17,z-.17]);
  }
  for(let i=0;i<10;i++){
    const x=-3.9+i*.72;
    const y=3.06-.24*Math.sin(i*Math.PI/9);
    const next=3.06-.24*Math.sin((i+1)*Math.PI/9);
    face(furniture,'#957554',[x,y,7.63],[x+.72,next,7.63],[x+.72,next+.014,7.63],[x,y+.014,7.63]);
    face(furniture,['#b68066','#adb484','#d5ad70','#8caa9e'][i%4],[x+.13,y-.023,7.625],[x+.48,(y+next)/2-.015,7.625],[x+.31,y-.245,7.625]);
  }
}
decorateWalls();
const wineBaseStart=furniture.length;
disc(furniture,wineSpot.x,0,wineSpot.z,.29,.075,wood);
disc(furniture,wineSpot.x,.075,wineSpot.z,.10,.415,wood);
groupSurfaces(furniture,wineBaseStart,wineTableGroup,0);
const wineTopStart=furniture.length;
disc(furniture,wineSpot.x,.49,wineSpot.z,.53,.10,wood,32);
groupSurfaces(furniture,wineTopStart,wineTableGroup,1);
obstacles.push({left:wineSpot.x-.42,right:wineSpot.x+.42,front:wineSpot.z-.42,back:wineSpot.z+.42});
softShape(furniture,nest.x,.096,nest.z,.52,.092,.39,['#957052','#c49a73','#d1aa85']);
softShape(furniture,nest.x,.157,nest.z,.449,.065,.322,['#b38b68','#e0c39d','#ebd3b0']);
const stars = Array.from({length:23},(_,i)=>[
  -3.85+(i*83%347)/100, 1.63+(i*47%125)/100, 7.878,
]);
for(const [x,y,z] of stars) {
  const r=.012+(Math.abs(x*23)%1)*.016;
  face(furniture,'transparent',[x-r,y,z],[x,y+r,z],[x+r,y,z],[x,y-r,z]);
  furniture.at(-1).night='#fff2bd';
}
for(let i=0;i<28;i++){
  const edge=(n,inner)=>{
    const a=Math.PI/3+n*Math.PI*4/84;
    const inset=inner ? .17*Math.sin(n*Math.PI/28) : 0;
    return [-1.33+Math.cos(a)*.25+inset,2.48+Math.sin(a)*.25,7.873];
  };
  face(furniture,'transparent',edge(i,false),edge(i+1,false),edge(i+1,true),edge(i,true));
  furniture.at(-1).night='#fff3d3';
  furniture.at(-1).soft=true;
}

// 书桌的座位在右墙一侧，椅背朝墙。
box(deskSpot.x+.83,.42,deskSpot.z,.44,.09,.49,green);
box(deskSpot.x+1.06,.48,deskSpot.z,.095,.47,.51,green);
for (const x of [deskSpot.x+.66,deskSpot.x+1.01]) for (const z of [deskSpot.z-.17,deskSpot.z+.17]) {
  box(x,.03,z,.06,.40,.06,wood);
}
// 高书柜靠右后墙角，唱片套露在中层书脊间。
box(3.84,.05,7.76,1.24,2.42,.12,wood);
for (const x of [3.27,4.41]) box(x,.05,7.54,.085,2.42,.44,wood);
for (const y of [.18,.79,1.34,1.91,2.41]) box(3.84,y,7.54,1.24,.06,.44,wood);
for (const [row,y] of [.24,.85,1.40,1.97].entries()) {
  for(let i=0;i<8;i++){
    if(row===1&&i===2) continue;
    const colors=[green,cream,leather,wood][(row+i)%4];
    box(3.42+i*.128,y,7.48,.093,.26+((i*5+row)%5)*.022+(i%3)*.032,.24,colors);
    box(3.42+i*.128,y+.049,7.357,.059,.012,.006,cream);
  }
}
obstacles.push({left:3.21,right:4.46,front:7.32,back:7.82});
// 电脑屏幕朝向靠墙的座位，书和笔给桌面留出阅读空间。
box(deskSpot.x-.08,.915,deskSpot.z,.30,.025,.44,dark);
box(deskSpot.x-.215,.94,deskSpot.z,.028,.24,.44,dark);
box(deskSpot.x-.195,.959,deskSpot.z,.009,.20,.39,['#b3c5bb','#b3c5bb','#ccd9ce']);
box(deskSpot.x-.02,.942,deskSpot.z,.14,.006,.34,['#aca094','#aca094','#aca094']);
const keyboardKey=['#4e4644','#383234','#625654'];
for(let row=0;row<4;row++) for(let col=0;col<10;col++) {
  box(deskSpot.x-.073+row*.025,.948,deskSpot.z-.142+col*.031,.020,.007,.025,keyboardKey);
}
box(deskSpot.x+.051,.943,deskSpot.z,.036,.004,.11,['#756961','#756961','#b3a397']);
book(deskSpot.x+.14,.915,deskSpot.z-.40,.27,.24,leather);
book(deskSpot.x+.12,.972,deskSpot.z-.42,.22,.23,green);
const penStart=furniture.length;
lathe(furniture,deskSpot.x+.17,deskSpot.z-.42,[[1.034,.001],[1.05,.009],[1.168,.009],[1.18,.011],[1.193,.006]],[brass,dark,brass,dark],12);
rotateFaces(furniture,penStart,point(deskSpot.x+.17,1.034,deskSpot.z-.42),Math.PI/2,'z');
// 浅木底座、麻绳柱、吊碗与软垫。
const birch=['#b99b6f','#a98960','#debf8d'];
const sisal=['#a88858','#917346','#c8ab72'];
const catTreeStart=furniture.length;
roundedBox(furniture,3.95,.01,1.68,.92,.077,.77,.055,birch);
for(const [x,z,h] of [[3.60,1.54,1.64],[4.20,1.53,1.15],[4.18,1.93,1.64],[3.63,1.94,.51]]) {
  lathe(furniture,x,z,[[.07,.066],[.095,.062],[h+.047,.062],[h+.07,.067]],
    [birch,sisal,birch],20);
  for(let y=.11;y<h+.05;y+=.043) {
    lathe(furniture,x,z,[[y,.062],[y+.006,.065],[y+.013,.062]],
      [['#9b7c50','#ad8d5b','#bfa06d'],sisal],14);
  }
}
roundedBox(furniture,3.95,.58,1.70,.86,.077,.63,.04,birch);
roundedBox(furniture,4.04,.65,1.72,.52,.077,.46,.038,cream);
box(4.29,.65,1.72,.04,.35,.49,birch);
box(4.04,.65,1.96,.52,.35,.038,birch);
box(4.05,1.02,1.73,.55,.045,.53,birch);
box(3.95,1.22,1.71,.85,.048,.58,birch);
for(const [y,r] of [[.97,.081],[1.01,.136],[1.06,.177],[1.11,.203],[1.16,.216]]) {
  disc(furniture,3.83,y,1.70,r,.05,['#dce0d56b','#bcbab06b','#e9e8da6b'],18);
}
box(3.89,1.72,1.72,.79,.05,.58,birch);
roundedBox(furniture,3.89,1.77,1.72,.76,.108,.54,.050,cream);
roundedBox(furniture,3.89,1.85,1.95,.77,.09,.095,.041,cream);
for(const x of [3.54,4.24]) box(x,1.85,1.72,.073,.075,.54,cream);
// Rails lean into the side of the platform, with their ends below the top.
const ladderFoot={x:3.17,y:.035};
const ladderTop={x:3.515,y:.615};
const ladderMidX=(ladderFoot.x+ladderTop.x)/2;
const ladderMidY=(ladderFoot.y+ladderTop.y)/2;
const ladderHeight=Math.hypot(ladderTop.x-ladderFoot.x,ladderTop.y-ladderFoot.y);
for(const z of [1.57,1.82]) {
  const start=furniture.length;
  roundedBox(furniture,ladderMidX,ladderMidY-ladderHeight/2,z,.052,ladderHeight,.043,.012,birch);
  rotateFaces(furniture,start,point(ladderMidX,ladderMidY,z),-Math.atan2(ladderTop.x-ladderFoot.x,ladderTop.y-ladderFoot.y),'z');
}
for(const t of [.25,.46,.67]) {
  const x=ladderFoot.x+(ladderTop.x-ladderFoot.x)*t;
  const y=ladderFoot.y+(ladderTop.y-ladderFoot.y)*t;
  roundedBox(furniture,x,y-.019,1.695,.095,.038,.269,.014,cream);
}
box(3.66,1.49,1.48,.012,.23,.012,dark);
softShape(furniture,3.66,1.442,1.48,.054,.053,.052,['#ab7560','#c68d78','#dfad91']);
for (const surface of furniture.slice(catTreeStart)) {
  for (const corner of surface.corners) corner.z+=1.20;
}
obstacles.push({left:3.45,right:4.42,front:2.35,back:3.26});
obstacles.push({left:3.13,right:3.45,front:2.73,back:3.05});

// The upright faces the room, with low notes on the player's left.
const pianoKeys=[];
const pianoWood=['#785543','#54392e','#9a7257'];
const ivory=['#e9d9bb','#d3bc9a','#fff2d4'];
box(4.26,.09,1.47,.48,1.18,1.30,pianoWood,true);
box(4.25,1.27,1.47,.52,.055,1.36,wood);
box(4.006,.91,1.47,.026,.26,1.17,wood);
box(3.90,.75,1.47,.38,.075,1.31,pianoWood,true);
for (const z of [.87,2.07]) box(3.76,.08,z,.09,.70,.09,pianoWood);
for (const z of [1.40,1.48,1.56]) box(3.92,.075,z,.15,.023,.034,brass);
const whiteNotes=[60,62,64,65,67,69,71,72,74,76,77,79,81,83,84];
for (let i=0;i<whiteNotes.length;i++) {
  pianoKeys.push({note:whiteNotes[i],x:3.847,y:.827,z:2.03-i*.08,w:.249,d:.076,colors:ivory});
  if (whiteNotes[i+1]-whiteNotes[i]===2) {
    pianoKeys.push({note:whiteNotes[i]+1,x:3.924,y:.867,z:1.99-i*.08,w:.143,d:.046,colors:dark});
  }
}
const pianoPressedUntil=new Map();
// 中央小圆桌保留放得下蛋糕的桌面，收窄两侧过道。
for (const a of [Math.PI/2,Math.PI*7/6,Math.PI*11/6]) {
  box(Math.cos(a)*.36,0,4.75+Math.sin(a)*.36,.09,.67,.09,wood);
}
disc(furniture,0,.66,4.75,.55,.12,wood,36);
obstacles.push({left:-.48,right:.48,front:4.27,back:5.23});

function sceneFaces(time) {
  const faces=[];
  const shade=floorLampOn ? ['#ffdfa0','#ffe7b0','#fff2d4'] : ['#c1a57c','#dfc6a0','#f0dbb3'];
  const trim=['#a68963','#b89a70','#d4b78d'];
  lathe(faces,-4.04,6.82,[[1.47,.295],[1.485,.300],[1.50,.293],[1.77,.172],[1.785,.165],[1.785,.149]],
    [trim,trim,shade,shade,trim],36);
  disc(faces,-4.04,1.481,6.82,.278,.009,floorLampOn?['#ffe4ad','#ffe4ad','#fff1cd']:shade,36);
  softShape(faces,-4.04,1.473,6.82,.055,.026,.055,shade);
  const cabinetSwing=cabinetAngle(time);
  const {x:cx,z:cz}=cabinetSpot;
  let start=faces.length;
  roundedBox(faces,cx,.10,cz-.34,.90,.73,.075,.032,green);
  roundedBox(faces,cx,.17,cz-.386,.74,.58,.035,.016,['#657757','#53664b','#84956b']);
  softShape(faces,cx+.28,.535,cz-.422,.035,.035,.031,brass);
  rotateFaces(faces,start,point(cx-.45,0,cz-.34),cabinetSwing*1.99,'y');
  if (cabinetSwing>.02 || props.liftChest) {
    const extraction=progress(props.liftChest,time,800);
    const open=progress(props.chest,time,570);
    const lift=Math.sin(Math.PI*extraction);
    const chestY=.34+.575*extraction+.23*lift;
    const chestZ=cz-.04-.06*extraction-.42*lift;
    openBox(faces,cx,chestY,chestZ,.61,.19-open*.07,.41,open,wood);
    if (!props.chest) propBox(faces,cx,chestY+.08,chestZ-.22,.10,.115,.045,brass);
    if (props.chest && !giftState.cameraTaken) {
      propBox(faces,cx-.17,chestY+.075,chestZ-.015,.19,.11,.10,green);
      propBox(faces,cx-.17,chestY+.11,chestZ-.072,.068,.055,.025,dark);
    }
    if (props.chest && !giftState.cameraCardRead) {
      propBox(faces,cx+.18,chestY+.068,chestZ-.052,.18,.066,.079,cream);
      propBox(faces,cx+.18,chestY+.093,chestZ-.097,.043,.031,.009,leather);
    }
  }
  const pour=progress(props.pour,time,1350), sip=progress(props.sip,time,500);
  const tilt=Math.sin(Math.PI*pour);
  const bottleX=-2.89+tilt*.12;
  start=faces.length;
  const bottleBase=.59+tilt*.11;
  const glassGreen=['#2d4a3d','#496951','#637e60'];
  const label=['#ddd0a3','#e8dcb2','#f4e6bf'];
  const lip=['#496353','#577362','#839879'];
  lathe(faces,bottleX,5.39,[[0,.069],[.016,.086],[.105,.086],[.113,.088],
    [.224,.088],[.23,.086],[.303,.086],[.325,.072],[.35,.043],[.37,.031],
    [.451,.031],[.459,.04],[.479,.04],[.484,.022],[.469,.020]]
    .map(([y,r])=>[bottleBase+y,r]),
    [glassGreen,glassGreen,label,label,label,glassGreen,glassGreen,glassGreen,
      glassGreen,glassGreen,lip,lip,lip,dark]);
  const pivotY=.73+tilt*.11;
  const angle=tilt*1.19;
  rotateFaces(faces,start,point(bottleX,pivotY,5.39),-angle,'z');
  if (tilt>.76) {
    const mouth=[bottleX+.344*Math.sin(angle),pivotY+.344*Math.cos(angle),5.39];
    const rings=Array.from({length:11},(_,i)=>{
      const t=i/10;
      const x=mouth[0]+(-2.46-mouth[0])*t;
      const y=mouth[1]+(.67-mouth[1])*t*t;
      const z=mouth[2]+(5.27-mouth[2])*t;
      return Array.from({length:7},(_,side)=>{
        const a=side*2*Math.PI/7, r=.008-.003*t;
        return [x+Math.cos(a)*r,y,z+Math.sin(a)*r];
      });
    });
    for(let i=0;i<10;i++) for(let j=0;j<7;j++) {
      const next=(j+1)%7;
      face(faces,j%3===0?'#d5947d':'#ad5a54',rings[i][j],rings[i][next],rings[i+1][next],rings[i+1][j]);
      faces.at(-1).soft=true;
    }
  }
  const glass=['#ffeed756','#d9c5ac39','#fff5dd48'];
  const rim=['#fff6e3ad','#edddc48a','#fff9ebbc'];
  lathe(faces,-2.46,5.27,[[.59,.062],[.601,.075],[.62,.079],[.745,.098],[.754,.099],[.757,.093],[.747,.089],[.621,.069]],
    [rim,glass,glass,rim,rim,rim,glass],24);
  const level=giftState.glassFull ? pour : props.sip ? 1-sip : 0;
  if(level>.02) disc(faces,-2.46,.607,5.27,.069+level*.011,level*.093,['#a65450','#8c423c','#c97868'],24);
  if (!giftState.wineCardRead) {
    propBox(faces,wineSpot.x+.18,.593,wineSpot.z+.28,.19,.021,.15,cream);
    propBox(faces,wineSpot.x+.18,.615,wineSpot.z+.28,.039,.007,.039,leather);
  }
  groupSurfaces(faces,start,wineTableGroup,2);
  if (!giftState.deskCardRead) {
    propBox(faces,deskSpot.x-.20,.915,deskSpot.z+.39,.22,.032,.24,cream);
    propBox(faces,deskSpot.x-.20,.949,deskSpot.z+.39,.056,.008,.066,leather);
  }
  if (!giftState.recordTaken) {
    propBox(faces,3.68,.84,7.46,.10,.32,.24,leather);
    propBox(faces,3.68,.96,7.332,.065,.08,.012,brass);
  }

  const platter=['#38333a','#28252b','#51474b'];
  disc(faces,(playerSpot.x-.15),.918,playerSpot.z,.245,.033,platter);
  const dt=Math.min(.05,(time-lastSceneTime)/1000);
  lastSceneTime=time;
  if(recordSpinning) recordAngle+=dt*3.5;
  if (giftState.recordPlaced) {
    disc(faces,(playerSpot.x-.15),.95,playerSpot.z,.244,.014,['#29252b','#26232a','#353037']);
    disc(faces,(playerSpot.x-.15),.964,playerSpot.z,.081,.004,leather);
    const markX=(playerSpot.x-.15)+Math.cos(recordAngle)*.162, markZ=playerSpot.z+Math.sin(recordAngle)*.162;
    disc(faces,markX,.965,markZ,.027,.005,brass,8);
  }
  const sweep=progress(props.needle,time,300);
  const down=recordSpinning ? sweep : props.needle ? 1-sweep : 0;
  start=faces.length;
  disc(faces,(playerSpot.x+.35),.92,(playerSpot.z+.19),.047,.07,brass,12);
  propBox(faces,(playerSpot.x+.35),.987,(playerSpot.z+.03),.036,.029,.34,brass);
  propBox(faces,(playerSpot.x+.35),.968,(playerSpot.z-.133),.057,.045,.065,dark);
  rotateFaces(faces,start,point((playerSpot.x+.35),.99,(playerSpot.z+.19)),down*.93,'y');

  const opening=progress(props.lid,time,850);
  const moving=progress(props.lid ? props.lid+700 : 0,time,1450);
  const lift=Math.sin(Math.PI*moving)*.78;
  const boxY=.78*(1-moving)+lift;
  const boxZ=4.75+moving*.92;
  const giftColors=['#a76667','#8f5458','#c4817d'];
  openBox(faces,0,boxY,boxZ,.78,.58,.72,opening,giftColors,false);
  for (const side of [-1,1]) {
    roundedBox(faces,0,boxY+.013,boxZ+side*.362,.11,.55,.013,.005,brass);
    for (const x of [-.27,-.16,.16,.27]) {
      softShape(faces,x,boxY+.22+(Math.abs(x)>.2?.09:0),boxZ+side*.366,.018,.018,.009,cream);
    }
  }
  const bowStart=faces.length;
  for(const side of [-1,1]) {
    softShape(faces,side*.081,boxY+.674,boxZ,.087,.042,.046,brass);
  }
  softShape(faces,0,boxY+.665,boxZ,.045,.043,.045,brass);
  rotateFaces(faces,bowStart,point(0,boxY+.58,boxZ+.36),opening*1.84,'x');
  if (giftState.cakeOpen && opening>.14) {
    const cakeHeight=.78;
    const bites=giftState.cakeBites;
    const cut=bites*2*Math.PI/cakeServings;
    disc(faces,0,cakeHeight,4.75,.37,.033,cream);
    if (bites < cakeServings) {
      const cakeStart=faces.length;
      disc(faces,0,cakeHeight+.033,4.75,.31,.25,['#d79572','#b97862','#ffe5ba'],48,cut);
      for(const surface of faces.slice(cakeStart)) surface.soft=true;
      disc(faces,0,cakeHeight+.13,4.75,.313,.034,cream,32,cut);
      disc(faces,0,cakeHeight+.277,4.75,.317,.056,cream,32,cut);
      for(let i=0;i<24;i++){
        const a=(i+.5)*Math.PI/12;
        if(Math.acos(-Math.sin(a))<cut/2+.065) continue;
        const x=Math.cos(a)*.30,z=4.75+Math.sin(a)*.30;
        softShape(faces,x,cakeHeight+.060,z,.025,.019,.025,cream);
        softShape(faces,x,cakeHeight+.207+.013*Math.cos(i*Math.PI/2),z,.012,.012,.012,
          ['#cf7770','#d58c7b','#eca992']);
      }
      for(let i=0;i<12;i++){
        const a=(i+.5)*Math.PI/6;
        if (Math.acos(-Math.sin(a))<cut/2+.03) continue;
        const x=Math.cos(a)*.229, z=4.75+Math.sin(a)*.229;
        softShape(faces,x,cakeHeight+.347,z,.039,.028,.039,cream);
        if(i%2===0) {
          softShape(faces,x,cakeHeight+.388,z,.033,.039,.033,['#a8424b','#cf5b5e','#e88278']);
          softShape(faces,x,cakeHeight+.425,z,.020,.009,.019,green);
        }
      }
    }
    // 蜡烛在独立的小底座上，蛋糕吃完后仍然可以点亮。
    const candleY=candleBase();
    disc(faces,0,candleY-.012,4.75,.052,.02,brass,12);
    disc(faces,0,candleY,4.75,.021,.198,green,12);
    propBox(faces,0,candleY+.194,4.75,.009,.02,.009,dark);
  }

  for (const key of pianoKeys) {
    const pressed=(pianoPressedUntil.get(key.note) ?? 0)>time;
    propBox(faces,key.x,key.y-(pressed ? .014 : 0),key.z,key.w,.032,key.d,
      pressed ? ['#b28c63','#977152','#e2b882'] : key.colors);
  }
  return faces;
}
const sleepingCat = new Image();
sleepingCat.src = 'sleeping-cat.png?v=clean-cat';
function drawSleepingCat(basis,project) {
  if (!sleepingCat.naturalWidth) return;
  const anchor=cameraSpace(point(nest.x,.217,nest.z),basis);
  const top=cameraSpace(point(nest.x,.62,nest.z),basis);
  if(anchor.z<.3 || top.z<.3) return;
  for(const obstacle of obstacles) {
    let near=0,far=1;
    for(const [from,to,min,max] of [
      [view.x,nest.x,obstacle.left,obstacle.right],
      [view.z,nest.z,obstacle.front,obstacle.back],
    ]) {
      const delta=to-from;
      if(Math.abs(delta)<.00001) {
        if(from<min || from>max) far=-1;
      } else {
        const a=(min-from)/delta,b=(max-from)/delta;
        near=Math.max(near,Math.min(a,b));
        far=Math.min(far,Math.max(a,b));
      }
    }
    if(far>near && near<.97) return;
  }
  const [x,y]=project(anchor);
  const h=y-project(top)[1];
  if(h<=0) return;
  const w=h*sleepingCat.naturalWidth/sleepingCat.naturalHeight;
  drawing.drawImage(sleepingCat,x-w/2,y-h,w,h);
  return [x+w*.20,y-h*.48];
}
function candleBase() {
  return giftState.cakeBites === cakeServings ? .83 : 1.11;
}
function drawSceneDetails(basis,project,w,h,time) {
  if (floorLampOn) {
    const lamp=cameraSpace(point(-4.04,1.60,6.82),basis);
    if(lamp.z>.45) {
      const [x,y]=project(lamp);
      const radius=Math.min(Math.min(w,h)*.82,Math.max(110,h*1.08/lamp.z));
      const glow=drawing.createRadialGradient(x,y,0,x,y,radius);
      glow.addColorStop(0,lightsOff?'#ffe1a04d':'#ffe5a924');
      glow.addColorStop(.27,lightsOff?'#ffd99832':'#ffd9981d');
      glow.addColorStop(.66,lightsOff?'#ffc77612':'#ffc7760a');
      glow.addColorStop(1,'#ffc77600');
      drawing.fillStyle=glow;
      drawing.fillRect(x-radius,y-radius,2*radius,2*radius);
    }
  }
  if(view.x<4.47) {
    const wallPoint = ([u,v]) => cameraSpace(point(4.474,2.73-v*.78,deskSpot.z+.26-u*.53),basis);
    for(const [index,stroke] of inkStrokes.entries()){
      const points=stroke.map(wallPoint);
      if(points.some(p=>p.z<.16)) continue;
      const projected=points.map(project);
      for(let i=1;i<projected.length;i++){
        const [x1,y1]=projected[i-1], [x2,y2]=projected[i];
        const weight = index===4 || index===5 || index===13 ? 1.28 : index%3===0 ? 1.08 : .87;
        const size=Math.min(19,Math.max(1,h*.018*weight/points[i].z));
        const distance=Math.hypot(x2-x1,y2-y1)||1;
        const nx=-(y2-y1)/distance, ny=(x2-x1)/distance;
        const taper=i===projected.length-1?.24:.68;
        drawing.beginPath();
        drawing.moveTo(x1-nx*size*.50,y1-ny*size*.50);
        drawing.quadraticCurveTo((x1+x2)/2-nx*size*.76,(y1+y2)/2-ny*size*.76,x2-nx*size*taper,y2-ny*size*taper);
        drawing.lineTo(x2+nx*size*taper,y2+ny*size*taper);
        drawing.quadraticCurveTo((x1+x2)/2+nx*size*.43,(y1+y2)/2+ny*size*.43,x1+nx*size*.28,y1+ny*size*.28);
        drawing.fillStyle=lightsOff?'#423a3d':index%3===0?'#46382d':'#332b25';
        drawing.fill();
      }
    }
  }
  if(!giftState.cakeOpen || giftState.candlesOut || progress(props.lid,time,850)<.66) return;
  const flame=cameraSpace(point(0,candleBase()+.25,4.75),basis);
  if(flame.z<.4) return;
  const [x,y]=project(flame);
  const size=Math.min(38,13/flame.z)*(1+.08*Math.sin(time/77));
  const radius=Math.max(40,size*8);
  const glow=drawing.createRadialGradient(x,y,0,x,y,radius);
  glow.addColorStop(0,'#ffd58a65');
  glow.addColorStop(1,'#ffd58a00');
  drawing.fillStyle=glow;
  drawing.fillRect(x-radius,y-radius,2*radius,2*radius);
  drawing.beginPath();
  drawing.ellipse(x,y,size*.36,size*.72,.08,0,Math.PI*2);
  drawing.fillStyle='#fff1b8';
  drawing.fill();
}
