const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

// ─── Racer pool ───────────────────────────────────────────────────────────────
const RACER_POOL = [
  { id: 0, name: 'Craig Neck Speed',     color: '#ff6b6b' },
  { id: 1, name: "Where There's A Will", color: '#f5c518' },
  { id: 2, name: "Tom, Dick n Hurry",    color: '#4a9eff' },
  { id: 3, name: 'Bend It Like Ben',     color: '#4caf50' },
  { id: 4, name: 'Joely Good Run',       color: '#c084fc' },
  { id: 5, name: 'Dan-ger Zone',         color: '#ff9800' },
  { id: 6, name: 'Josh Wash',            color: '#00bcd4' },
  { id: 7, name: 'Haydn Seek',           color: '#e91e63' },
  { id: 8, name: 'Hen-Ree Longlegs',     color: '#84cc16' },
];

// ─── In-memory room store ─────────────────────────────────────────────────────
const rooms = {};

const STARTING_TOKENS = 10;
const BET_LOCK_PCT    = 0.75;

// slots: { odds, loss } — win earns chip×odds, lose costs chip×loss (0 = safe slot)
const BET_TYPES = {
  win:   { label: 'WIN',   slots: [{ odds: 7, loss: 2 }, { odds: 5, loss: 2 }, { odds: 3, loss: 1 }], qualifies: (rank) => rank === 1 },
  place: { label: 'PLACE', slots: [{ odds: 4, loss: 1 }, { odds: 2, loss: 1 }],                        qualifies: (rank) => rank <= 2 },
  show:  { label: 'SHOW',  slots: [{ odds: 2, loss: 1 }, { odds: 2, loss: 0 }],                        qualifies: (rank) => rank <= 3 },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickTwo(arr) {
  const s = shuffle([...arr]);
  return [s[0], s[1]];
}

const TRACK_LENGTH = 10;

// ─── Side bet generators ──────────────────────────────────────────────────────
const SIDE_BET_GENERATORS = [
  (racers) => {
    if (racers.length < 2) return null;
    const [a, b] = pickTwo(racers);
    return { type: 'head_to_head', description: `${a.name} finishes ahead of ${b.name}`, horseIds: [a.id, b.id], odds: 2, loss: 1, qualifies: (rankOf) => rankOf(a.id) < rankOf(b.id) };
  },
  (racers) => {
    const h = randomFrom(racers);
    return { type: 'wins', description: `${h.name} wins the race`, horseIds: [h.id], odds: 4, loss: 2, qualifies: (rankOf) => rankOf(h.id) === 1 };
  },
  (racers) => {
    const h = randomFrom(racers);
    return { type: 'finishes_last', description: `${h.name} finishes last`, horseIds: [h.id], odds: 4, loss: 2, qualifies: (rankOf) => rankOf(h.id) === racers.length };
  },
  (racers) => {
    if (racers.length < 2) return null;
    const [a, b] = pickTwo(racers);
    return { type: 'either_wins', description: `${a.name} or ${b.name} wins the race`, horseIds: [a.id, b.id], odds: 3, loss: 1, qualifies: (rankOf) => rankOf(a.id) === 1 || rankOf(b.id) === 1 };
  },
  (racers) => {
    if (racers.length < 3) return null;
    const [a, b] = pickTwo(racers);
    return { type: 'neither_wins', description: `Neither ${a.name} nor ${b.name} wins`, horseIds: [a.id, b.id], odds: 3, loss: 2, qualifies: (rankOf) => rankOf(a.id) > 1 && rankOf(b.id) > 1 };
  },
  (racers) => {
    if (racers.length < 4) return null;
    const h = randomFrom(racers);
    const half = Math.floor(racers.length / 2);
    return { type: 'top_half', description: `${h.name} finishes in the top half`, horseIds: [h.id], odds: 2, loss: 1, qualifies: (rankOf) => rankOf(h.id) <= half };
  },
  (racers) => {
    const h = randomFrom(racers);
    return { type: 'not_last', description: `${h.name} does not finish last`, horseIds: [h.id], odds: 2, loss: 1, qualifies: (rankOf) => rankOf(h.id) < racers.length };
  },
  (racers) => {
    if (racers.length < 3) return null;
    const h = randomFrom(racers);
    return { type: 'exactly_second', description: `${h.name} finishes in 2nd place`, horseIds: [h.id], odds: 4, loss: 1, qualifies: (rankOf) => rankOf(h.id) === 2 };
  },
  (racers) => {
    if (racers.length < 2) return null;
    const [a, b] = pickTwo(racers);
    return { type: 'both_top3', description: `${a.name} and ${b.name} both finish top 3`, horseIds: [a.id, b.id], odds: 3, loss: 1, qualifies: (rankOf) => rankOf(a.id) <= 3 && rankOf(b.id) <= 3 };
  },
];

function generateSideBets(racers) {
  const bets = [];
  for (const gen of shuffle(SIDE_BET_GENERATORS)) {
    if (bets.length >= 3) break;
    const bet = gen(racers);
    if (bet) bets.push({ ...bet, id: `sb_${bets.length}` });
  }
  return bets;
}

function generateBaseDeck(racers) {
  const deck = [];
  for (const racer of racers) {
    for (let i = 0; i < 1; i++) deck.push({ type: 'move', value: 1, racerId: racer.id });
    for (let i = 0; i < 2; i++) deck.push({ type: 'move', value: 2, racerId: racer.id });
  }
  const specialTypes = [
    'boost', 'boost',
    'stumble', 'stumble',
    'double', 'double',
  ];
  for (const type of specialTypes) {
    deck.push({ type, racerId: randomFrom(racers).id });
  }
  return shuffle(deck);
}

function generateCardOptions(racers) {
  const pool = [
    { type: 'move', value: 1 }, { type: 'move', value: 1 }, { type: 'move', value: 1 },
    { type: 'move', value: 2 }, { type: 'move', value: 2 },
    { type: 'double' }, { type: 'boost' }, { type: 'stumble' },
  ];
  return shuffle(pool).slice(0, 3).map((card) => ({ ...card, racerId: randomFrom(racers).id }));
}

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function defaultSettings() {
  return {
    totalRaces:  3,
    trackLength: 20,
    horses: RACER_POOL.slice(0, 9).map((r) => ({ id: r.id, name: r.name, color: r.color })),
  };
}

// ─── Sponsorship helpers ──────────────────────────────────────────────────────
// Return = floor( investment × 2 × (K − rank) / K )
// Profit when rank < K/2, loss when rank > K/2, total loss at last place.
function calcSponsorReturn(investment, rank, numHorses) {
  return Math.floor(investment * 2 * (numHorses - rank) / numHorses);
}

function buildSponsorList(room) {
  return Object.entries(room.sponsorships ?? {}).map(([playerId, s]) => ({
    playerId, playerName: s.playerName, racerId: s.racerId, racerName: s.racerName, amount: s.amount,
  }));
}

// ─── Dynamic odds ─────────────────────────────────────────────────────────────
function computeRacerStakes(room) {
  const stakes = {};
  for (const r of room.racers) stakes[r.id] = 0;
  for (const p of room.players) {
    for (const [key, bet] of Object.entries(p.bets ?? {})) {
      const rId = parseInt(key.slice(0, key.indexOf('_')));
      stakes[rId] = (stakes[rId] ?? 0) + bet.amount;
    }
  }
  return stakes;
}

// Popular horse → shorter odds; ignored horse → longer odds.
// factor = 1 at average stake, ~0.5 at 3× average, ~1.3 at 0.
function adjustOdds(baseOdds, racerStake, totalStake, numRacers) {
  if (totalStake === 0) return baseOdds;
  const avgStake = totalStake / numRacers;
  const ratio    = racerStake / avgStake;          // 1 = average
  const factor   = Math.max(0.5, Math.min(1.5, 1 + (1 - ratio) * 0.3));
  return Math.max(2, Math.round(baseOdds * factor));
}

// ─── Bet summaries ────────────────────────────────────────────────────────────
function buildSideBetSummary(room) {
  const occupants = {};
  for (const sb of room.sideBets ?? []) {
    occupants[sb.id] = room.sideBetSlots[sb.id] ?? [];
  }
  return { occupants };
}

function buildBetSummary(room) {
  const racers = room.racers;
  const slots  = {};
  for (const r of racers) {
    slots[r.id] = {};
    for (const [type, def] of Object.entries(BET_TYPES)) {
      slots[r.id][type] = def.slots.map(() => null);
    }
  }
  const racerStakes = computeRacerStakes(room);
  const totalStake  = Object.values(racerStakes).reduce((s, v) => s + v, 0);
  for (const p of room.players) {
    for (const [key, bet] of Object.entries(p.bets ?? {})) {
      const under   = key.indexOf('_');
      const racerId = parseInt(key.slice(0, under));
      const betType = key.slice(under + 1);
      if (slots[racerId]?.[betType]) {
        slots[racerId][betType][bet.slotIndex] = {
          playerId: p.id, playerName: p.name, amount: bet.amount, odds: bet.odds,
        };
      }
    }
  }
  // Adjusted odds for every empty slot (what the next bettor would get)
  const adjustedOdds = {};
  for (const r of racers) {
    adjustedOdds[r.id] = {};
    for (const [type, def] of Object.entries(BET_TYPES)) {
      adjustedOdds[r.id][type] = def.slots.map((slot) =>
        adjustOdds(slot.odds, racerStakes[r.id] ?? 0, totalStake, racers.length)
      );
    }
  }
  return { slots, adjustedOdds };
}

// ─── Room broadcast ───────────────────────────────────────────────────────────
function broadcastRoomUpdate(roomCode) {
  const room = rooms[roomCode];
  if (!room) return;
  io.to(roomCode).emit('room_update', {
    roomCode,
    players:  room.players,
    hostId:   room.hostId,
    state:    room.state,
    settings: room.settings,
  });
}

// ─── Game start / new race (shared logic) ─────────────────────────────────────
function beginGame(roomCode, preserveTokens = false) {
  const room = rooms[roomCode];
  if (!room || room.players.length < 1) return false;

  const racers = room.racers;

  room.baseDeck = generateBaseDeck(racers);
  room.deck     = [...room.baseDeck];
  room.state    = 'drafting';
  room.currentTurnIndex = 0;
  room.completedPlayers = [];
  room.currentOptions   = generateCardOptions(racers);
  room.lockedRacers     = new Set();
  room.raceId           = (room.raceId ?? 0) + 1;

  room.players.forEach((p) => {
    if (!preserveTokens) p.tokens = STARTING_TOKENS;
    p.bets     = {};
    p.sideBets = {};
  });

  room.sponsorships = {};
  room.sideBets     = generateSideBets(racers);
  room.sideBetSlots = {};
  for (const sb of room.sideBets) room.sideBetSlots[sb.id] = [];

  const firstPlayer  = room.players[0];
  const turnData     = { currentTurnIndex: 0, currentPlayerName: firstPlayer.name, completedPlayers: [] };
  const betTypes       = { win: { label: 'WIN', slots: [{ odds: 7, loss: 2 }, { odds: 5, loss: 2 }, { odds: 3, loss: 1 }] }, place: { label: 'PLACE', slots: [{ odds: 4, loss: 1 }, { odds: 2, loss: 1 }] }, show: { label: 'SHOW', slots: [{ odds: 2, loss: 1 }, { odds: 2, loss: 0 }] } };
  const trackLength    = room.trackLength ?? 10;
  const publicSideBets = room.sideBets.map(({ id, type, description, horseIds, odds, loss }) => ({ id, type, description, horseIds, odds, loss }));
  const sponsorships   = buildSponsorList(room);

  console.log(`[Room ${roomCode}] Race #${room.raceId}/${room.totalRaces} — ${racers.length} horses, ${room.baseDeck.length} cards, ${publicSideBets.length} side bets`);

  io.to(room.hostId).emit('game_started', {
    roomCode, racers, baseDeck: room.baseDeck, players: room.players, turnData,
    isHost: true, raceId: room.raceId, totalRaces: room.totalRaces,
    trackLength, startingTokens: STARTING_TOKENS, betTypes, sideBets: publicSideBets, sponsorships,
  });

  room.players.forEach((p) => {
    io.to(p.id).emit('game_started', {
      roomCode, racers, baseDeck: room.baseDeck, players: room.players, turnData,
      draftOptions: p.id === firstPlayer.id ? room.currentOptions : null,
      isHost: false, raceId: room.raceId, totalRaces: room.totalRaces,
      trackLength, startingTokens: p.tokens, betTypes, sideBets: publicSideBets, sponsorships,
    });
  });

  return true;
}

// ─── Race engine ──────────────────────────────────────────────────────────────
function startRace(roomCode) {
  const room = rooms[roomCode];
  if (!room) return;

  room.state       = 'racing';
  room.racerStates = {};
  for (const racer of room.racers) {
    room.racerStates[racer.id] = { position: 0, boostNext: false, doubleNext: false, skipNext: false };
  }
  room.deckIndex = 0;

  console.log(`[Room ${roomCode}] Race started — ${room.deck.length} cards in deck`);

  room.raceInterval = setInterval(() => {
    if (!rooms[roomCode]) { clearInterval(room.raceInterval); return; }
    flipNextCard(roomCode);
  }, room.cardInterval ?? 1500);
}

function flipNextCard(roomCode) {
  const room = rooms[roomCode];
  if (!room || room.state !== 'racing') return;

  if (room.deckIndex >= room.deck.length) {
    room.deck = shuffle(room.deck);
    room.deckIndex = 0;
    io.to(roomCode).emit('deck_reshuffled');
  }

  const card  = room.deck[room.deckIndex++];
  const racer = room.racers.find((r) => r.id === card.racerId);
  const rs    = room.racerStates[card.racerId];

  if (!racer || !rs) return;

  let description = '';
  let wasStumbled = false;

  if (rs.skipNext) {
    wasStumbled = true;
    rs.skipNext = false;
    description = `${racer.name} stumbles — skips this card`;
  } else if (card.type === 'move') {
    let steps = card.value;
    if (rs.doubleNext) { steps *= 2; rs.doubleNext = false; }
    if (rs.boostNext)  { steps += 1; rs.boostNext  = false; }
    rs.position = Math.min(rs.position + steps, room.trackLength ?? 10);
    const extra = steps - card.value;
    description = extra > 0
      ? `${racer.name} moves +${steps} (${extra > card.value ? 'doubled' : `+${extra} boost`})`
      : `${racer.name} moves +${steps}`;
  } else if (card.type === 'double') {
    rs.doubleNext = true;
    description = `${racer.name} — next move will be doubled`;
  } else if (card.type === 'boost') {
    rs.boostNext = true;
    description = `${racer.name} — next move +1 boost`;
  } else if (card.type === 'stumble') {
    rs.skipNext = true;
    description = `${racer.name} — next card will be skipped`;
  }

  const racerStates = {};
  for (const [id, state] of Object.entries(room.racerStates)) {
    racerStates[id] = { position: state.position, status: state.skipNext ? 'stumbled' : 'active' };
  }

  const lockPos = (room.trackLength ?? 10) * BET_LOCK_PCT;
  for (const [id, state] of Object.entries(room.racerStates)) {
    const numId = Number(id);
    if (state.position >= lockPos && !room.lockedRacers.has(numId)) {
      room.lockedRacers.add(numId);
      console.log(`[Room ${roomCode}] Bets locked for racer ${numId}`);
    }
  }

  const betSummary = buildBetSummary(room);

  io.to(roomCode).emit('race_update', {
    card, description, racerStates,
    cardsRemaining: room.deck.length - room.deckIndex,
    movedRacerId:   card.type === 'move' && !wasStumbled ? card.racerId : null,
    lockedRacers:   [...room.lockedRacers],
    betSummary,
  });

  if (rs.position >= (room.trackLength ?? 10)) endRace(roomCode, racer);
}

function endRace(roomCode, winner = null) {
  const room = rooms[roomCode];
  if (!room) return;

  clearInterval(room.raceInterval);
  room.state = 'finished';

  if (!winner) {
    let best = null;
    for (const racer of room.racers) {
      const pos = room.racerStates[racer.id]?.position ?? 0;
      if (!best || pos > (room.racerStates[best.id]?.position ?? 0)) best = racer;
    }
    winner = best;
  }

  const racerStates = {};
  for (const [id, state] of Object.entries(room.racerStates)) {
    racerStates[id] = { position: state.position, status: id == winner?.id ? 'winner' : 'finished' };
  }

  const ranking = [...room.racers]
    .map((r) => ({ ...r, position: room.racerStates[r.id]?.position ?? 0 }))
    .sort((a, b) => b.position - a.position);
  const rankOf = (racerId) => ranking.findIndex((r) => r.id === racerId) + 1;

  const betSummary = buildBetSummary(room);
  const payouts    = [];
  for (const p of room.players) {
    let delta      = 0;
    const betResults = {};
    for (const [key, bet] of Object.entries(p.bets ?? {})) {
      const under   = key.indexOf('_');
      const racerId = parseInt(key.slice(0, under));
      const betType = key.slice(under + 1);
      const rank    = rankOf(racerId);
      const won     = BET_TYPES[betType]?.qualifies(rank) ?? false;
      if (won) {
        delta += bet.amount * bet.odds;
        betResults[key] = { won: true,  collect: bet.amount * bet.odds, lost: 0 };
      } else {
        delta -= bet.loss ?? 0;
        betResults[key] = { won: false, collect: 0, lost: bet.loss ?? 0 };
      }
    }
    const sideBetResults = {};
    for (const sb of room.sideBets ?? []) {
      const placement = p.sideBets?.[sb.id];
      if (!placement) continue;
      const won = sb.qualifies(rankOf);
      if (won) {
        delta += placement.amount * placement.odds;
        sideBetResults[sb.id] = { won: true, collect: placement.amount * placement.odds, lost: 0 };
      } else {
        delta -= placement.loss ?? 0;
        sideBetResults[sb.id] = { won: false, collect: 0, lost: placement.loss ?? 0 };
      }
    }

    // Sponsorship return (investment already deducted from tokens when placed)
    let sponsorResult = null;
    const sponsorship = room.sponsorships?.[p.id];
    if (sponsorship) {
      const returned = calcSponsorReturn(sponsorship.amount, rankOf(sponsorship.racerId), room.racers.length);
      delta += returned;
      sponsorResult = { racerId: sponsorship.racerId, racerName: sponsorship.racerName, amount: sponsorship.amount, returned, net: returned - sponsorship.amount };
    }

    const finalTokens = Math.max(0, (p.tokens ?? STARTING_TOKENS) + delta);
    payouts.push({ playerId: p.id, playerName: p.name, bets: p.bets, betResults, sideBets: p.sideBets ?? {}, sideBetResults, sponsorResult, delta, finalTokens });
    p.tokens = finalTokens;
  }

  const isLastRace = room.raceId >= room.totalRaces;
  console.log(`[Room ${roomCode}] Race #${room.raceId} finished — winner: ${winner?.name} | last: ${isLastRace}`);
  io.to(roomCode).emit('race_finished', {
    winner, racerStates, payouts, betSummary,
    raceId: room.raceId, totalRaces: room.totalRaces, isLastRace,
  });
}

// ─── Socket.IO ────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok' }));

io.on('connection', (socket) => {
  console.log(`[+] Connected: ${socket.id}`);
  socket.emit('connected', { id: socket.id });

  socket.on('create_room', async ({ playerName }) => {
    let code;
    do { code = generateRoomCode(); } while (rooms[code]);

    rooms[code] = {
      hostId:   socket.id,
      players:  [],
      state:    'lobby',
      settings: defaultSettings(),
    };

    await socket.join(code);
    socket.data.roomCode   = code;
    socket.data.playerName = playerName;
    socket.data.isHost     = true;

    console.log(`[Room ${code}] Created by host ${playerName}`);

    socket.emit('room_update', {
      roomCode:  code,
      players:   [],
      hostId:    socket.id,
      state:     'lobby',
      settings:  rooms[code].settings,
    });
  });

  socket.on('join_room', ({ playerName, roomCode }) => {
    const code = roomCode.toUpperCase().trim();
    const room = rooms[code];

    if (!room)                     { socket.emit('join_error', { message: `Room "${code}" not found.` }); return; }
    if (room.state !== 'lobby')    { socket.emit('join_error', { message: 'Game already in progress.' }); return; }
    if (room.players.length >= 10) { socket.emit('join_error', { message: 'Room is full (max 10 players).' }); return; }

    const nameTaken = room.players.some((p) => p.name.toLowerCase() === playerName.toLowerCase());
    if (nameTaken) { socket.emit('join_error', { message: 'That name is already taken in this room.' }); return; }

    room.players.push({ id: socket.id, name: playerName, tokens: STARTING_TOKENS, bets: {} });
    socket.join(code);
    socket.data.roomCode   = code;
    socket.data.playerName = playerName;
    socket.data.isHost     = false;

    console.log(`[Room ${code}] ${playerName} joined (${room.players.length} players)`);
    broadcastRoomUpdate(code);
  });

  socket.on('start_game', ({ roomCode, settings }) => {
    const room = rooms[roomCode];
    if (!room || socket.id !== room.hostId) return;

    const validLengths   = [10, 15, 20];
    const validIntervals = [800, 1500, 3000];
    const numHorses      = Math.max(3, Math.min(9, settings?.numHorses ?? 9));
    room.settings = {
      totalRaces:    Math.max(1, Math.min(10, settings?.totalRaces ?? 3)),
      trackLength:   validLengths.includes(settings?.trackLength) ? settings.trackLength : 10,
      cardInterval:  validIntervals.includes(settings?.cardInterval) ? settings.cardInterval : 1500,
      horses: RACER_POOL.slice(0, numHorses).map((r, i) => ({
        id:    r.id,
        name:  ((settings?.horseNames?.[i] ?? '').trim()) || r.name,
        color: r.color,
      })),
    };
    room.racers       = room.settings.horses;
    room.totalRaces   = room.settings.totalRaces;
    room.trackLength  = room.settings.trackLength;
    room.cardInterval = room.settings.cardInterval;
    room.raceId      = 0;

    beginGame(roomCode, false);
  });

  socket.on('new_race', ({ roomCode }) => {
    const room = rooms[roomCode];
    if (!room || socket.id !== room.hostId) return;
    if (room.state !== 'finished') return;
    beginGame(roomCode, true);
  });

  socket.on('end_game', ({ roomCode }) => {
    const room = rooms[roomCode];
    if (!room || socket.id !== room.hostId) return;
    room.state  = 'lobby';
    room.raceId = 0;
    room.players.forEach((p) => { p.tokens = STARTING_TOKENS; p.bets = {}; });
    io.to(roomCode).emit('game_over');
    setTimeout(() => broadcastRoomUpdate(roomCode), 150);
    console.log(`[Room ${roomCode}] Game ended by host`);
  });

  socket.on('select_card', ({ roomCode, cardIndex }) => {
    const room = rooms[roomCode];
    if (!room || room.state !== 'drafting') return;

    const currentPlayer = room.players[room.currentTurnIndex];
    if (!currentPlayer || currentPlayer.id !== socket.id) return;

    const selectedCard = room.currentOptions[cardIndex];
    if (!selectedCard) return;

    room.deck.push(selectedCard);
    room.completedPlayers.push(currentPlayer.name);
    room.currentTurnIndex++;

    console.log(`[Room ${roomCode}] ${currentPlayer.name} picked (${room.currentTurnIndex}/${room.players.length})`);

    if (room.currentTurnIndex >= room.players.length) {
      room.deck  = shuffle(room.deck);
      room.state = 'awaiting_race';
      io.to(roomCode).emit('draft_complete', { deckSize: room.deck.length, completedPlayers: room.completedPlayers });
    } else {
      const nextPlayer = room.players[room.currentTurnIndex];
      room.currentOptions = generateCardOptions(room.racers);
      const turnData = {
        currentTurnIndex:  room.currentTurnIndex,
        currentPlayerName: nextPlayer.name,
        completedPlayers:  room.completedPlayers,
      };
      io.to(roomCode).emit('turn_update', turnData);
      io.to(nextPlayer.id).emit('draft_options', { options: room.currentOptions });
    }
  });

  socket.on('place_chip', ({ roomCode, racerId, betType, slotIndex, amount }) => {
    const room = rooms[roomCode];
    if (!room || room.state !== 'racing') return;
    if (room.lockedRacers.has(Number(racerId))) { socket.emit('bet_error', { message: 'Bets are locked for that horse.' }); return; }

    const player = room.players.find((p) => p.id === socket.id);
    if (!player) return;

    const betTypeDef = BET_TYPES[betType];
    if (!betTypeDef || slotIndex < 0 || slotIndex >= betTypeDef.slots.length) return;

    const betKey = `${racerId}_${betType}`;
    if (player.bets[betKey]) { socket.emit('bet_error', { message: 'Already have a bet here — remove it first.' }); return; }

    const slotTaken = room.players.some((p) => p.bets[betKey]?.slotIndex === slotIndex);
    if (slotTaken) { socket.emit('bet_error', { message: 'That slot is already taken.' }); return; }

    // Each chip denomination can only be placed once per race (across main AND side bets)
    const chipUsed = Object.values(player.bets).some((b) => b.amount === amount) ||
                     Object.values(player.sideBets ?? {}).some((b) => b.amount === amount);
    if (chipUsed) { socket.emit('bet_error', { message: `Your ${amount}-chip is already placed.` }); return; }

    const { loss }    = betTypeDef.slots[slotIndex];
    const baseOdds    = betTypeDef.slots[slotIndex].odds;
    const stakes      = computeRacerStakes(room);
    const totalStake  = Object.values(stakes).reduce((s, v) => s + v, 0);
    const odds        = adjustOdds(baseOdds, stakes[racerId] ?? 0, totalStake, room.racers.length);
    player.bets[betKey] = { slotIndex, amount, odds, loss };

    const betSummary = buildBetSummary(room);
    socket.emit('bet_confirmed', { bets: player.bets, tokens: player.tokens, sideBets: player.sideBets ?? {} });
    io.to(roomCode).emit('odds_update', { betSummary, lockedRacers: [...room.lockedRacers] });
    console.log(`[Room ${roomCode}] ${player.name}: ${amount}-chip on ${room.racers.find(r => r.id === racerId)?.name} ${betType} @ ${odds}× (base ${baseOdds}×)`);
  });

  socket.on('place_side_bet', ({ roomCode, sideBetId, amount }) => {
    const room = rooms[roomCode];
    if (!room || room.state !== 'racing') return;
    if (room.lockedRacers.size > 0) { socket.emit('bet_error', { message: 'Side bets are locked.' }); return; }

    const player  = room.players.find((p) => p.id === socket.id);
    if (!player) return;

    const sideBet = room.sideBets?.find((sb) => sb.id === sideBetId);
    if (!sideBet) return;

    const slots = room.sideBetSlots[sideBetId] ?? [];
    if (slots.length >= 3)                                  { socket.emit('bet_error', { message: 'This side bet is full.' }); return; }
    if (slots.some((s) => s.playerId === socket.id))        { socket.emit('bet_error', { message: 'Already on this side bet.' }); return; }

    const chipUsed = Object.values(player.bets ?? {}).some((b) => b.amount === amount) ||
                     Object.values(player.sideBets ?? {}).some((b) => b.amount === amount);
    if (chipUsed) { socket.emit('bet_error', { message: `Your ${amount}-chip is already placed.` }); return; }

    if (!player.sideBets) player.sideBets = {};
    player.sideBets[sideBetId] = { amount, odds: sideBet.odds, loss: sideBet.loss };
    room.sideBetSlots[sideBetId].push({ playerId: player.id, playerName: player.name, amount });

    const sideBetSummary = buildSideBetSummary(room);
    socket.emit('bet_confirmed', { bets: player.bets, tokens: player.tokens, sideBets: player.sideBets });
    io.to(roomCode).emit('side_bets_update', { sideBetSummary });
    console.log(`[Room ${roomCode}] ${player.name}: ${amount}-chip side bet — ${sideBet.description}`);
  });

  socket.on('sponsor_horse', ({ roomCode, racerId, amount }) => {
    const room = rooms[roomCode];
    if (!room || room.state !== 'awaiting_race') return;

    const player = room.players.find((p) => p.id === socket.id);
    if (!player) return;

    if (room.sponsorships[socket.id]) { socket.emit('sponsor_error', { message: 'You have already sponsored a horse this race.' }); return; }

    const validAmount = Math.max(1, Math.floor(Number(amount) || 1));
    if (player.tokens < validAmount) { socket.emit('sponsor_error', { message: `Not enough tokens (you have ${player.tokens}).` }); return; }

    const racer = room.racers.find((r) => r.id === racerId);
    if (!racer) return;

    player.tokens -= validAmount;
    room.sponsorships[socket.id] = { playerName: player.name, racerId, racerName: racer.name, amount: validAmount };

    const sponsorships = buildSponsorList(room);
    socket.emit('sponsor_confirmed', { tokens: player.tokens, sponsorship: room.sponsorships[socket.id] });
    io.to(roomCode).emit('sponsorships_update', { sponsorships });
    console.log(`[Room ${roomCode}] ${player.name} sponsors ${racer.name} for ${validAmount} tokens`);
  });

  socket.on('start_race', ({ roomCode }) => {
    const room = rooms[roomCode];
    if (!room || room.state !== 'awaiting_race') return;
    if (socket.id !== room.hostId) return;

    io.to(roomCode).emit('race_starting', { deckSize: room.deck.length });
    setTimeout(() => startRace(roomCode), 4500);
  });

  socket.on('disconnect', () => {
    const { roomCode, playerName, isHost } = socket.data;
    if (!roomCode || !rooms[roomCode]) return;

    const room = rooms[roomCode];

    if (isHost) {
      clearInterval(room.raceInterval);
      delete rooms[roomCode];
      io.to(roomCode).emit('room_closed', { message: 'The host disconnected.' });
      console.log(`[Room ${roomCode}] Closed (host left)`);
    } else {
      room.players = room.players.filter((p) => p.id !== socket.id);
      console.log(`[-] ${playerName} left room ${roomCode}`);
      broadcastRoomUpdate(roomCode);
    }
  });
});

const PORT = 3001;
httpServer.listen(PORT, () => {
  console.log(`Race Your Bets server listening on http://localhost:${PORT}`);
});
