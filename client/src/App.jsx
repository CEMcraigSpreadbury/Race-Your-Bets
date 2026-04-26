import { useState, useEffect, useRef } from 'react';
import socket from './socket';
import Lobby from './Lobby';
import Game from './Game';

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

  useEffect(() => {
    const audio   = new Audio('/bet-slip-boogie.mp3');
    audio.loop    = true;
    audio.volume  = 0.4;
    audioRef.current = audio;

    // Start on first user interaction (browser autoplay policy)
    const startOnInteraction = () => {
      audio.play().then(() => setMusicPlaying(true)).catch(() => {});
      window.removeEventListener('pointerdown', startOnInteraction);
    };
    window.addEventListener('pointerdown', startOnInteraction);

    return () => {
      window.removeEventListener('pointerdown', startOnInteraction);
      audio.pause();
    };
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

  useEffect(() => {
    const onConnected   = ({ id }) => setMySocketId(id);
    const onGameStarted = (data) => {
      setGameStartData({
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
      });
      setGamePhase('game');
    };
    const onGameOver = () => {
      setGamePhase('lobby');
      setGameStartData(null);
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
        <MusicToggle playing={musicPlaying} onToggle={toggleMusic} />
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

  return (
    <>
      <MusicToggle playing={musicPlaying} onToggle={toggleMusic} />
      <Lobby mySocketId={mySocketId} />
    </>
  );
}

export default App;
