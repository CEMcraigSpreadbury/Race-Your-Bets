const RANDOM_SOUNDS = [
  "Can't lead a horse to water",
  'Dang',
  'God damn I love to see those horses run',
  "It's anyone's race",
  'Keep those bets coming in',
  'Quit horsing around',
  'Sheesh look at that big boy move',
  'This could be a close one',
  'Ben',
  'Craig',
  'Dan',
  'Haydn',
  'Henry',
  'Joel',
  'Josh',
  'Tom',
  'Will',
].map((name) => `/sounds/random/${name}.aac`);

let ctx = null;
const buffers = {};

export function initSounds() {
  if (ctx) return;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    ctx.resume();
  } catch (e) { return; }

  const all = ['/sounds/race start.aac', '/sounds/race finish.aac', ...RANDOM_SOUNDS];
  for (const src of all) {
    fetch(src)
      .then((r) => r.arrayBuffer())
      .then((ab) => ctx.decodeAudioData(ab))
      .then((buf) => { buffers[src] = buf; })
      .catch(() => {});
  }
}

function play(src) {
  if (!ctx || !buffers[src]) return;
  const source = ctx.createBufferSource();
  source.buffer = buffers[src];
  source.connect(ctx.destination);
  source.start(0);
}

export function playRaceStart()  { play('/sounds/race start.aac'); }
export function playRaceFinish() { play('/sounds/race finish.aac'); }

let randomTimer = null;
let remaining = [];

function nextFromBag() {
  if (remaining.length === 0) {
    remaining = [...RANDOM_SOUNDS].sort(() => Math.random() - 0.5);
  }
  return remaining.pop();
}

export function startRandomSounds() {
  stopRandomSounds();
  remaining = [...RANDOM_SOUNDS].sort(() => Math.random() - 0.5);
  const schedule = () => {
    const delay = 4000 + Math.random() * 4000;
    randomTimer = setTimeout(() => {
      play(nextFromBag());
      schedule();
    }, delay);
  };
  schedule();
}

export function stopRandomSounds() {
  if (randomTimer) { clearTimeout(randomTimer); randomTimer = null; }
  remaining = [];
}
