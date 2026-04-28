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

function play(src) {
  const a = new Audio(src);
  a.play().catch(() => {});
}

export function playRaceStart()  { play('/sounds/race start.aac'); }
export function playRaceFinish() { play('/sounds/race finish.aac'); }

let randomTimer = null;
let remaining = [];

function nextFromBag() {
  if (remaining.length === 0) {
    // Reshuffle all sounds into a new random order
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
