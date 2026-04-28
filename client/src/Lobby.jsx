import { useState, useEffect, useRef } from 'react';
import socket from './socket';
import logo from './assets/logo.png';

const RACER_COLORS       = ['#ff6b6b', '#f5c518', '#4a9eff', '#4caf50', '#c084fc', '#ff9800', '#00bcd4', '#e91e63'];
const DEFAULT_HORSE_NAMES = [
  'Prancing Pony', 'Thunder Bolt', 'Iron Duke', 'Silver Arrow',
  'Dusty Rose', 'Night Rider', 'Golden Gate', 'Storm Chaser',
];

// ─── Landing screen ───────────────────────────────────────────────────────────
function LandingScreen({ onCreate, onJoin, error, connected }) {
  const [view, setView]         = useState('home'); // 'home' | 'join'
  const [name, setName]         = useState('');
  const [joinCode, setJoinCode] = useState('');

  if (view === 'join') {
    return (
      <div style={ls.card}>
        <img src={logo} alt="Race Your Bets" style={{ maxWidth: 220, width: '70%', marginBottom: '0.75rem' }} />
        <p style={ls.subtitle}>Enter your name and the room code from the host screen.</p>

        <div style={ls.field}>
          <label>Your name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && joinCode && onJoin(name.trim(), joinCode.trim())}
            placeholder="e.g. FastEddie"
            maxLength={20}
            autoFocus
          />
        </div>

        <div style={ls.field}>
          <label>Room code</label>
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && joinCode && onJoin(name.trim(), joinCode.trim())}
            placeholder="e.g. AB3K"
            maxLength={4}
          />
        </div>

        <div style={ls.row}>
          <button onClick={() => onJoin(name.trim(), joinCode.trim())}>Join Game</button>
          <button onClick={() => setView('home')} style={ls.secondaryBtn}>Back</button>
        </div>

        {error && <p style={ls.error}>{error}</p>}
      </div>
    );
  }

  return (
    <div style={ls.card}>
      <img src={logo} alt="Race Your Bets" style={{ maxWidth: 280, width: '80%', marginBottom: '0.75rem' }} />
      <p style={ls.subtitle}>A real-time multiplayer betting race game</p>
      <p style={{ fontSize: '0.75rem', margin: '0 0 2rem', color: connected ? '#4caf50' : '#f44336' }}>
        {connected ? '● Connected' : '● Not connected — is the server running?'}
      </p>

      <div style={ls.bigBtnRow}>
        <button onClick={onCreate} style={ls.bigBtn}>🖥 Host</button>
        <button onClick={() => setView('join')} style={ls.bigBtn}>🎮 Join</button>
      </div>

      {error && <p style={ls.error}>{error}</p>}
    </div>
  );
}

// ─── Stepper control ──────────────────────────────────────────────────────────
function Stepper({ value, min, max, onChange }) {
  return (
    <div style={hw.stepper}>
      <button onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} style={hw.stepBtn}>−</button>
      <span style={hw.stepValue}>{value}</span>
      <button onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} style={hw.stepBtn}>+</button>
    </div>
  );
}

