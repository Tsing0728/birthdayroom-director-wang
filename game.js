// 把贺卡、便签和录音文件路径填在这里。录音可和网页放在同一目录。
const birthdayContent = {
  cameraCard: '生日快乐，多拍点好看的照片',
  wineCard: '虽然不是酒鬼，但是可以多放松放松❍⩊❍',
  deskCard: 'To 王恺卿\n王导虽然很神秘，但是我会持续霸凌你直到你放弃神秘。\n祝你和家人新的一年，开开心心，身体健康，学习工作都顺利🪄',
  mountainWish: '祝王导工作了也有空旅游爬山，登高望远天地皆宽',
  recording: 'record.mp3',
};

const $ = selector => document.querySelector(selector);
const panel = $('#panel');
const panelBody = $('#panel-body');
const hotspots = $('#hotspots');
const completed = new Set();
const climbed = new Set();
const giftState = {
  cameraTaken: false, photoTaken: false, cameraCardRead: false, mapCardRead: false,
  glassFull: false, drank: false, wineCardRead: false, deskCardRead: false,
  recordTaken: false, recordPlaced: false,
  cakeOpen: false, candlesOut: false, cakeBites: 0,
};
const cakeServings = 12;
let entered = false;
let activeStation = null;
let audioContext;
let audioBus;
let recording;
let ambience;
let birthdayNodes = [];

function startAudio() {
  const Audio = window.AudioContext || window.webkitAudioContext;
  if (!audioContext && Audio) {
    audioContext = new Audio();
    audioBus = audioContext.createGain();
    audioBus.gain.value = .3;
    audioBus.connect(audioContext.destination);
  }
  if (audioContext?.state === 'suspended') audioContext.resume().catch(() => {});
}
function melody(notes, beat, volume = .36) {
  startAudio();
  if (!audioContext) return [];
  let start = audioContext.currentTime + .035;
  return notes.map(([midi, length]) => {
    const oscillator = audioContext.createOscillator();
    const envelope = audioContext.createGain();
    const duration = beat * length;
    oscillator.type = 'triangle';
    oscillator.frequency.value = 440 * 2 ** ((midi - 69) / 12);
    envelope.gain.setValueAtTime(.001, start);
    envelope.gain.exponentialRampToValueAtTime(volume, start + .025);
    envelope.gain.exponentialRampToValueAtTime(.001, start + duration * .94);
    oscillator.connect(envelope).connect(audioBus);
    oscillator.start(start);
    oscillator.stop(start + duration);
    start += duration;
    return oscillator;
  });
}
function playPianoNote(note) {
  pianoPressedUntil.set(note,performance.now()+175);
  startAudio();
  if(!audioContext) return;
  const start=audioContext.currentTime;
  const frequency=440*2**((note-69)/12);
  for(const [harmonic,volume,decay] of [[1,.34,1.25],[2,.13,.64],[3,.055,.36],[4,.022,.19]]) {
    const tone=audioContext.createOscillator();
    const envelope=audioContext.createGain();
    tone.frequency.value=frequency*harmonic;
    envelope.gain.setValueAtTime(.0001,start);
    envelope.gain.linearRampToValueAtTime(volume,start+.008);
    envelope.gain.exponentialRampToValueAtTime(.0001,start+decay);
    tone.connect(envelope).connect(audioBus);
    tone.start(start);
    tone.stop(start+decay+.01);
  }
}
function pianoKeyAt(x,y) {
  return projectedPianoKeys.find(({corners}) => {
    const edges=corners.map(([ax,ay],i)=>{
      const [bx,by]=corners[(i+1)%corners.length];
      return (bx-ax)*(y-ay)-(by-ay)*(x-ax);
    });
    return edges.every(value=>value>=0) || edges.every(value=>value<=0);
  });
}
const birthdaySong = [
  [60,.5],[60,.5],[62,1],[60,1],[65,1],[64,2],
  [60,.5],[60,.5],[62,1],[60,1],[67,1],[65,2],
  [60,.5],[60,.5],[72,1],[69,1],[65,1],[64,1],[62,2],
  [70,.5],[70,.5],[69,1],[65,1],[67,1],[65,2],
];
function loopBirthdaySong() {
  if (giftState.candlesOut) return;
  birthdayNodes = melody(birthdaySong,.46,.76);
  const last = birthdayNodes.at(-1);
  if (last) last.onended = loopBirthdaySong;
}
function stopBirthdaySong() {
  for (const note of birthdayNodes) {
    note.onended = null;
    note.stop();
  }
  birthdayNodes = [];
}
function showPanel(title, markup, closeable = true) {
  panel.classList.toggle('diary-panel',false);
  panel.classList.remove('greeting-panel');
  panelBody.innerHTML = '<h2 id="panel-title"></h2>' + markup;
  $('#panel-title').textContent = title;
  $('#close').hidden = !closeable;
  resetMovement();
  if (!panel.open) panel.showModal();
}
function finish(id) {
  completed.add(id);
  $('#progress').textContent = completed.size + ' / 4';
  $('#progress').classList.toggle('ready', completed.size === 4);
}
function checkCamera() {
  if (giftState.photoTaken && giftState.cameraCardRead) finish('camera');
}
function checkWine() {
  if (giftState.drank && giftState.wineCardRead) finish('wine');
}
function animate(prop) {
  props[prop] = performance.now();
}

