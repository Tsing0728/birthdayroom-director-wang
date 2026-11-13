// 短音效已剪到动作所需的长度，全部随小屋本地提供。
const effectClips = {
  clap: ['foley-clap.mp3', .76],
  cabinet: ['foley-cabinet.mp3', .70],
  cat: ['cat-meow-real.mp3', .55],
  shutter: ['camera-shutter.mp3', .55],
  pour: ['foley-pour.mp3', .62],
  chew: ['foley-chew.mp3', .52],
};
for (let i = 0; i < 5; i++) {
  effectClips['step' + i] = ['wood-step-' + i + '.mp3', .62];
}
const effectPlayers = new Map();
for (const [name,[source,volume]] of Object.entries(effectClips)) {
  const player = new Audio(source);
  player.preload = 'auto';
  player.volume = volume;
  effectPlayers.set(name,player);
}
const stepBuffers = new Map();
let stepAudio;
function prepareFootsteps(context) {
  if (!context || stepAudio) return;
  stepAudio = context;
  for (let i = 0; i < 5; i++) {
    const name = 'step' + i;
    fetch(effectClips[name][0])
      .then(response => {
        if (!response.ok) throw new Error('Footstep audio unavailable');
        return response.arrayBuffer();
      })
      .then(data => context.decodeAudioData(data))
      .then(buffer => stepBuffers.set(name, buffer))
      .catch(() => {});
  }
}
function playEffect(name) {
  const buffer = stepBuffers.get(name);
  if (buffer && stepAudio.state === 'running') {
    const source = stepAudio.createBufferSource();
    const gain = stepAudio.createGain();
    source.buffer = buffer;
    gain.gain.value = effectClips[name][1];
    source.connect(gain);
    gain.connect(stepAudio.destination);
    source.onended = () => { source.disconnect(); gain.disconnect(); };
    source.start();
    return;
  }
  const player = effectPlayers.get(name);
  if (!player) return;
  player.currentTime = 0;
  player.play().catch(() => {});
}

