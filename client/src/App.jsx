import { useState, useEffect, useRef } from 'react';
import socket from './socket';
import Lobby from './Lobby';
import Game from './Game';
import { initSounds } from './sounds';

function MusicToggle({ playing, onToggle }) {
  return (
    <button
      onClick={onToggle}
      title={playing ? 'Mute music' : 'Unmute music'}
      style={{
        position: 'fixed', bottom: 16, right: 16, zIndex: 2000,
        width: 40, height: 40, borderRadius: '50%',
        background: '#1a1a1a', border: '1px solid #333',
        color: playing ? '#f5c518' : '#444',
        fontSize: '1.1rem', padding: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
        cursor: 'pointer',
      }}
    >
      {playing ? '🎵' : '🔇'}
    </button>
  );
}

function App() {
  const [mySocketId, setMySocketId]       = useState('');
  const [gamePhase, setGamePhase]         = useState('lobby');
  const [gameStartData, setGameStartData] = useState(null);
  const [musicPlaying, setMusicPlaying]   = useState(false);
  const audioRef                          = useRef(null);
  const hasConnectedRef                   = useRef(false);

  useEffect(() => {
    const audio  = new Audio('/sounds/Bet Slip Boogie.mp3');
    audio.loop   = true;
    audio.volume = 0.4;
    audioRef.current = audio;
    return () => audio.pause();
  }, []);

  function toggleMusic() {
    const audio = audioRef.current;
    if (!audio) return;
    if (musicPlaying) {
      audio.pause();
      setMusicPlaying(false);
    } else {
      audio.play().then(() => setMusicPlaying(true)).catch(() => {});
    }
  }

  // Auto-rejoin on socket reconnect (handles mobile backgrounding)
  useEffect(() => {
    const onConnect = () => {
      if (!hasConnectedRef.current) { hasConnectedRef.current = true; return; }
      const raw = sessionStorage.getItem('ryb_session');
      if (!raw) return;
      const { roomCode, playerName } = JSON.parse(raw);
      if (roomCode && playerName) socket.emit('rejoin_room', { roomCode, playerName });
    };
    socket.on('connect', onConnect);
    return () => socket.off('connect', onConnect);
  }, []);

  useEffect(() => {
    const onConnected   = ({ id }) => setMySocketId(id);
    const onGameStarted = (data) => {
      const parsed = {
        roomCode:       data?.roomCode       ?? '',
        racers:         data?.racers         ?? [],
        baseDeck:       data?.baseDeck       ?? [],
        players:        data?.players        ?? [],
        turnData:       data?.turnData       ?? null,
        draftOptions:   data?.draftOptions   ?? null,
        startingTokens: data?.startingTokens ?? 10,
        betTypes:       data?.betTypes       ?? null,
        isHost:         data?.isHost         ?? false,
        raceId:         data?.raceId         ?? 1,
        totalRaces:     data?.totalRaces     ?? 3,
        trackLength:    data?.trackLength    ?? 10,
        sideBets:       data?.sideBets       ?? [],
        sponsorships:   data?.sponsorships   ?? [],
      };
      setGameStartData(parsed);
      setGamePhase('game');
      // Store session for reconnect recovery (players only)
      if (!parsed.isHost) {
        const me = (parsed.players ?? []).find((p) => p.id === socket.id);
        if (me) sessionStorage.setItem('ryb_session', JSON.stringify({ roomCode: parsed.roomCode, playerName: me.name }));
      }
    };
    const onGameOver = () => {
      setGamePhase('lobby');
      setGameStartData(null);
      sessionStorage.removeItem('ryb_session');
    };

    socket.on('connected',    onConnected);
    socket.on('game_started', onGameStarted);
    socket.on('game_over',    onGameOver);

    return () => {
      socket.off('connected',    onConnected);
      socket.off('game_started', onGameStarted);
      socket.off('game_over',    onGameOver);
    };
  }, []);

  if (gamePhase === 'game' && gameStartData) {
    return (
      <>
        {gameStartData.isHost && <MusicToggle playing={musicPlaying} onToggle={toggleMusic} />}
        <Game
          key={`${gameStartData.roomCode}-${gameStartData.raceId}`}
          roomCode={gameStartData.roomCode}
          racers={gameStartData.racers}
          baseDeck={gameStartData.baseDeck}
          players={gameStartData.players}
          initialTurnData={gameStartData.turnData}
          initialDraftOptions={gameStartData.draftOptions}
          startingTokens={gameStartData.startingTokens ?? 10}
          isHost={gameStartData.isHost ?? false}
          mySocketId={mySocketId}
          raceId={gameStartData.raceId ?? 1}
          totalRaces={gameStartData.totalRaces ?? 3}
          trackLength={gameStartData.trackLength ?? 10}
          sideBets={gameStartData.sideBets ?? []}
          initialSponsorships={gameStartData.sponsorships ?? []}
        />
      </>
    );
  }

  const startMusic = () => {
    initSounds();
    audioRef.current?.play().then(() => setMusicPlaying(true)).catch(() => {});
  };

  return (
    <>
      {musicPlaying && <MusicToggle playing={musicPlaying} onToggle={toggleMusic} />}
      <Lobby mySocketId={mySocketId} onHostReady={startMusic} />
    </>
  );
}

export default App;