function action(id, label, disabled = false) {
  return '<button class="primary" id="' + id + '"' + (disabled ? ' disabled' : '') + '>' + label + '</button>';
}
function card(id, copy) {
  $(id).textContent = copy || '这张贺卡的祝福稍后写上。';
}

function cabinet() {
  playEffect('cabinet');
  const time = performance.now();
  cabinetDoor.from = cabinetAngle(time);
  cabinetDoor.open = !cabinetDoor.open;
  cabinetDoor.started = time;
}
function chest() {
  showPanel('上锁的小宝箱', '<p>小铜锁轻轻晃了两下，等着你拨动数字。</p><form id="lock-form" class="lock-form"><input class="lock" id="code" inputmode="numeric" maxlength="6" autocomplete="off" required pattern="[0-9]{6}" aria-label="六位密码" placeholder="六位密码">' + action('unlock','打开宝箱') + '</form><p class="error" id="lock-error" aria-live="polite"></p>');
  $('#lock-form').onsubmit = event => {
    event.preventDefault();
    if ($('#code').value !== '031114') {
      $('#lock-error').textContent = '密码不对，宝箱还锁着。';
      return;
    }
    animate('chest');
    panel.close();
  };
}
function camera() {
  giftState.cameraTaken = true;
  showPanel('胶片相机','<div class="photo-stage"><div class="photo-print" aria-label="小屋照片"></div><div class="camera"><button id="shutter" aria-label="按下快门" title="按下快门"></button></div></div>' +
    (giftState.photoTaken ? '<p>照片已收入手记。</p>' : '<p id="photo-caption">按一下机身上的快门。</p>'));
  if (savedPhoto) {
    $('.photo-stage').classList.add('developed');
    $('.photo-print').style.backgroundImage = savedPhoto;
    $('#shutter').disabled = true;
    return;
  }
  $('#shutter').onclick = () => {
    const stage = $('.photo-stage');
    const caption = $('#photo-caption');
    const photo = stage.querySelector('.photo-print');
    photo.style.backgroundImage = 'url("polaroid.jpg")';
    savedPhoto = photo.style.backgroundImage;
    stage.classList.add('developed');
    $('#shutter').disabled = true;
    playEffect('shutter');
    caption.textContent = '照片正在慢慢出来……';
    setTimeout(() => {
      giftState.photoTaken = true;
      checkCamera();
      if (caption.isConnected) caption.textContent = '照片已收入手记。';
    }, reducedMotion.matches ? 0 : 1250);
  };
}
let savedPhoto = '';
function readCard(kind) {
  const cards = {
    camera: ['留给镜头后的你', birthdayContent.cameraCard],
    wine: ['圆几上的贺卡', birthdayContent.wineCard],
    desk: ['书桌上的贺卡', birthdayContent.deskCard],
  };
  const [title, content] = cards[kind];
  showPanel(title,'<div class="card-art"><div class="envelope-stage"><button id="open-card" class="envelope" aria-label="拆开信封"><span class="envelope-flap" aria-hidden="true"></span><span class="envelope-pocket" aria-hidden="true"></span><span class="envelope-seal" aria-hidden="true">✿</span></button><article class="letter-card" hidden><i class="card-sprig top" aria-hidden="true"></i><p id="card-copy" class="'+(kind==='camera'?'torn-card-note':'')+'"></p><i class="card-sprig bottom" aria-hidden="true"></i></article></div></div>');
  panel.classList.add('greeting-panel');
  const cover = $('#open-card');
  if (kind === 'desk') {
    const seal = cover.querySelector('.envelope-seal');
    seal.textContent = '坏人卡';
    seal.classList.add('bad-card-seal');
    cover.setAttribute('aria-label','拆开坏人卡的信封');
    $('.letter-card').classList.add('long-letter');
  }
  const open = () => {
    cover.disabled = true;
    cover.classList.add('opened');
    $('.letter-card').hidden = false;
    card('#card-copy',content);
    giftState[kind+'CardRead'] = true;
    if (kind === 'camera') checkCamera();
    if (kind === 'wine') checkWine();
    $('#close').focus();
  };
  cover.onclick = open;
  if (giftState[kind+'CardRead']) open();
}
function pourWine() {
  playEffect('pour');
  giftState.glassFull = true;
  animate('pour');
}
function drinkWine() {
  giftState.glassFull = false;
  giftState.drank = true;
  animate('sip');
  checkWine();
}
function stopRecord() {
  recording?.pause();
  if (recordSpinning) animate('needle');
  recordSpinning = false;
}
let playAttempt = 0;
async function toggleRecord() {
  const attempt = ++playAttempt;
  if (recordSpinning) {
    stopRecord();
    return;
  }
  recordSpinning = true;
  animate('needle');
  if (birthdayContent.recording) {
    if (!recording) {
      recording = new Audio(birthdayContent.recording);
      recording.volume = .72;
    }
    recording.currentTime = 0;
    recording.onended = () => {
      if (attempt === playAttempt) stopRecord();
    };
    try {
      await recording.play();
      if (attempt !== playAttempt || !recordSpinning) return;
      finish('record');
      return;
    } catch {
      if (attempt !== playAttempt || !recordSpinning) return;
    }
  }
  showPanel('Another Piece of the Cake','<p>Summer Salt</p><iframe class="record-embed" title="Apple Music 播放器" src="https://embed.music.apple.com/us/album/another-piece-of-the-cake-single/1845191128?i=1845191129" allow="autoplay; encrypted-media" loading="lazy"></iframe><p><a href="https://www.youtube.com/watch?v=bBOnziDFiSM" target="_blank" rel="noopener noreferrer">在 Summer Salt 官方频道收听</a></p>');
  panel.addEventListener('close',() => {
    panelBody.querySelector('.record-embed')?.remove();
    if (attempt === playAttempt) stopRecord();
  },{once:true});
  finish('record');
}

