export const RACER_POOL = [
  { id: 0, name: 'Prancing Pony', color: '#ff6b6b' },
  { id: 1, name: 'Thunder Bolt',  color: '#f5c518' },
  { id: 2, name: 'Iron Duke',     color: '#4a9eff' },
  { id: 3, name: 'Silver Arrow',  color: '#4caf50' },
  { id: 4, name: 'Dusty Rose',    color: '#c084fc' },
  { id: 5, name: 'Night Rider',   color: '#ff9800' },
  { id: 6, name: 'Golden Gate',   color: '#00bcd4' },
  { id: 7, name: 'Storm Chaser',  color: '#e91e63' },
];

export function racerById(id, racers) {
  const list = racers ?? RACER_POOL;
  return list.find((r) => r.id === id) ?? { id, name: `Horse ${id}`, color: '#888' };
}