// ─── Host waiting room — big TV-friendly display ───────────────────────────────
function HostWaitingRoom({ roomData, onStartGame, onHostReady }) {
  const { roomCode, players, settings: initSettings } = roomData;
  const canStart = players.length >= 1;

  useEffect(() => { onHostReady?.(); }, []);

  const [totalRaces, setTotalRaces]     = useState(initSettings?.totalRaces ?? 3);
  const [trackLength, setTrackLength]   = useState(initSettings?.trackLength ?? 20);
  const [cardInterval, setCardInterval] = useState(initSettings?.cardInterval ?? 1500);
  const [numHorses, setNumHorses]     = useState(initSettings?.horses?.length ?? 9);
  const [horseNames, setHorseNames]   = useState(() =>
    Array.from({ length: initSettings?.horses?.length ?? 9 }, (_, i) =>
      initSettings?.horses?.[i]?.name ?? DEFAULT_HORSE_NAMES[i] ?? `Horse ${i + 1}`
    )
  );

  function handleNumHorsesChange(next) {
    setNumHorses(next);
    setHorseNames((prev) => {
      if (next > prev.length) {
        return [...prev, ...DEFAULT_HORSE_NAMES.slice(prev.length, next)];
      }
      return prev.slice(0, next);
    });
  }

  function handleStartGame() {
    onStartGame({ totalRaces, numHorses, horseNames, trackLength, cardInterval });
  }

  return (
    <div style={hw.root}>
      <img src={logo} alt="Race Your Bets" style={{ maxWidth: 380, width: '60%' }} />

      <div style={hw.codeSection}>
        <span style={hw.codeLabel}>Room Code</span>
        <span style={hw.code}>{roomCode}</span>
        <span style={hw.codeHint}>Players: enter this code to join</span>
      </div>

      <div style={hw.playerSection}>
        <h2 style={hw.playerHeading}>Players ({players.length})</h2>
        {players.length === 0
          ? <p style={hw.waiting}>Waiting for players to join…</p>
          : (
            <div style={hw.playerGrid}>
              {players.map((p) => (
                <div key={p.id} style={hw.playerChip}>{p.name}</div>
              ))}
            </div>
          )
        }
      </div>

      {/* Settings */}
      <div style={hw.settingsCard}>
        <h3 style={hw.settingsHeading}>⚙ Game Settings</h3>

        <div style={hw.settingsRow}>
          <span style={hw.settingsLabel}>Races</span>
          <Stepper value={totalRaces} min={1} max={10} onChange={setTotalRaces} />
          <span style={hw.settingsHint}>1 – 10</span>
        </div>

        <div style={hw.settingsRow}>
          <span style={hw.settingsLabel}>Horses</span>
          <Stepper value={numHorses} min={3} max={9} onChange={handleNumHorsesChange} />
          <span style={hw.settingsHint}>3 – 9</span>
        </div>

        <div style={hw.settingsRow}>
          <span style={hw.settingsLabel}>Track</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {[{ label: 'Short', value: 10 }, { label: 'Medium', value: 15 }, { label: 'Long', value: 20 }].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTrackLength(opt.value)}
                style={{
                  padding: '5px 14px', borderRadius: 6, fontSize: '0.82rem', cursor: 'pointer',
                  background: trackLength === opt.value ? '#f5c518' : '#1a1a1a',
                  color:      trackLength === opt.value ? '#111'    : '#888',
                  border:     `1px solid ${trackLength === opt.value ? '#f5c518' : '#333'}`,
                  fontWeight: trackLength === opt.value ? 'bold' : 'normal',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <span style={hw.settingsHint}>{trackLength} steps</span>
        </div>

        <div style={hw.settingsRow}>
          <span style={hw.settingsLabel}>Speed</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {[{ label: 'Slow', value: 3000 }, { label: 'Normal', value: 1500 }, { label: 'Fast', value: 800 }].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setCardInterval(opt.value)}
                style={{
                  padding: '5px 14px', borderRadius: 6, fontSize: '0.82rem', cursor: 'pointer',
                  background: cardInterval === opt.value ? '#f5c518' : '#1a1a1a',
                  color:      cardInterval === opt.value ? '#111'    : '#888',
                  border:     `1px solid ${cardInterval === opt.value ? '#f5c518' : '#333'}`,
                  fontWeight: cardInterval === opt.value ? 'bold' : 'normal',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <span style={hw.settingsHint}>{cardInterval / 1000}s per card</span>
        </div>

        <div style={{ marginTop: '1rem' }}>
          <div style={hw.settingsLabel}>Horse Names</div>
          <div style={hw.namesGrid}>
            {horseNames.map((name, i) => (
              <div key={i} style={hw.nameField}>
                <span style={{ color: RACER_COLORS[i], fontSize: '0.7rem', marginBottom: 4, display: 'block', fontWeight: 'bold' }}>
                  ● Horse {i + 1}
                </span>
                <input
                  value={name}
                  onChange={(e) => {
                    const next = [...horseNames];
                    next[i] = e.target.value;
                    setHorseNames(next);
                  }}
                  maxLength={20}
                  style={{ ...hw.nameInput, borderColor: RACER_COLORS[i] + '55' }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={handleStartGame}
        disabled={!canStart}
        style={hw.startBtn}
      >
        {canStart
          ? `Start Game — ${players.length} player${players.length !== 1 ? 's' : ''}, ${totalRaces} race${totalRaces !== 1 ? 's' : ''}`
          : 'Waiting for players…'}
      </button>
    </div>
  );
}

// ─── Player waiting room ──────────────────────────────────────────────────────
function PlayerWaitingRoom({ roomData, mySocketId }) {
  const { roomCode, players } = roomData;

  return (
    <div style={ls.card}>
      <h1>Race Your Bets</h1>

      <div style={ls.codeBox}>
        <span style={ls.codeLabel}>Room Code</span>
        <span style={ls.code}>{roomCode}</span>
      </div>

      <h3 style={{ marginBottom: '0.5rem' }}>Players ({players.length})</h3>
      <ul style={ls.playerList}>
        {players.map((p) => (
          <li key={p.id} style={ls.playerItem}>
            <span>{p.name}</span>
            {p.id === mySocketId && <span style={ls.badge}>(you)</span>}
          </li>
        ))}
      </ul>

      <p style={ls.hint}>Waiting for the host to start the game…</p>
    </div>
  );
}

// ─── Lobby root — owns socket logic for pre-game screens ─────────────────────
export default function Lobby({ mySocketId, onHostReady }) {
  const [roomData, setRoomData]   = useState(null);
  const [joinError, setJoinError] = useState('');
  const [connected, setConnected] = useState(socket.connected);
  const [isHost, setIsHost]       = useState(false);
  const roomCodeRef               = useRef('');

  useEffect(() => {
    const handleRoomUpdate = (data) => {
      roomCodeRef.current = data.roomCode;
      setIsHost(data.hostId === mySocketId);
      setJoinError('');
      setRoomData(data);
    };
    const handleJoinError   = ({ message }) => setJoinError(message);
    const handleConnect     = () => { setConnected(true); };
    const handleDisconnect  = () => { setConnected(false); };
    const handleRoomClosed  = ({ message }) => {
      alert(message);
      setRoomData(null);
      setIsHost(false);
    };

    socket.on('room_update',  handleRoomUpdate);
    socket.on('join_error',   handleJoinError);
    socket.on('connect',      handleConnect);
    socket.on('disconnect',   handleDisconnect);
    socket.on('room_closed',  handleRoomClosed);

    return () => {
      socket.off('room_update',  handleRoomUpdate);
      socket.off('join_error',   handleJoinError);
      socket.off('connect',      handleConnect);
      socket.off('disconnect',   handleDisconnect);
      socket.off('room_closed',  handleRoomClosed);
    };
  }, [mySocketId]);

  function handleCreate() {
    if (!socket.connected) { setJoinError('Not connected to server.'); return; }
    socket.emit('create_room', { playerName: '' });
  }

  function handleJoin(name, code) {
    if (!name)             { setJoinError('Enter your name first.'); return; }
    if (!code)             { setJoinError('Enter a room code.'); return; }
    if (!socket.connected) { setJoinError('Not connected to server.'); return; }
    socket.emit('join_room', { playerName: name, roomCode: code });
  }

  if (!roomData) {
    return (
      <LandingScreen
        onCreate={handleCreate}
        onJoin={handleJoin}
        error={joinError}
        connected={connected}
      />

    );
  }

  if (isHost) {
    return (
      <HostWaitingRoom
        roomData={roomData}
        onStartGame={(settings) =>
          socket.emit('start_game', { roomCode: roomData.roomCode, settings })
        }
        onHostReady={onHostReady}
      />
    );
  }

  return <PlayerWaitingRoom roomData={roomData} mySocketId={mySocketId} />;
}

// ─── Styles — landing / player ────────────────────────────────────────────────
const ls = {
  card:         { maxWidth: 480, margin: '0 auto', padding: '3rem 2rem', background: '#1a1a1a', borderRadius: 8, border: '1px solid #333', textAlign: 'center', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' },
  title:        { margin: '0 0 0.5rem', fontSize: '2rem', color: '#f5c518', letterSpacing: 3 },
  subtitle:     { color: '#888', marginTop: 0, marginBottom: '1rem' },
  optional:     { color: '#555', fontSize: '0.72rem' },
  field:        { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: '1rem', width: '100%', maxWidth: 320, textAlign: 'left' },
  row:          { display: 'flex', gap: '0.75rem', marginTop: '0.5rem', justifyContent: 'center' },
  error:        { color: '#ff6b6b', marginTop: '0.75rem' },
  hint:         { color: '#888', fontSize: '0.85rem', marginTop: '0.5rem' },
  bigBtnRow:    { display: 'flex', gap: '1.25rem', justifyContent: 'center', marginTop: '0.5rem' },
  bigBtn:       { fontSize: '1.1rem', padding: '1rem 2.5rem', borderRadius: 10, minWidth: 130 },
  secondaryBtn: { background: '#1a1a1a', color: '#888', border: '1px solid #333' },
  codeBox:      { display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#0f0f0f', border: '2px solid #f5c518', borderRadius: 8, padding: '1rem', marginBottom: '1.5rem' },
  codeLabel:    { fontSize: '0.75rem', color: '#888', letterSpacing: 2, textTransform: 'uppercase' },
  code:         { fontSize: '3rem', fontWeight: 'bold', color: '#f5c518', letterSpacing: 8 },
  playerList:   { listStyle: 'none', padding: 0, margin: 0 },
  playerItem:   { display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #2a2a2a' },
  badge:        { color: '#f5c518', fontSize: '0.85rem' },
};

// ─── Styles — host waiting room ───────────────────────────────────────────────
const hw = {
  root:            { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', gap: '1.5rem', padding: '2rem', background: '#0a0a0a' },
  title:           { fontSize: '3rem', color: '#f5c518', margin: 0, letterSpacing: 4, textTransform: 'uppercase' },
  codeSection:     { display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#111', border: '3px solid #f5c518', borderRadius: 16, padding: '1.5rem 4rem' },
  codeLabel:       { fontSize: '0.85rem', color: '#888', letterSpacing: 4, textTransform: 'uppercase', marginBottom: '0.5rem' },
  code:            { fontSize: '6rem', fontWeight: 'bold', color: '#f5c518', letterSpacing: 16, lineHeight: 1 },
  codeHint:        { fontSize: '0.9rem', color: '#555', marginTop: '0.75rem' },
  playerSection:   { textAlign: 'center', width: '100%', maxWidth: 600 },
  playerHeading:   { color: '#888', fontSize: '1.1rem', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: 2 },
  waiting:         { color: '#444', fontSize: '1.1rem', fontStyle: 'italic' },
  playerGrid:      { display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
  playerChip:      { background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, padding: '0.5rem 1.5rem', fontSize: '1.1rem', color: '#e0e0e0' },
  settingsCard:    { background: '#111', border: '1px solid #2a2a2a', borderRadius: 12, padding: '1.5rem', width: '100%', maxWidth: 700 },
  settingsHeading: { color: '#888', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: 2, margin: '0 0 1.25rem' },
  settingsRow:     { display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '0.75rem' },
  settingsLabel:   { color: '#ccc', fontSize: '0.9rem', width: 70, flexShrink: 0 },
  settingsHint:    { color: '#444', fontSize: '0.78rem' },
  stepper:         { display: 'flex', alignItems: 'center', gap: 0, border: '1px solid #333', borderRadius: 8, overflow: 'hidden' },
  stepBtn:         { background: '#1a1a1a', color: '#ccc', border: 'none', width: 36, height: 36, fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 },
  stepValue:       { minWidth: 40, textAlign: 'center', color: '#f5c518', fontWeight: 'bold', fontSize: '1rem', padding: '0 8px', background: '#0a0a0a' },
  namesGrid:       { display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: '0.5rem' },
  nameField:       { display: 'flex', flexDirection: 'column', minWidth: 130 },
  nameInput:       { background: '#0f0f0f', color: '#e0e0e0', border: '1px solid #333', borderRadius: 6, padding: '5px 9px', fontSize: '0.85rem', outline: 'none', width: '100%', boxSizing: 'border-box' },
  startBtn:        { fontSize: '1.3rem', padding: '0.9rem 3rem', borderRadius: 10 },
};