const mountains = [
  ['四姑娘山',34,42,'siguniang'],['武功山',63,71,'wugong'],['五台山',68,16,'wutai'],
  ['泰山',86,27,'tai'],['华山',54,29,'hua'],['峨眉山',43,59,'emei'],
  ['武当山',59,47,'wudang'],['黄山',86,53,'huang'],['庐山',78,71,'lu'],
  ['梅里雪山',18,66,'meili'],['天柱山',73,45,'tianzhu'],['衡山',56,87,'heng'],
];
const visited = new Set(['泰山','华山','黄山','峨眉山']);
const mountainOutlines = {
  siguniang:'M3 45 16 31 24 35 39 12 51 25 63 16 82 44Z',
  wugong:'M3 45Q16 34 31 31T56 24Q69 27 83 45Z',
  wutai:'M3 45 18 33 34 31 44 21 59 22 70 34 83 45Z',
  tai:'M3 45 18 34 29 31 44 17 51 22 61 21 83 45Z',
  hua:'M4 45 17 34 24 19 32 22 44 5 51 13 57 30 65 21 82 45Z',
  emei:'M3 45 16 37 28 33 36 22 48 18 54 23 63 27 83 45Z',
  wudang:'M3 45 18 36 29 23 42 20 54 27 62 25 83 45Z',
  huang:'M3 45 14 34 24 37 31 18 39 13 47 27 56 21 66 27 83 45Z',
  lu:'M3 45 16 29 28 24 45 25 56 21 65 28 73 31 83 45Z',
  meili:'M3 45 19 34 29 20 37 27 51 8 61 22 70 25 83 45Z',
  tianzhu:'M3 45 17 36 28 34 35 16 43 8 50 12 57 32 67 35 83 45Z',
  heng:'M3 45 19 32 31 26 42 29 53 24 66 28 83 45Z',
};
const mountainDetails = {
  tai:'<circle class="mountain-wash mountain-sun" cx="64" cy="12" r="8"/>',
  huang:'<path class="mountain-ink" d="M24 35q5-10 2-18m-10 4q10-7 18-2m-12-4q7-6 15-2"/>',
  emei:'<path class="mountain-wash mountain-temple" d="M37 19h15v-4h-3v-4h-3V8h-2v3h-3v4h-4Z"/><path class="mountain-ink" d="M35 19h19l-4-4H39Zm4-5h11l-5-5Z"/>',
};
function drawMountain(art) {
  return '<svg class="mountain-art" viewBox="0 0 86 49" aria-hidden="true">' +
    (art === 'tai' ? mountainDetails.tai : '') +
    '<path class="mountain-wash" d="' + mountainOutlines[art] + '"/>' +
    '<path class="mountain-ink" d="' + mountainOutlines[art] + '"/>' +
    '<path class="mountain-ink ridge" d="M16 44q7-5 12-6l6-8m5 14 9-9 3-7m9 16 5-6 8 5"/>' +
    (art === 'tai' ? '' : mountainDetails[art] || '') + '</svg>';
}
function mountainMap() {
  const pins = mountains.map(([name,x,y,art],index) => {
    const colored = climbed.has(name);
    const illustration = drawMountain(art);
    return '<button class="map-pin' + (colored ? ' lit' : '') + '" style="--x:' + x + '%;--y:' + y + '%" data-mountain="' + index + '" aria-pressed="' + colored + '">' + illustration + name + '</button>';
  }).join('');
  showPanel('墙上的地图','<p>地图上的山，可以随便点点看。</p><div class="map-board">' + pins + '<div class="map-pocket" hidden><button id="map-slip" aria-label="抽出地图角上的便签"><span aria-hidden="true">✦</span></button></div></div>');
  const pocket = $('.map-pocket');
  pocket.hidden = climbed.size !== visited.size;
  $('#map-slip').onclick = mapNote;

  for (const pin of panel.querySelectorAll('[data-mountain]')) {
    pin.onclick = () => {
      const [name] = mountains[Number(pin.dataset.mountain)];
      if (!visited.has(name) || climbed.has(name)) return;
      climbed.add(name);
      pin.classList.add('lit');
      pin.setAttribute('aria-pressed','true');
      if (climbed.size === visited.size) pocket.hidden = false;
    };
  }
}

