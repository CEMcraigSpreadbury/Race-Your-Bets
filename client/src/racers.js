export const RACER_POOL = [
  { id: 0, name: 'Craig Neck Speed',     color: '#ff6b6b', flavour: "Technically named after the host. He insists this gives the horse no unfair advantage. It does." },
  { id: 1, name: "Where There's A Will", color: '#f5c518', flavour: "She'll find a way to win. Or lose dramatically. Either way, she commits fully." },
  { id: 2, name: "Tom, Dick n Hurry",    color: '#4a9eff', flavour: "Three jockeys showed up to the paddock. No one's entirely sure which one is in charge." },
  { id: 3, name: 'Bend It Like Ben',     color: '#4caf50', flavour: "Corners like a sports car. Straight lines, however, are his absolute nemesis." },
  { id: 4, name: 'Joely Good Run',       color: '#c084fc', flavour: "Always smiling. Suspiciously always smiling. Even when last. Especially when last." },
  { id: 5, name: 'Dan-ger Zone',         color: '#ff9800', flavour: "Rides into every race like a man who has been in danger zones before and absolutely loved it." },
  { id: 6, name: 'Josh Wash',            color: '#00bcd4', flavour: "Spends more time at the water trough than on the track. He has his priorities." },
  { id: 7, name: 'Haydn Seek',           color: '#e91e63', flavour: "You'll never know where she is on the track. Remarkably, neither will she." },
  { id: 8, name: 'Hen-Ree Longlegs',     color: '#84cc16', flavour: "Longest legs in the paddock. Still somehow the shortest stride. A medical mystery." },
];

export function racerById(id, racers) {
  const list = racers ?? RACER_POOL;
  return list.find((r) => r.id === id) ?? { id, name: `Horse ${id}`, color: '#888' };
}