function mapNote() {
  if (climbed.size !== visited.size) return;
  giftState.mapCardRead = true;
  showPanel('山间便签','<div class="mountain-note"><span aria-hidden="true">✦</span><p id="mountain-note-copy"></p></div>');
  $('#mountain-note-copy').textContent = birthdayContent.mountainWish || '这一行祝福稍后写上。';
  finish('map');
}
function gift() {
  if (completed.size < 4) {
    showPanel('中央礼盒','<p>盒盖还扣着。</p>');
    return;
  }
  if (giftState.cakeOpen) return;
  giftState.cakeOpen = true;
  animate('lid');
  if (!lightsOff && !reducedMotion.matches) {
    nightFadeStarted = performance.now();
    nightFadeTimer = setTimeout(() => setLights(true),nightFadeDuration);
  } else setLights(true);
  ++playAttempt;
  stopRecord();
  loopBirthdaySong();
  setTimeout(() => { $('#wish-panel').hidden = false; },reducedMotion.matches ? 0 : 2150);
}
function setLights(off) {
  clearTimeout(nightFadeTimer);
  nightFadeStarted = null;
  lightsOff = off;
  document.body.classList.toggle('night',off);
}
function openHint() {
  let message = '柜子、沙发前的圆几、书架和地图，都可以走近看看。';
  if (giftState.cakeOpen) message = '想好了就吹灭蛋糕上的蜡烛。';
  else if (completed.size === 4) message = '去打开圆地毯中央的礼盒吧。';
  else if (giftState.recordTaken && !completed.has('record')) message = '把黑胶带到靠门那台唱片机上，落下唱针听听。';
  else if (giftState.cameraTaken && !giftState.photoTaken) message = '按一下相机上的快门，等照片慢慢出来。';
  else if (giftState.drank && !giftState.wineCardRead) message = '碰过杯了，圆几上还留着一张贺卡。';
  else if (climbed.size === visited.size && !completed.has('map')) message = '地图右下角露出了半张便签。';
  showPanel('一点提示','<p id="hint-copy"></p>');
  $('#hint-copy').textContent = message;
}
function journal() {
  const entries = [
    [giftState.cameraTaken,'胶片相机',camera],
    [giftState.photoTaken,'胶片照片',() => {
      showPanel('胶片照片','<div class="journal-photo" role="img" aria-label="拍立得合照"></div>');
      $('.journal-photo').style.backgroundImage = savedPhoto;
    }],
    [giftState.cameraCardRead,'相机旁的贺卡',() => readCard('camera')],
    [giftState.wineCardRead,'圆几上的贺卡',() => readCard('wine')],
    [giftState.deskCardRead,'书桌上的贺卡',() => readCard('desk')],
    [giftState.recordTaken,'黑胶唱片',() => showPanel('黑胶唱片','<p class="paper">唱片夹在书架的书里。靠门那台唱片机还空着。</p>')],
    [climbed.size,'地图',mountainMap],
    [giftState.mapCardRead,'山间便签',mapNote],
  ].filter(([found]) => found);
  showPanel('探索手记','<p>已完成 '+completed.size+' / 4 份礼物</p>' +
    (entries.length ? '<div class="journal-list"></div>' : '<p>捡到的东西会记在这里。</p>'));
  for (const [,label,open] of entries) {
    const button = document.createElement('button');
    button.className = 'plain';
    button.textContent = label;
    button.onclick = open;
    $('.journal-list').append(button);
  }
}
const interactions = {
  cabinet, liftChest:() => animate('liftChest'), chest, camera, cameraCard:() => readCard('camera'),
  wine:pourWine, glass:drinkWine, wineCard:() => readCard('wine'), deskCard:() => readCard('desk'),
  computer:() => showPanel('书桌上的电脑','<div class="computer-screen">这台电脑没有csgo</div>'),
  record:() => {giftState.recordTaken=true;},
  player:() => {
    if (giftState.recordTaken) giftState.recordPlaced=true;
    else showPanel('唱片机','<p>转盘还空着。去墙角的高书柜翻翻，看看哪本书旁边夹着唱片。</p>');
  }, needle:toggleRecord,
  map:mountainMap, gift, candle:toggleCandle, switch:() => setLights(!lightsOff),
  floorLamp:() => {floorLampOn = !floorLampOn;},
  cat:() => {animate('cat'); playEffect('cat');},
};
const stationRules = {
  cabinet: [() => true, () => cabinetDoor.open ? '关上小柜门' : '拉开小柜门'],
  liftChest: [() => cabinetDoor.open && !props.liftChest && cabinetAngle(performance.now())>.98, '有一个箱子，搬到柜面上看看'],
  chest: [() => props.liftChest && !props.chest && progress(props.liftChest,performance.now(),800)===1, '拨一拨宝箱的密码锁'],
  camera: [() => props.chest && !giftState.cameraTaken && progress(props.chest,performance.now(),570)===1, '拿起胶片相机'],
  cameraCard: [() => props.chest && !giftState.cameraCardRead && progress(props.chest,performance.now(),570)===1, '拿起宝箱里的贺卡'],
  wine: [() => !giftState.glassFull, '倒一杯酒'],
  glass: [() => giftState.glassFull && performance.now()-props.pour>=900, '喝一口'],
  wineCard: [() => !giftState.wineCardRead, '看看圆几上的贺卡'],
  deskCard: [() => !giftState.deskCardRead, '读读书桌上的贺卡'],
  computer: [() => true, '看看电脑'],
  record: [() => !giftState.recordTaken, '书里夹着张唱片，拿起来看看'],
  player: [() => !giftState.recordPlaced, () => giftState.recordTaken ? '放上唱片' : '看看唱片机'],
  needle: [() => giftState.recordPlaced, () => recordSpinning ? '抬起唱针 · 停止' : '落下唱针 · 播放'],
  map: [() => true, '展开地图'],
  gift: [() => !giftState.cakeOpen, () => completed.size === 4 ? '掀开礼盒' : '查看中央礼盒'],
  candle: [() => giftState.cakeOpen && progress(props.lid,performance.now(),2150)===1,
    () => giftState.candlesOut ? '再点亮蜡烛' : '吹灭蜡烛'],
  floorLamp: [() => true, () => floorLampOn ? '关掉落地灯' : '点亮落地灯'],
  switch: [() => true, () => lightsOff ? '开灯' : '关灯'],
  cat: [() => true, '摸摸小猫'],
};
function stationAvailable(station) {
  return stationRules[station.id][0]();
}
function stationLabel(station) {
  const label = stationRules[station.id][1];
  return typeof label === 'function' ? label() : label;
}
function interact(station = activeStation) {
  if (entered && !panel.open && station && stationAvailable(station)) interactions[station.id]();
}
$('#enter').onclick = () => {
  const button = $('#enter');
  button.disabled = true;
  $('.clapper').classList.add('clapped');
  startAudio();
  prepareFootsteps(audioContext);
  setTimeout(() => playEffect('clap'),reducedMotion.matches ? 0 : 265);
  setTimeout(() => {
    entered = true;
    $('#start').hidden = true;
    $('#hud').hidden = false;
    $('#walk').hidden = false;
    $('#room-tools').hidden = false;
    canvas.tabIndex = -1;
    canvas.focus({preventScroll: true});
  },reducedMotion.matches ? 0 : 510);
};
$('#help').onclick = () => showPanel('怎么玩','<p>电脑用 W A S D 或方向键走动，拖动画面转头。也可以按住 Shift 并按左右方向键转头。走近物件后，按 E 或点击物件上的标记。</p><p>手机横屏后，拖动左下角摇杆走动，在房间画面上滑动转头。</p>');
function updateAmbienceButton() {
  const playing = Boolean(ambience && !ambience.paused && !ambience.error);
  $('#sound').textContent = playing ? '环境声开' : '环境声关';
  $('#sound').setAttribute('aria-pressed',String(playing));
}
$('#sound').onclick = async () => {
  if (!ambience) {
    // Akum20, Birds chirping in a garden (CC0). 轻度滤波后的本地副本。
    ambience = new Audio('garden.mp3');
    ambience.loop = true;
    ambience.volume = .26;
    ambience.addEventListener('error',updateAmbienceButton);
  }
  if (!ambience.paused) {
    ambience.pause();
  } else {
    try {
      await ambience.play();
    } catch {
      ambience.pause();
    }
  }
  updateAmbienceButton();
};
$('#ask-hint').onclick = openHint;
$('#journal').onclick = journal;
function toggleCandle() {
  giftState.candlesOut = !giftState.candlesOut;
  $('#wish-panel').hidden = false;
  $('#blow').textContent = giftState.candlesOut ? '再点亮蜡烛' : '许好了，吹灭蜡烛';
  $('#wish-text').textContent = giftState.candlesOut ? '祝王导生日快乐，\n天天开心~\n愿望就留给你自己叭' : '闭上眼睛，许个愿吧。';
  $('#eat-cake').hidden = !giftState.candlesOut || giftState.cakeBites === cakeServings;
  $('#close-wish').hidden = !giftState.candlesOut;
  if (giftState.candlesOut) stopBirthdaySong();
  else {
    $('#cake-rating').hidden = true;
    loopBirthdaySong();
  }
}
const cakeRating = $('#cake-rating');
function askAboutCake() {
  cakeRating.dataset.spot = '0';
  $('#cake-rating-text').textContent = '蛋糕好不好吃？';
  $('#cake-rating-choices').hidden = false;
  cakeRating.hidden = false;
}
$('#blow').onclick = toggleCandle;
$('#eat-cake').onclick = () => {
  if (!giftState.candlesOut || giftState.cakeBites >= cakeServings) return;
  playEffect('chew');
  giftState.cakeBites++;
  $('#eat-cake').hidden = giftState.cakeBites === cakeServings;
  askAboutCake();
};
$('#cake-good').onclick = () => {
  $('#cake-rating-text').textContent = '有品！';
  $('#cake-rating-choices').hidden = true;
};
$('#cake-bad').onclick = () => {
  cakeRating.dataset.spot = String((Number(cakeRating.dataset.spot)+1)%4);
};
$('#close-rating').onclick = () => { cakeRating.hidden = true; };
$('#close-wish').onclick = () => { $('#wish-panel').hidden = true; };
$('#close').onclick = () => panel.close();
const hotspotButtons = new Map();
for (const station of stations) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'hotspot';
  button.hidden = true;
  button.innerHTML = '<span class="dot" aria-hidden="true"></span><span class="hotspot-label"></span>';
  button.onclick = () => interact(station);
  hotspots.append(button);
  hotspotButtons.set(station,button);
}
function positionHotspots() {
  const targets = new Map(entered && !panel.open ? visibleTargets.map(target => [target.station,target]) : []);
  for (const [station,button] of hotspotButtons) {
    const target = targets.get(station);
    button.hidden = !target;
    if (!target) continue;
    const {x,y} = target;
    const label = stationLabel(station);
    if (button.lastElementChild.textContent !== label) button.lastElementChild.textContent = label;
    button.style.left = x+'px';
    button.style.top = y+'px';
    button.classList.toggle('active',station===activeStation);
    button.classList.toggle('reverse',x>canvas.clientWidth-205);
  }
}

const movementKeys = new Set(['w','a','s','d','arrowup','arrowdown','turnleft','turnright']);
const physicalKeys = {KeyW:'w',KeyA:'a',KeyS:'s',KeyD:'d',KeyE:'e'};
function gameKey(event) {
  if (event.key === 'ArrowLeft') return event.shiftKey ? 'turnleft' : 'a';
  if (event.key === 'ArrowRight') return event.shiftKey ? 'turnright' : 'd';
  const key = event.key?.toLowerCase();
  if (movementKeys.has(key) || key === 'e') return key;
  return physicalKeys[event.code] ?? physicalKeys['Key' + String.fromCharCode(event.keyCode)] ?? key;
}
const heldKeys = new Map();
const unprocessedPresses = new Set();
const quickTaps = new Set();
function resetMovement() {
  resetJoystick();
  keys.clear();
  heldKeys.clear();
  unprocessedPresses.clear();
  quickTaps.clear();
}
function pressMovementKey(identity,key) {
  if (!heldKeys.has(identity)) unprocessedPresses.add(key);
  heldKeys.set(identity,key);
  keys.add(key);
}
function keyIdentity(event) {
  return event.code && event.code !== 'Unidentified' ? event.code : gameKey(event);
}
document.addEventListener('keydown',event => {
  if (!entered || panel.open || event.ctrlKey || event.metaKey || event.altKey) return;
  const identity = keyIdentity(event);
  const key = heldKeys.get(identity) ?? gameKey(event);
  if (movementKeys.has(key)) {
    event.preventDefault();
    if (audioContext?.state === 'suspended') startAudio();
    pressMovementKey(identity,key);
  }
  if (key === 'e' && !event.repeat) interact();
}, true);
document.addEventListener('keypress',event => {
  // Some layouts expose the Latin character only in the later keypress event.
  if (!entered || panel.open || event.ctrlKey || event.metaKey || event.altKey) return;
  const key = event.key?.toLowerCase();
  if (!['w','a','s','d'].includes(key) || keys.has(key)) return;
  event.preventDefault();
  pressMovementKey(keyIdentity(event),key);
}, true);
document.addEventListener('keyup',event => {
  const identity = keyIdentity(event);
  const key = heldKeys.get(identity) ?? gameKey(event);
  heldKeys.delete(identity);
  if (![...heldKeys.values()].includes(key)) {
    if (unprocessedPresses.delete(key)) quickTaps.add(key);
    keys.delete(key);
  }
}, true);
window.addEventListener('blur',resetMovement);
panel.addEventListener('close',() => {
  resetMovement();
  if (entered) canvas.focus({preventScroll:true});
});
const joystick = $('#walk');
let joystickPointer = null;
function resetJoystick() {
  joystickPointer=null;
  walkVector.x=0;
  walkVector.y=0;
  joystick.style.setProperty('--stick-x','0px');
  joystick.style.setProperty('--stick-y','0px');
}
function updateJoystick(event) {
  const bounds=joystick.getBoundingClientRect();
  const x=event.clientX-bounds.left-bounds.width/2;
  const y=event.clientY-bounds.top-bounds.height/2;
  const radius=bounds.width*.30;
  const distance=Math.hypot(x,y);
  const limit=Math.max(radius,distance);
  const strength=Math.max(0,Math.min(1,(distance/radius-.12)/.88));
  walkVector.x=distance ? x/distance*strength : 0;
  walkVector.y=distance ? -y/distance*strength : 0;
  joystick.style.setProperty('--stick-x',x/limit*radius+'px');
  joystick.style.setProperty('--stick-y',y/limit*radius+'px');
}
joystick.addEventListener('pointerdown',event=>{
  if(!entered || panel.open || joystickPointer!==null) return;
  joystickPointer=event.pointerId;
  joystick.setPointerCapture(event.pointerId);
  updateJoystick(event);
});
joystick.addEventListener('pointermove',event=>{
  if(event.pointerId===joystickPointer) updateJoystick(event);
});
for(const type of ['pointerup','pointercancel','lostpointercapture']) {
  joystick.addEventListener(type,event=>{
    if(event.pointerId===joystickPointer) resetJoystick();
  });
}
matchMedia('(orientation: portrait)').addEventListener('change',resetMovement);
let lookPointer = null;
canvas.addEventListener('pointerdown',event => {
  if (!entered || panel.open || lookPointer) return;
  canvas.focus({preventScroll:true});
  lookPointer = {id:event.pointerId,x:event.clientX,y:event.clientY,travel:0};
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener('pointermove',event => {
  if (lookPointer?.id !== event.pointerId) return;
  lookPointer.travel+=Math.hypot(event.clientX-lookPointer.x,event.clientY-lookPointer.y);
  view.yaw -= (event.clientX-lookPointer.x)*.006;
  view.pitch = Math.max(-.62,Math.min(.58,view.pitch+(event.clientY-lookPointer.y)*.004));
  lookPointer.x = event.clientX;
  lookPointer.y = event.clientY;
});
canvas.addEventListener('pointerup',event => {
  if(lookPointer?.id!==event.pointerId || lookPointer.travel>5) return;
  const bounds=canvas.getBoundingClientRect();
  const key=pianoKeyAt(event.clientX-bounds.left,event.clientY-bounds.top);
  if(key) playPianoNote(key.note);
});
canvas.addEventListener('lostpointercapture',() => { lookPointer = null; });
let lastFrame = 0;
const strideLength = .92;
let stepDistance = strideLength - .18;
let nextStep = 0;
function frame(time) {
  const dt = Math.min(.045,(time-lastFrame)/1000);
  lastFrame = time;
  if (entered && !panel.open) {
    const x = view.x, z = view.z;
    // A press and release can both arrive between two animation frames.
    if (quickTaps.size) {
      move(Math.max(dt,.045),new Set([...keys,...quickTaps]));
    } else {
      move(dt);
    }
    quickTaps.clear();
    unprocessedPresses.clear();
    const walked = Math.hypot(view.x-x,view.z-z);
    if (walked>0) {
      stepDistance += walked;
      if (stepDistance >= strideLength) {
        stepDistance -= strideLength;
        playEffect('step' + nextStep);
        nextStep = (nextStep + 1) % 5;
      }
    }
  }
  render(time);
  activeStation = entered ? nearbyStation() : null;
  positionHotspots();

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

if (new URLSearchParams(window.location.search).has('keycheck')) {
  const report = document.createElement('pre');
  report.style.cssText = 'position:fixed;top:5rem;left:1rem;z-index:1000;pointer-events:none;max-width:95vw;white-space:pre-wrap;padding:.75rem;background:#fff7e7;color:#31241c;font:14px monospace';
  document.body.append(report);
  const events = [];
  const instructions = '进屋后依次按 d、Shift+D、→。这里会显示浏览器收到的按键。';
  report.textContent = instructions + '\n等待按键…';
  for (const type of ['keydown','keypress','keyup']) {
    window.addEventListener(type,event => {
      if (!entered || panel.open || event.repeat) return;
      const fields = [type, 'key=' + JSON.stringify(event.key),
        'code=' + event.code, 'keyCode=' + event.keyCode, 'Shift=' + Number(event.shiftKey)];
      setTimeout(() => {
        events.push(fields.join(' ') + ' | 移动键=' + ([...keys].join(',') || '—'));
        report.textContent = instructions + '\n' + events.slice(-14).join('\n');
        if (events.length > 14) events.shift();
      });
    }, true);
  }
}
