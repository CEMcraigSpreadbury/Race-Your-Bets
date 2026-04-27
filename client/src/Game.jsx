import { useState, useEffect, useRef } from 'react';
import socket from './socket';
import { racerById } from './racers';
import { playRaceStart, playRaceFinish, startRandomSounds, stopRandomSounds } from './sounds';

// ─── Card helpers ─────────────────────────────────────────────────────────────
function actionIcon(card) {
  if (card.type === 'move') return card.value === 1 ? '▶' : '▶▶';
  if (card.type === 'double')  return '×2';
  if (card.type === 'boost')   return '↑';
  if (card.type === 'stumble') return '✕';
  return '?';
}

function actionLabel(card) {
  if (card.type === 'move')    return `Move +${card.value}`;
  if (card.type === 'double')  return 'Double';
  if (card.type === 'boost')   return 'Boost';
  if (card.type === 'stumble') return 'Stumble';
  return card.type;
}

// ─── Mini card — deck grid ────────────────────────────────────────────────────
function MiniCard({ card, racers }) {
  const racer = racerById(card.racerId, racers);
  const c = racer.color;
  const shortName = racer.name.split(' ')[0];
  return (
    <div style={{
      width: 58, height: 80, borderRadius: 7,
      border: `1.5px solid ${c}88`, background: `${c}18`, color: c,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'space-between',
      padding: '4px 3px', boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
      flexShrink: 0,
    }}>
      <span style={{ fontSize: '0.52rem', fontWeight: 'bold', alignSelf: 'flex-start', lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden', maxWidth: '100%' }}>
        {shortName}
      </span>
      <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>{actionIcon(card)}</span>
      <span style={{ fontSize: '0.52rem', fontWeight: 'bold', alignSelf: 'flex-end', transform: 'rotate(180deg)', lineHeight: 1, whiteSpace: 'nowrap' }}>
        {shortName}
      </span>
    </div>
  );
}

// ─── Draft card — large, clickable ───────────────────────────────────────────
function DraftCard({ card, racers, onSelect }) {
  const [hovered, setHovered] = useState(false);
  const racer = racerById(card.racerId, racers);
  const c = racer.color;

  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 120, height: 175, borderRadius: 12,
        border: `2px solid ${hovered ? c : c + '77'}`,
        background: hovered ? `${c}28` : '#111',
        color: c,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 8px', cursor: 'pointer',
        boxShadow: hovered ? `0 0 22px ${c}55, 0 6px 18px rgba(0,0,0,0.6)` : '0 3px 10px rgba(0,0,0,0.5)',
        transform: hovered ? 'translateY(-8px) scale(1.05)' : 'none',
        transition: 'all 0.15s ease', userSelect: 'none',
      }}
    >
      <span style={{ fontSize: '0.72rem', fontWeight: 'bold', textAlign: 'center', lineHeight: 1.2 }}>
        {racer.name}
      </span>
      <span style={{ fontSize: '3.2rem', lineHeight: 1 }}>{actionIcon(card)}</span>
      <span style={{ fontSize: '0.7rem', color: `${c}cc`, marginTop: -8 }}>{actionLabel(card)}</span>
      <span style={{ fontSize: '0.72rem', fontWeight: 'bold', transform: 'rotate(180deg)', textAlign: 'center', lineHeight: 1.2 }}>
        {racer.name}
      </span>
    </div>
  );
}

// ─── Per-racer distribution table ────────────────────────────────────────────
function DeckDistribution({ deck, racers }) {
  const counts = {};
  for (const r of racers) counts[r.id] = { move1: 0, move2: 0, boost: 0, stumble: 0, double: 0, total: 0 };
  for (const card of deck) {
    const c = counts[card.racerId];
    if (!c) continue;
    c.total++;
    if (card.type === 'move' && card.value === 1) c.move1++;
    else if (card.type === 'move' && card.value === 2) c.move2++;
    else c[card.type]++;
  }
  const maxTotal = Math.max(...Object.values(counts).map((c) => c.total), 1);

  return (
    <div>
      <p style={s.label}>Base Deck — {deck.length} cards</p>
      {racers.map((racer) => {
        const c = counts[racer.id];
        return (
          <div key={racer.id} style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
              <span style={{ color: racer.color, fontWeight: 'bold', fontSize: '0.82rem', width: 120, flexShrink: 0 }}>
                {racer.name}
              </span>
              <div style={{ flex: 1, background: '#2a2a2a', borderRadius: 4, height: 12, overflow: 'hidden' }}>
                <div style={{ width: `${(c.total / maxTotal) * 100}%`, height: '100%', background: racer.color, borderRadius: 4, transition: 'width 0.3s' }} />
              </div>
              <span style={{ fontSize: '0.8rem', color: '#aaa', width: 20, textAlign: 'right' }}>{c.total}</span>
            </div>
            <div style={{ display: 'flex', gap: 4, paddingLeft: 128 }}>
              {c.move1  > 0 && <Tag color="#4a9eff">{c.move1}×▶</Tag>}
              {c.move2  > 0 && <Tag color="#00cfff">{c.move2}×▶▶</Tag>}
              {c.boost  > 0 && <Tag color="#4caf50">{c.boost}×↑</Tag>}
              {c.stumble > 0 && <Tag color="#f44336">{c.stumble}×✕</Tag>}
              {c.double > 0 && <Tag color="#f5c518">{c.double}×2</Tag>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Tag({ color, children }) {
  return (
    <span style={{ fontSize: '0.68rem', color, border: `1px solid ${color}55`, borderRadius: 3, padding: '1px 5px' }}>
      {children}
    </span>
  );
}

// ─── Deck grid ────────────────────────────────────────────────────────────────
function DeckGrid({ deck, racers }) {
  return (
    <div>
      <p style={s.label}>Deck Order (top → bottom)</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, overflowY: 'auto', background: '#0f0f0f', borderRadius: 8, padding: 8 }}>
        {deck.map((card, i) => <MiniCard key={i} card={card} racers={racers} />)}
      </div>
    </div>
  );
}

// ─── Draft panel ──────────────────────────────────────────────────────────────
function DraftPanel({ turnData, myOptions, players, racers, mySocketId, onSelectCard, draftDone }) {
  if (draftDone) {
    return (
      <div style={s.banner}>
        <span style={{ fontSize: '1.5rem' }}>✅</span>
        <div>
          <strong>Deck finalised!</strong>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#aaa' }}>All players have secretly added a card. Race starting…</p>
        </div>
      </div>
    );
  }
  if (!turnData) return null;

  const currentPlayer = players[turnData.currentTurnIndex];
  const isMyTurn = currentPlayer?.id === mySocketId;

  return (
    <div>
      <div style={{ ...s.banner, borderColor: isMyTurn ? '#f5c518' : '#333' }}>
        <span style={{ fontSize: '1.5rem' }}>🎴</span>
        <div>
          <strong style={{ color: isMyTurn ? '#f5c518' : '#e0e0e0' }}>
            {isMyTurn ? 'Your turn — pick a card!' : `${turnData.currentPlayerName} is choosing…`}
          </strong>
          <p style={{ margin: 0, fontSize: '0.82rem', color: '#888' }}>
            {isMyTurn ? "Your choice is secret. Others won't see which card you picked." : 'They are secretly adding a racer card to the deck.'}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '0.75rem 0' }}>
        {players.map((p) => {
          const done = turnData.completedPlayers?.includes(p.name);
          const isCurrent = p.id === currentPlayer?.id;
          return (
            <span key={p.id} style={{
              padding: '3px 11px', borderRadius: 20, fontSize: '0.78rem',
              background: done ? '#1b3a1b' : isCurrent ? '#2a2200' : '#1e1e1e',
              border: `1px solid ${done ? '#4caf50' : isCurrent ? '#f5c518' : '#333'}`,
              color: done ? '#4caf50' : isCurrent ? '#f5c518' : '#666',
            }}>
              {done ? '✓ ' : isCurrent ? '◆ ' : ''}{p.name}
            </span>
          );
        })}
      </div>

      {isMyTurn && myOptions && (
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#f5c518', margin: '0 0 1rem', fontWeight: 'bold' }}>Choose one card to secretly add:</p>
          <div style={{ display: 'flex', gap: '1.25rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            {myOptions.map((card, i) => (
              <DraftCard key={i} card={card} racers={racers} onSelect={() => onSelectCard(i)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Drawn card — flips in on each new card ───────────────────────────────────
function DrawnCard({ draw, racers, compact, large }) {
  if (!draw) return null;
  const racer = racerById(draw.card.racerId, racers);
  const c     = racer.color;
  const w     = compact ? 58  : large ? 180 : 84;
  const h     = compact ? 84  : large ? 260 : 122;
  const icon  = compact ? '1.8rem' : large ? '6rem' : '2.8rem';
  const name  = compact ? '0.52rem' : large ? '1.1rem' : '0.65rem';

  return (
    <div style={{
      width: w, height: h, borderRadius: compact ? 7 : large ? 18 : 10, flexShrink: 0,
      border: `${large ? 3 : 2}px solid ${c}`,
      background: `${c}1a`,
      color: c,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'space-between',
      padding: compact ? '4px 3px' : large ? '15px 12px' : '7px 5px',
      boxShadow: large ? `0 0 40px ${c}66, 0 8px 24px rgba(0,0,0,0.6)` : `0 0 18px ${c}55, 0 4px 12px rgba(0,0,0,0.5)`,
      animation: 'cardFlipIn 0.38s ease',
      userSelect: 'none',
    }}>
      <span style={{ fontSize: name, fontWeight: 'bold', lineHeight: 1.2, textAlign: 'center' }}>
        {large ? racer.name : racer.name.split(' ')[0]}
      </span>
      <span style={{ fontSize: icon, lineHeight: 1 }}>{actionIcon(draw.card)}</span>
      <span style={{ fontSize: name, color: `${c}bb`, lineHeight: 1, textAlign: 'center', marginTop: large ? -10 : 0 }}>{actionLabel(draw.card)}</span>
      <span style={{ fontSize: name, fontWeight: 'bold', transform: 'rotate(180deg)', lineHeight: 1.2, textAlign: 'center' }}>
        {large ? racer.name : racer.name.split(' ')[0]}
      </span>
    </div>
  );
}

// ─── Race track ───────────────────────────────────────────────────────────────
const RANK_MEDALS = ['🥇', '🥈', '🥉'];

function RaceTrack({ racers, raceState, pulsingRacer, trackLength, lockedRacers }) {
  if (!raceState) return null;

  const lockPos    = trackLength * 0.75;
  const closingPos = trackLength * 0.58;

  // Compute live rankings (ties share the same rank)
  const sorted = [...racers].sort((a, b) =>
    (raceState[b.id]?.position ?? 0) - (raceState[a.id]?.position ?? 0)
  );
  const rankOf = {};
  for (let i = 0; i < sorted.length; i++) {
    const prevPos = i > 0 ? (raceState[sorted[i - 1].id]?.position ?? 0) : null;
    const thisPos = raceState[sorted[i].id]?.position ?? 0;
    rankOf[sorted[i].id] = (i > 0 && prevPos === thisPos) ? rankOf[sorted[i - 1].id] : i + 1;
  }

  return (
    <div>
      {racers.map((racer) => {
        const rs         = raceState[racer.id] ?? { position: 0, status: 'active' };
        const pct        = Math.min((rs.position / trackLength) * 100, 100);
        const isWinner   = rs.position >= trackLength;
        const isStumbled = rs.status === 'stumbled';
        const isPulsing  = pulsingRacer === racer.id;
        const isLocked   = lockedRacers?.has(racer.id) ?? false;
        const isClosing  = !isLocked && rs.position >= closingPos;
        const rank       = rankOf[racer.id];

        return (
          <div key={racer.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>

            {/* Horse name + position */}
            <div style={{ width: 120, flexShrink: 0 }}>
              <div style={{ color: racer.color, fontWeight: 'bold', fontSize: '0.82rem', lineHeight: 1.2 }}>
                {isWinner ? '🏆 ' : isStumbled ? '💤 ' : ''}{racer.name}
              </div>
              <div style={{ fontSize: '0.62rem', color: '#555' }}>{rs.position}/{trackLength}</div>
            </div>

            {/* Track bar — outer wrapper is position:relative so emoji + finish line escape overflow */}
            <div style={{ flex: 1, position: 'relative', height: 30 }}>

              {/* Inner bar (overflow hidden for fill + milestones) */}
              <div style={{
                background: '#111', border: `1px solid ${racer.color}33`, borderRadius: 6,
                height: '100%', position: 'relative', overflow: 'hidden',
                boxShadow: isClosing ? `0 0 0 1px #f5c51866, inset 0 0 10px rgba(245,197,24,0.15)` : 'none',
                transition: 'box-shadow 0.4s',
              }}>
                {[25, 50, 75].map((m) => (
                  <div key={m} style={{ position: 'absolute', left: `${m}%`, top: 0, bottom: 0, width: 1, background: '#2a2a2a', zIndex: 1 }} />
                ))}
                <div style={{
                  width: `${pct}%`, height: '100%',
                  background: isWinner ? racer.color : `${racer.color}bb`,
                  boxShadow: isPulsing ? `0 0 18px 6px ${racer.color}` : 'none',
                  transition: isPulsing ? 'width 0.45s ease, box-shadow 0.05s ease' : 'width 0.45s ease, box-shadow 0.35s ease',
                  borderRadius: '5px 0 0 5px',
                }} />
              </div>

              {/* Horse emoji — always visible, pinned to left edge when at 0 */}
              <span style={{
                position: 'absolute',
                left: `max(10px, calc(${pct}% - 13px))`,
                top: '50%',
                transform: `translateY(-50%) scale(${isPulsing ? 1.35 : 1})`,
                transition: isPulsing ? 'left 0.45s ease, transform 0.05s ease' : 'left 0.45s ease, transform 0.35s ease',
                fontSize: '1.2rem', lineHeight: 1, zIndex: 4, pointerEvents: 'none',
                filter: isStumbled ? 'grayscale(1)' : 'none',
              }}>🐎</span>

              {/* Finish line — white vertical stripe extending ±4px beyond bar */}
              <div style={{
                position: 'absolute', right: 0, top: -4, bottom: -4, width: 3, zIndex: 5,
                background: isWinner ? racer.color : 'rgba(255,255,255,0.75)',
                borderRadius: 2,
                boxShadow: isWinner ? `0 0 10px ${racer.color}` : '0 0 4px rgba(255,255,255,0.5)',
              }} />
            </div>

            {/* Rank badge */}
            <div style={{ width: 36, flexShrink: 0, textAlign: 'center', fontSize: rank <= 3 ? '1rem' : '0.72rem', color: rank <= 3 ? undefined : '#555', fontWeight: 'bold' }}>
              {rank <= 3 ? RANK_MEDALS[rank - 1] : `${rank}th`}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Race log ─────────────────────────────────────────────────────────────────
function RaceLog({ log, racers }) {
  if (!log.length) return null;
  return (
    <div>
      <p style={s.label}>Card flip history</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 180, overflowY: 'auto' }}>
        {[...log].reverse().map((entry, i) => {
          const racer = racerById(entry.card.racerId, racers);
          return (
            <div key={i} style={{ fontSize: '0.78rem', color: '#777', display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ color: racer.color, fontWeight: 'bold', width: 110, flexShrink: 0 }}>{racer.name}</span>
              <span style={{ color: racer.color }}>{actionIcon(entry.card)}</span>
              <span>{entry.description}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}


// ─── Shuffle + countdown overlay ─────────────────────────────────────────────
function RaceCountdown({ prep }) {
  if (!prep) return null;

  const overlayStyle = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 900, flexDirection: 'column', gap: '0.5rem',
  };

  if (prep.phase === 'shuffling') {
    return (
      <div style={overlayStyle}>
        <div style={{ fontSize: '4rem', animation: 'cardSpin 0.9s ease infinite' }}>🃏</div>
        <div style={{ color: '#f5c518', fontSize: '1.4rem', fontWeight: 'bold', marginTop: '0.5rem' }}>
          Shuffling {prep.deckSize} cards…
        </div>
      </div>
    );
  }
  if (prep.phase === 'countdown') {
    return (
      <div style={overlayStyle}>
        <div key={prep.number} style={{ fontSize: '9rem', fontWeight: 'bold', color: '#f5c518', lineHeight: 1, animation: 'countdownPop 0.6s ease forwards' }}>
          {prep.number}
        </div>
      </div>
    );
  }
  if (prep.phase === 'go') {
    return (
      <div style={overlayStyle}>
        <div style={{ fontSize: '7rem', fontWeight: 'bold', color: '#4caf50', lineHeight: 1, animation: 'countdownPop 0.5s ease forwards' }}>
          And they're off!
        </div>
      </div>
    );
  }
  return null;
}

// ─── Bet type constants (must mirror server BET_TYPES) ───────────────────────
// slots: { odds, loss } — win earns chip×odds, lose costs chip×loss (loss=0 = safe)
const BET_TYPES = {
  win:   { label: 'WIN',   slots: [{ odds: 7, loss: 2 }, { odds: 5, loss: 2 }, { odds: 3, loss: 1 }], desc: '1st',   color: '#f5c518' },
  place: { label: 'PLACE', slots: [{ odds: 4, loss: 1 }, { odds: 2, loss: 1 }],                        desc: 'Top 2', color: '#4a9eff' },
  show:  { label: 'SHOW',  slots: [{ odds: 2, loss: 1 }, { odds: 2, loss: 0 }],                        desc: 'Top 3', color: '#4caf50' },
};
const BET_TYPE_ORDER = ['show', 'place', 'win'];

// ─── Chip tray — fixed at bottom ──────────────────────────────────────────────
// Each chip resets every race. Greyed out once placed (each value usable once).
const CHIPS = [
  { value: 1, bg: '#e0e0e0', fg: '#111' },
  { value: 2, bg: '#4a9eff', fg: '#fff' },
  { value: 3, bg: '#f44336', fg: '#fff' },
  { value: 4, bg: '#4caf50', fg: '#fff' },
  { value: 5, bg: '#f5c518', fg: '#111' },
];

function ChipTray({ held, usedChips, tokens, onSelect, onClear }) {
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 800,
      background: 'rgba(10,18,10,0.97)', borderTop: '2px solid #1a4a1a',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: 14, padding: '10px 0 max(10px, env(safe-area-inset-bottom))',
    }}>
      <span style={{ fontSize: '0.72rem', color: '#3a6a3a', textTransform: 'uppercase', letterSpacing: 1, marginRight: 4 }}>
        💰 {tokens}
      </span>
      {CHIPS.map((chip) => {
        const isHeld  = held === chip.value;
        const isUsed  = usedChips.has(chip.value) && !isHeld;
        return (
          <div
            key={chip.value}
            onClick={() => isUsed ? null : isHeld ? onClear() : onSelect(chip.value)}
            style={{
              width: 52, height: 52, borderRadius: '50%',
              background: chip.bg,
              border: isHeld ? '3px solid #fff' : '3px solid rgba(255,255,255,0.15)',
              boxShadow: isHeld
                ? `0 0 0 4px ${chip.bg}66, 0 0 28px ${chip.bg}88, 0 -10px 0 rgba(0,0,0,0.35)`
                : '0 4px 14px rgba(0,0,0,0.55)',
              transform: isHeld ? 'translateY(-12px) scale(1.18)' : 'none',
              transition: 'all 0.15s ease',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 'bold', fontSize: '1.1rem', color: chip.fg,
              cursor: isUsed ? 'not-allowed' : 'pointer',
              userSelect: 'none', opacity: isUsed ? 0.25 : 1,
            }}
          >
            {chip.value}
          </div>
        );
      })}
      {held != null && (
        <span onClick={onClear} style={{ fontSize: '0.75rem', color: '#666', cursor: 'pointer', marginLeft: 4, textDecoration: 'underline' }}>
          cancel
        </span>
      )}
    </div>
  );
}

// ─── Single bet cell ──────────────────────────────────────────────────────────
// Width is controlled by the flex group in BettingGrid — don't set a fixed width here.
function BetCell({ racer, betType, displayOdds, baseOdds, loss, occupant, isMe, held, usedChips, isLocked, onPlace }) {
  const typeDef  = BET_TYPES[betType];
  const chipUsed = held != null && usedChips.has(held);
  const canPlace = !isLocked && !occupant && held != null && !chipUsed;

  function handleClick() {
    if (isLocked || isMe) return;
    if (canPlace) onPlace(held);
  }

  const borderColor = isMe     ? racer.color
                    : canPlace ? typeDef.color
                    : occupant ? '#333'
                               : '#1a3a1a';
  const bgColor     = isMe     ? racer.color + '28'
                    : canPlace ? typeDef.color + '18'
                    : occupant ? '#181818'
                               : '#0c1a0c';

  const placedAmount = occupant?.amount;

  // Colour odds label to signal movement from base
  const oddsUp   = !occupant && displayOdds > baseOdds;
  const oddsDown = !occupant && displayOdds < baseOdds;
  const oddsColor = isMe ? racer.color
                  : occupant ? '#666'
                  : oddsUp   ? '#4caf50'
                  : oddsDown ? '#f5c518'
                  : typeDef.color;

  return (
    <div
      onClick={handleClick}
      title={
        isMe     ? `Your bet — ${occupant?.amount}-chip` :
        occupant ? `${occupant.playerName} — ${occupant.amount}-chip` :
        canPlace ? `${held}-chip: collect ${held * displayOdds}${loss > 0 ? `, lose ${loss} if not` : ''}` :
        held == null ? 'Pick a chip first' : chipUsed ? 'Chip already placed' : ''
      }
      style={{
        flex: 1, minWidth: 0, height: 66, borderRadius: 8,
        border: `2px solid ${borderColor}`, background: bgColor,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        cursor: canPlace ? 'pointer' : 'default',
        transition: 'border-color 0.12s, background 0.12s', position: 'relative',
        boxShadow: canPlace ? `0 0 10px ${typeDef.color}55` : 'none',
        gap: 2,
      }}
    >
      {/* Odds: shows multiplier when empty, actual collect when chip placed */}
      <span style={{ fontSize: '0.78rem', fontWeight: 'bold', lineHeight: 1, color: oddsColor, pointerEvents: 'none' }}>
        {placedAmount != null ? placedAmount * displayOdds : `${displayOdds}×`}
      </span>

      {/* Loss: fixed amount per cell, never changes with chip size */}
      {loss > 0 && (
        <span style={{ fontSize: '0.72rem', fontWeight: 'bold', lineHeight: 1, color: isMe ? racer.color + 'aa' : '#c0392b', pointerEvents: 'none' }}>
          -{loss}
        </span>
      )}

      {/* Placed chip circle */}
      {occupant && (
        <div style={{
          width: 22, height: 22, borderRadius: '50%', marginTop: 1,
          background: isMe ? racer.color : '#2a2a2a',
          border: `2px solid ${isMe ? racer.color + 'cc' : '#444'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.65rem', fontWeight: 'bold',
          color: isMe ? (racer.color === '#f5c518' ? '#111' : '#fff') : '#888',
          pointerEvents: 'none',
        }}>
          {occupant.amount}
        </div>
      )}

    </div>
  );
}

// ─── Betting grid ─────────────────────────────────────────────────────────────
// Cells auto-size via flex so the grid fills whatever width it's given.
// Column groups use flex: slotCount so each individual cell is the same width.
const NAME_COL = 70; // px — horse name column
const GRP_GAP  = 6;  // px — gap between SHOW / PLACE / WIN groups
const CELL_GAP = 3;  // px — gap between cells within a group

function BettingGrid({ racers, myBets, betSummary, lockedRacers, closingRacers, held, usedChips, onPlace }) {
  const slots     = betSummary?.slots ?? {};
  const anyLocked = lockedRacers.size > 0;
  const allLocked = lockedRacers.size >= racers.length;

  return (
    <div style={{ background: '#071a07', border: '2px solid #1a4a1a', borderRadius: 12, padding: '0.5rem 0.6rem' }}>

      {/* Status bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <span style={{ color: '#4a8a4a', fontWeight: 'bold', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: 2 }}>
          Betting Mat
        </span>
        {allLocked
          ? <span style={{ fontSize: '0.75rem', color: '#f44336', fontWeight: 'bold' }}>🔒 All bets closed</span>
          : anyLocked
            ? <span style={{ fontSize: '0.75rem', color: '#f5c518', fontWeight: 'bold' }}>⚠️ Some horses locked</span>
            : held != null
              ? <span style={{ fontSize: '0.75rem', color: '#f5c518' }}>Tap cell — <strong>{held}</strong>-chip</span>
              : <span style={{ fontSize: '0.75rem', color: '#4a8a4a' }}>Pick a chip below</span>
        }
      </div>

      {/* Column group headers — same flex structure as rows */}
      <div style={{ display: 'flex', alignItems: 'flex-end', marginBottom: 4 }}>
        <div style={{ width: NAME_COL, flexShrink: 0 }} />
        {BET_TYPE_ORDER.map((type, gi) => {
          const def = BET_TYPES[type];
          return (
            <div
              key={type}
              style={{ flex: def.slots.length, textAlign: 'center', marginRight: gi < BET_TYPE_ORDER.length - 1 ? GRP_GAP : 0 }}
            >
              <div style={{ fontSize: '0.65rem', fontWeight: 'bold', color: def.color, textTransform: 'uppercase', letterSpacing: 1 }}>
                {def.label}
              </div>
              <div style={{ fontSize: '0.58rem', color: def.color + '88' }}>{def.desc}</div>
            </div>
          );
        })}
      </div>

      {/* Racer rows */}
      {racers.map((racer) => {
        const isLocked  = lockedRacers.has(racer.id);
        const isClosing = !isLocked && (closingRacers?.has(racer.id) ?? false);
        return (
        <div key={racer.id} style={{
          display: 'flex', alignItems: 'center', marginBottom: 4,
          opacity: isLocked ? 0.55 : 1, transition: 'opacity 0.3s',
          borderRadius: 6,
          outline: isClosing ? '1px solid #f5c51866' : 'none',
          boxShadow: isClosing ? '0 0 8px rgba(245,197,24,0.2)' : 'none',
        }}>

          {/* Horse name */}
          <div style={{ width: NAME_COL, flexShrink: 0, paddingRight: 5, overflow: 'hidden' }}>
            <div style={{ color: racer.color, fontWeight: 'bold', fontSize: '0.8rem', lineHeight: 1.15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {isLocked ? '🔒' : isClosing ? '⚡' : '🐎'} {racer.name.split(' ')[0]}
            </div>
            {racer.name.split(' ').length > 1 && (
              <div style={{ color: racer.color + '77', fontSize: '0.6rem', lineHeight: 1 }}>
                {racer.name.split(' ').slice(1).join(' ')}
              </div>
            )}
          </div>

          {/* Bet type groups */}
          {BET_TYPE_ORDER.map((betType, gi) => {
            const def        = BET_TYPES[betType];
            const racerSlots = slots[racer.id]?.[betType] ?? def.slots.map(() => null);
            return (
              <div
                key={betType}
                style={{ flex: def.slots.length, display: 'flex', gap: CELL_GAP, marginRight: gi < BET_TYPE_ORDER.length - 1 ? GRP_GAP : 0 }}
              >
                {def.slots.map((slot, slotIndex) => {
                  const occupant    = racerSlots[slotIndex];
                  const myBetKey    = `${racer.id}_${betType}`;
                  const myBet       = myBets[myBetKey];
                  const isMine      = myBet?.slotIndex === slotIndex;
                  const baseOdds    = slot.odds;
                  const displayOdds = isMine
                    ? (myBet.odds ?? baseOdds)
                    : (betSummary?.adjustedOdds?.[racer.id]?.[betType]?.[slotIndex] ?? baseOdds);
                  return (
                    <BetCell
                      key={slotIndex}
                      racer={racer}
                      betType={betType}
                      displayOdds={displayOdds}
                      baseOdds={baseOdds}
                      loss={slot.loss}
                      occupant={occupant}
                      isMe={isMine}
                      held={held}
                      usedChips={usedChips}
                      isLocked={isLocked}
                      onPlace={(amount) => onPlace(racer.id, betType, slotIndex, amount)}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
        );
      })}
    </div>
  );
}

// ─── Result cell — read-only, highlights won/lost bets ───────────────────────
function ResultCell({ betType, odds, loss, myBet, result }) {
  const typeDef = BET_TYPES[betType];

  if (!myBet) {
    return (
      <div style={{
        flex: 1, minWidth: 0, height: 66, borderRadius: 8,
        border: '2px solid #111', background: '#080e08',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 2,
      }}>
        <span style={{ fontSize: '0.78rem', fontWeight: 'bold', lineHeight: 1, color: typeDef.color + '30' }}>
          {odds}×
        </span>
        {loss > 0 && (
          <span style={{ fontSize: '0.72rem', fontWeight: 'bold', lineHeight: 1, color: '#c0392b30' }}>
            -{loss}
          </span>
        )}
      </div>
    );
  }

  const won     = result?.won ?? false;
  const collect = result?.collect ?? 0;
  const lostAmt = result?.lost ?? 0;
  const glow    = won ? '#4caf50' : '#f44336';

  return (
    <div style={{
      flex: 1, minWidth: 0, height: 66, borderRadius: 8,
      border: `2px solid ${glow}`,
      background: glow + '22',
      boxShadow: `0 0 14px ${glow}55`,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 2,
    }}>
      <div style={{
        width: 22, height: 22, borderRadius: '50%',
        background: glow,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.65rem', fontWeight: 'bold', color: '#fff',
      }}>
        {myBet.amount}
      </div>
      {won ? (
        <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#4caf50' }}>+{collect}</span>
      ) : lostAmt > 0 ? (
        <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#f44336' }}>-{lostAmt}</span>
      ) : (
        <span style={{ fontSize: '0.68rem', color: '#888' }}>safe</span>
      )}
    </div>
  );
}

// ─── Result grid — read-only betting board shown after race ───────────────────
function ResultGrid({ racers, myBets, betResults }) {
  return (
    <div style={{ background: '#071a07', border: '2px solid #1a4a1a', borderRadius: 12, padding: '0.5rem 0.6rem' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', marginBottom: 4 }}>
        <div style={{ width: NAME_COL, flexShrink: 0 }} />
        {BET_TYPE_ORDER.map((type, gi) => {
          const def = BET_TYPES[type];
          return (
            <div key={type} style={{ flex: def.slots.length, textAlign: 'center', marginRight: gi < BET_TYPE_ORDER.length - 1 ? GRP_GAP : 0 }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 'bold', color: def.color, textTransform: 'uppercase', letterSpacing: 1 }}>{def.label}</div>
              <div style={{ fontSize: '0.58rem', color: def.color + '88' }}>{def.desc}</div>
            </div>
          );
        })}
      </div>

      {racers.map((racer) => (
        <div key={racer.id} style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
          <div style={{ width: NAME_COL, flexShrink: 0, paddingRight: 5, overflow: 'hidden' }}>
            <div style={{ color: racer.color, fontWeight: 'bold', fontSize: '0.8rem', lineHeight: 1.15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              🐎 {racer.name.split(' ')[0]}
            </div>
            {racer.name.split(' ').length > 1 && (
              <div style={{ color: racer.color + '77', fontSize: '0.6rem', lineHeight: 1 }}>
                {racer.name.split(' ').slice(1).join(' ')}
              </div>
            )}
          </div>

          {BET_TYPE_ORDER.map((betType, gi) => {
            const def = BET_TYPES[betType];
            return (
              <div key={betType} style={{ flex: def.slots.length, display: 'flex', gap: CELL_GAP, marginRight: gi < BET_TYPE_ORDER.length - 1 ? GRP_GAP : 0 }}>
                {def.slots.map((slot, slotIndex) => {
                  const key   = `${racer.id}_${betType}`;
                  const myBet = myBets?.[key];
                  const isMine = myBet?.slotIndex === slotIndex;
                  return (
                    <ResultCell
                      key={slotIndex}
                      betType={betType}
                      odds={slot.odds}
                      loss={slot.loss}
                      myBet={isMine ? myBet : null}
                      result={isMine ? betResults?.[key] : null}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ─── Horse carousel ───────────────────────────────────────────────────────────
const CARD_W = 220;
const CARD_H = 308; // playing card ratio ~5:7
const CARD_GAP = 210; // distance between card centres

function HorseCarousel({ racers, selected, onSelect }) {
  const [idx, setIdx] = useState(() => Math.max(0, racers.findIndex((r) => r.id === selected)));
  const startX  = useRef(null);
  const [delta, setDelta] = useState(0);
  const dragging = startX.current !== null;

  const goTo = (i) => {
    const clamped = Math.max(0, Math.min(racers.length - 1, i));
    setIdx(clamped);
    onSelect(racers[clamped].id);
  };

  const onDown = (e) => {
    startX.current = e.touches ? e.touches[0].clientX : e.clientX;
    setDelta(0);
  };
  const onMove = (e) => {
    if (startX.current === null) return;
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    setDelta(x - startX.current);
  };
  const onUp = () => {
    if (Math.abs(delta) > 50) goTo(idx + (delta < 0 ? 1 : -1));
    startX.current = null;
    setDelta(0);
  };

  return (
    <div
      style={{ position: 'relative', height: CARD_H + 24, overflow: 'hidden', touchAction: 'pan-y', cursor: dragging ? 'grabbing' : 'grab', userSelect: 'none' }}
      onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
      onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp}
    >
      {racers.map((r, i) => {
        const offset = i - idx;
        const tx = offset * CARD_GAP + (dragging ? delta * 0.55 : 0);
        const scale = offset === 0 ? 1 : 0.82;
        const opacity = Math.abs(offset) > 1 ? 0 : offset === 0 ? 1 : 0.55;
        return (
          <div
            key={r.id}
            onClick={() => { if (Math.abs(delta) < 8) goTo(i); }}
            style={{
              position: 'absolute', left: '50%', top: 12,
              width: CARD_W, height: CARD_H,
              transform: `translateX(calc(-50% + ${tx}px)) scale(${scale})`,
              transformOrigin: 'center top',
              opacity,
              transition: dragging ? 'none' : 'transform 0.28s ease, opacity 0.28s ease',
              zIndex: 10 - Math.abs(offset),
              borderRadius: 16,
              border: `2px solid ${offset === 0 ? r.color : r.color + '44'}`,
              background: offset === 0 ? `${r.color}1a` : '#0a0f1a',
              boxShadow: offset === 0 ? `0 0 28px ${r.color}44, 0 8px 24px rgba(0,0,0,0.6)` : '0 4px 12px rgba(0,0,0,0.4)',
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
              pointerEvents: offset === 0 ? 'none' : 'auto',
            }}
          >
            {/* Name — centred at top */}
            <div style={{
              padding: '14px 12px 10px',
              textAlign: 'center',
              color: r.color, fontWeight: 'bold', fontSize: '1.1rem', lineHeight: 1.2,
              borderBottom: `1px solid ${r.color}22`,
            }}>
              {r.name}
            </div>
            {/* Emoji — centre section */}
            <div style={{
              flex: '0 0 42%', background: `${r.color}1a`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: '5rem', lineHeight: 1 }}>🐎</span>
            </div>
            {/* Flavour text */}
            <div style={{
              flex: 1, padding: '12px 14px',
              borderTop: `1px solid ${r.color}22`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ color: '#aaa', fontSize: '0.72rem', lineHeight: 1.55, textAlign: 'center', fontStyle: 'italic' }}>
                {racerById(r.id).flavour ?? ''}
              </div>
            </div>
          </div>
        );
      })}

      {/* Dot indicators */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 5 }}>
        {racers.map((_, i) => (
          <div key={i} onClick={() => goTo(i)} style={{
            width: i === idx ? 14 : 6, height: 6, borderRadius: 3,
            background: i === idx ? racers[idx].color : '#333',
            transition: 'all 0.25s', cursor: 'pointer',
          }} />
        ))}
      </div>
    </div>
  );
}

// ─── Sponsor panel ────────────────────────────────────────────────────────────
function SponsorPanel({ racers, tokens, mySponsorship, allSponsorships, onSponsor }) {
  const [selected, setSelected] = useState(null);
  const [amount, setAmount]     = useState(1);
  const K = racers.length;

  const sponsorReturn = (inv, rank) => Math.floor(inv * 2 * (K - rank) / K);

  // Read-only view once sponsored
  if (mySponsorship) {
    const racer = racers.find((r) => r.id === mySponsorship.racerId);
    return (
      <div style={{ background: '#070f1a', border: `2px solid ${racer?.color ?? '#333'}`, borderRadius: 12, padding: '0.75rem 0.9rem', marginTop: '0.75rem' }}>
        <div style={{ fontSize: '0.65rem', color: '#3a6a9a', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 6 }}>Your Sponsorship</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '1.4rem' }}>🐎</span>
          <span style={{ color: racer?.color, fontWeight: 'bold', fontSize: '0.95rem' }}>{mySponsorship.racerName}</span>
          <span style={{ color: '#f5c518', fontWeight: 'bold' }}>{mySponsorship.amount} 💰</span>
          <span style={{ color: '#555', fontSize: '0.78rem', marginLeft: 'auto' }}>Waiting for race…</span>
        </div>
        <SponsorBoard racers={racers} allSponsorships={allSponsorships} mySponsorship={mySponsorship} compact />
      </div>
    );
  }

  return (
    <div style={{ background: '#070f1a', border: '2px solid #1a3a5a', borderRadius: 12, padding: '0.75rem 0.9rem', marginTop: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: '0.65rem', color: '#3a6a9a', textTransform: 'uppercase', letterSpacing: 2 }}>
          Sponsor a Horse
        </span>
        <span style={{ fontSize: '0.75rem', color: '#f5c518' }}>💰 {tokens}</span>
      </div>

      <p style={{ fontSize: '0.8rem', color: '#666', margin: '0 0 10px' }}>
        Invest tokens on a horse. Better finish = bigger return. Last place = lose your stake.
      </p>

      {/* Horse picker — carousel */}
      <HorseCarousel racers={racers} selected={selected} onSelect={setSelected} />

      {selected != null && (
        <>
          {/* Amount input */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                onClick={() => setAmount((a) => Math.max(1, a - 1))}
                disabled={amount <= 1}
                style={{ width: 44, height: 44, borderRadius: '50%', fontSize: '1.4rem', padding: 0, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >−</button>
              <div style={{ textAlign: 'center', minWidth: 64 }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f5c518', lineHeight: 1 }}>{amount}</div>
                <div style={{ fontSize: '0.65rem', color: '#555', marginTop: 2 }}>tokens</div>
              </div>
              <button
                onClick={() => setAmount((a) => Math.min(tokens, a + 1))}
                disabled={amount >= tokens}
                style={{ width: 44, height: 44, borderRadius: '50%', fontSize: '1.4rem', padding: 0, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >+</button>
            </div>
            <button
              onClick={() => setAmount(tokens)}
              style={{ padding: '4px 16px', fontSize: '0.72rem', background: '#1a3a1a', color: '#4caf50', border: '1px solid #2a5a2a' }}
            >
              All in
            </button>
          </div>

          {/* Return preview */}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 12 }}>
            {racers.map((_, i) => {
              const rank = i + 1;
              const ret  = sponsorReturn(amount, rank);
              const net  = ret - amount;
              const pos  = net >= 0;
              return (
                <div key={rank} style={{
                  padding: '3px 8px', borderRadius: 6, fontSize: '0.68rem',
                  background: pos ? '#0a200a' : '#200a0a',
                  border: `1px solid ${pos ? '#2a5a2a' : '#5a2a2a'}`,
                  color: pos ? '#4caf50' : '#f44336',
                }}>
                  {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}th`}&nbsp;
                  {net >= 0 ? `+${net}` : net}
                </div>
              );
            })}
          </div>

          <button
            disabled={tokens < 1 || amount < 1}
            onClick={() => onSponsor(selected, amount)}
            style={{ width: '100%', fontSize: '0.9rem', padding: '0.55rem' }}
          >
            Sponsor {racers.find((r) => r.id === selected)?.name} for {amount} 💰
          </button>
        </>
      )}

      <SponsorBoard racers={racers} allSponsorships={allSponsorships} mySponsorship={null} compact />
    </div>
  );
}

// ─── Public sponsor board (compact) ──────────────────────────────────────────
function SponsorBoard({ racers, allSponsorships, mySponsorship, compact }) {
  if (!allSponsorships?.length) return null;

  // Group by horse
  const byHorse = {};
  for (const sp of allSponsorships) {
    if (!byHorse[sp.racerId]) byHorse[sp.racerId] = [];
    byHorse[sp.racerId].push(sp);
  }

  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ fontSize: '0.62rem', color: '#3a5a3a', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 5 }}>
        Sponsorships
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {Object.entries(byHorse).map(([rid, sps]) => {
          const racer = racers.find((r) => r.id === Number(rid));
          if (!racer) return null;
          return (
            <div key={rid} style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ color: racer.color, fontSize: '0.75rem', fontWeight: 'bold', minWidth: 80 }}>
                🐎 {racer.name.split(' ')[0]}
              </span>
              {sps.map((sp) => {
                const isMe = mySponsorship?.racerId === sp.racerId && sp.playerName === (mySponsorship?.playerName ?? '');
                return (
                  <span key={sp.playerId} style={{
                    fontSize: '0.68rem', padding: '2px 7px', borderRadius: 10,
                    background: isMe ? racer.color + '33' : '#1a1a1a',
                    border: `1px solid ${isMe ? racer.color + '88' : '#333'}`,
                    color: isMe ? racer.color : '#888',
                  }}>
                    {sp.playerName} · {sp.amount}💰
                  </span>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Side bet panel ───────────────────────────────────────────────────────────
function SideBetPanel({ sideBets, sideBetOccupants, mySideBets, held, usedChips, betsLocked, mySocketId, onPlace }) {
  if (!sideBets?.length) return null;

  return (
    <div style={{ background: '#07100f', border: '2px solid #1a3a2a', borderRadius: 12, padding: '0.5rem 0.6rem', marginTop: '0.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <span style={{ color: '#3a7a5a', fontWeight: 'bold', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: 2 }}>
          Side Bets
        </span>
        {betsLocked
          ? <span style={{ fontSize: '0.75rem', color: '#f44336', fontWeight: 'bold' }}>🔒 Locked</span>
          : held != null
            ? <span style={{ fontSize: '0.75rem', color: '#f5c518' }}>Tap a side bet — <strong>{held}</strong>-chip</span>
            : <span style={{ fontSize: '0.75rem', color: '#3a7a5a' }}>Pick a chip, then tap a side bet</span>
        }
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {sideBets.map((sb) => {
          const occupants = sideBetOccupants[sb.id] ?? [];
          const myBet     = mySideBets[sb.id];
          const isMine    = !!myBet;
          const isFull    = occupants.length >= 3 && !isMine;
          const chipUsed  = held != null && usedChips.has(held);
          const canPlace  = !betsLocked && !isMine && !isFull && held != null && !chipUsed;

          const borderColor = isMine   ? '#4caf50'
                            : canPlace ? '#f5c518'
                            : isFull   ? '#2a2a2a'
                                       : '#1a3a2a';
          const bgColor     = isMine   ? '#0a200a'
                            : canPlace ? '#1a1200'
                            : isFull   ? '#0a0a0a'
                                       : '#0a1510';

          return (
            <div
              key={sb.id}
              onClick={() => canPlace && onPlace(sb.id, held)}
              style={{
                border: `2px solid ${borderColor}`, background: bgColor,
                borderRadius: 9, padding: '0.5rem 0.65rem',
                cursor: canPlace ? 'pointer' : 'default',
                boxShadow: canPlace ? `0 0 10px #f5c51833` : isMine ? `0 0 10px #4caf5033` : 'none',
                opacity: isFull ? 0.45 : 1,
                transition: 'border-color 0.12s, background 0.12s',
                display: 'flex', alignItems: 'center', gap: '0.6rem',
              }}
            >
              {/* Description + odds */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.78rem', color: isMine ? '#4caf50' : isFull ? '#444' : '#ccc', fontWeight: isMine ? 'bold' : 'normal', lineHeight: 1.3 }}>
                  {sb.description}
                </div>
                <div style={{ fontSize: '0.65rem', color: '#555', marginTop: 2 }}>
                  <span style={{ color: '#4caf50' }}>{sb.odds}×</span>
                  {sb.loss > 0 && <span style={{ color: '#c0392b' }}> / -{sb.loss}</span>}
                  {isFull && <span style={{ color: '#444', marginLeft: 6 }}>FULL</span>}
                </div>
              </div>

              {/* Chip slots — up to 3 */}
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                {[0, 1, 2].map((i) => {
                  const occ   = occupants[i];
                  const isMe  = occ?.playerId === mySocketId;
                  const filled = !!occ;
                  return (
                    <div key={i} style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: filled ? (isMe ? '#4caf50' : '#2a2a2a') : 'transparent',
                      border: `2px solid ${filled ? (isMe ? '#4caf50' : '#444') : '#1a3a2a'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.65rem', fontWeight: 'bold',
                      color: filled ? (isMe ? '#fff' : '#888') : 'transparent',
                    }}>
                      {filled ? occ.amount : ''}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Side bet results (shown in PlayerResult) ─────────────────────────────────
function SideBetResults({ sideBets, mySideBets, sideBetResults }) {
  const entries = Object.entries(mySideBets ?? {});
  if (!entries.length) return null;

  return (
    <div style={{ width: '100%', maxWidth: 600 }}>
      <div style={{ color: '#555', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 6 }}>Side Bets</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {entries.map(([id, bet]) => {
          const result  = sideBetResults?.[id];
          const sb      = sideBets?.find((s) => s.id === id);
          const won     = result?.won ?? false;
          const glow    = won ? '#4caf50' : '#f44336';
          return (
            <div key={id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              border: `2px solid ${glow}`, background: glow + '18',
              borderRadius: 9, padding: '0.45rem 0.75rem',
              boxShadow: `0 0 10px ${glow}44`,
            }}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                background: glow, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.65rem', fontWeight: 'bold', color: '#fff',
              }}>
                {bet.amount}
              </div>
              <div style={{ flex: 1, fontSize: '0.8rem', color: won ? '#4caf50' : '#ccc' }}>
                {sb?.description ?? id}
              </div>
              <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: glow }}>
                {won ? `+${result.collect}` : result?.lost > 0 ? `-${result.lost}` : '±0'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Host podium ──────────────────────────────────────────────────────────────
function Podium({ payouts, racers, winner, raceId, totalRaces, isLastRace, onNewRace, onEndSession }) {
  if (!payouts?.length) return null;
  const sorted   = [...payouts].sort((a, b) => b.finalTokens - a.finalTokens);
  const medals   = ['🥇', '🥈', '🥉'];
  const winRacer = winner ? racers.find((r) => r.id === winner.id) : null;

  return (
    <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
      {winRacer && (
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '3rem' }}>🏆</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: winRacer.color, marginTop: '0.5rem' }}>
            {winRacer.name} wins!
          </div>
          <div style={{ fontSize: '0.9rem', color: '#555', marginTop: '0.5rem', textTransform: 'uppercase', letterSpacing: 2 }}>
            Race {raceId} of {totalRaces}
          </div>
        </div>
      )}

      <h2 style={{ color: '#888', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: 2, marginBottom: '1.5rem' }}>
        {isLastRace ? 'Final Standings' : 'Standings'}
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 480, margin: '0 auto' }}>
        {sorted.map((p, i) => (
          <div key={p.playerId} style={{
            display: 'flex', alignItems: 'center', gap: 16,
            padding: '0.75rem 1.25rem', borderRadius: 10,
            background: i === 0 ? '#1a1600' : '#111',
            border: `1px solid ${i === 0 ? '#f5c51888' : '#222'}`,
            fontSize: '1.1rem',
          }}>
            <span style={{ fontSize: '1.5rem', width: 32 }}>{medals[i] ?? `${i + 1}.`}</span>
            <span style={{ flex: 1, fontWeight: 'bold', color: i === 0 ? '#f5c518' : '#ccc' }}>{p.playerName}</span>
            <span style={{ color: p.delta > 0 ? '#4caf50' : p.delta < 0 ? '#f44336' : '#666', fontWeight: 'bold' }}>
              {p.delta > 0 ? `+${p.delta}` : p.delta < 0 ? String(p.delta) : '±0'}
            </span>
            <span style={{ color: '#f5c518', fontWeight: 'bold' }}>{p.finalTokens} 💰</span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '2.5rem', display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        {isLastRace ? (
          <>
            <button onClick={onEndSession} style={{ fontSize: '1.1rem', padding: '0.75rem 2.5rem' }}>
              End Session
            </button>
            <button onClick={onNewRace} style={{ fontSize: '0.95rem', padding: '0.6rem 1.5rem', background: '#1a1a1a', color: '#666', border: '1px solid #333' }}>
              Play Another Race
            </button>
          </>
        ) : (
          <button onClick={onNewRace} style={{ fontSize: '1.1rem', padding: '0.75rem 2.5rem' }}>
            Next Race →
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Sponsor result row ───────────────────────────────────────────────────────
function SponsorResult({ sponsorResult, racers }) {
  if (!sponsorResult) return null;
  const racer = racers.find((r) => r.id === sponsorResult.racerId);
  const won   = sponsorResult.net > 0;
  const glow  = won ? '#4caf50' : '#f44336';
  return (
    <div style={{ width: '100%', maxWidth: 600 }}>
      <div style={{ color: '#555', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 6 }}>Sponsorship</div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        border: `2px solid ${glow}`, background: glow + '18',
        borderRadius: 9, padding: '0.45rem 0.75rem',
        boxShadow: `0 0 10px ${glow}44`,
      }}>
        <span style={{ fontSize: '1.2rem' }}>🐎</span>
        <span style={{ color: racer?.color ?? '#ccc', fontWeight: 'bold', flex: 1 }}>{sponsorResult.racerName}</span>
        <span style={{ fontSize: '0.78rem', color: '#888' }}>Staked {sponsorResult.amount}💰 → {sponsorResult.returned}💰</span>
        <span style={{ fontWeight: 'bold', fontSize: '0.9rem', color: glow }}>
          {sponsorResult.net >= 0 ? `+${sponsorResult.net}` : sponsorResult.net}
        </span>
      </div>
    </div>
  );
}

// ─── Confetti ─────────────────────────────────────────────────────────────────
const CONFETTI_COLORS = ['#f5c518','#4caf50','#4a9eff','#ff6b6b','#c084fc','#ff9800','#00bcd4','#e91e63','#ffffff'];

function Confetti() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);
    const ctx = canvas.getContext('2d');
    const particles = Array.from({ length: 140 }, () => ({
      x:     Math.random() * canvas.width,
      y:     -20 - Math.random() * canvas.height,
      w:     7 + Math.random() * 9,
      h:     4 + Math.random() * 5,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      vx:    (Math.random() - 0.5) * 2.5,
      vy:    2.5 + Math.random() * 3.5,
      angle: Math.random() * Math.PI * 2,
      spin:  (Math.random() - 0.5) * 0.18,
    }));
    let animId;
    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy; p.angle += p.spin;
        if (p.y > canvas.height + 20) { p.y = -20; p.x = Math.random() * canvas.width; }
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      animId = requestAnimationFrame(tick);
    };
    tick();
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, zIndex: 1001, pointerEvents: 'none' }} />;
}

// ─── Player result overlay ────────────────────────────────────────────────────
function PlayerResult({ myPayout, racers, sideBets, raceId, totalRaces, onDismiss }) {
  if (!myPayout) return null;
  const won          = myPayout.delta > 0;
  const lost         = myPayout.delta < 0;
  const hasBets      = Object.keys(myPayout.bets ?? {}).length > 0;
  const hasSideBets  = Object.keys(myPayout.sideBets ?? {}).length > 0;

  return (
    <>
      {won && <Confetti />}
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: won ? 'rgba(0,40,0,0.97)' : lost ? 'rgba(50,0,0,0.97)' : 'rgba(10,10,10,0.97)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      overflowY: 'auto', padding: '2rem 0.75rem 1.5rem',
      gap: '0.75rem',
    }}>
      <div style={{ fontSize: '0.8rem', color: '#555', textTransform: 'uppercase', letterSpacing: 2 }}>
        Race {raceId} of {totalRaces}
      </div>
      <div style={{ fontSize: '4rem' }}>{won ? '🎉' : lost ? '😬' : '🤷'}</div>
      <div style={{ fontSize: '4rem', fontWeight: 'bold', lineHeight: 1, color: won ? '#4caf50' : lost ? '#f44336' : '#888' }}>
        {won ? `+${myPayout.delta}` : lost ? String(myPayout.delta) : '±0'}
      </div>
      <div style={{ fontSize: '1.1rem', color: '#aaa' }}>
        New total: <strong style={{ color: '#f5c518' }}>{myPayout.finalTokens} 💰</strong>
      </div>

      {hasBets && (
        <div style={{ width: '100%', maxWidth: 600, marginTop: '0.5rem' }}>
          <ResultGrid
            racers={racers}
            myBets={myPayout.bets}
            betResults={myPayout.betResults}
          />
        </div>
      )}

      {hasSideBets && (
        <SideBetResults
          sideBets={sideBets}
          mySideBets={myPayout.sideBets}
          sideBetResults={myPayout.sideBetResults}
        />
      )}

      <SponsorResult sponsorResult={myPayout.sponsorResult} racers={racers} />

      <button onClick={onDismiss} style={{ marginTop: '0.75rem', background: '#222', color: '#aaa', border: '1px solid #444' }}>
        See Standings
      </button>
    </div>
    </>
  );
}

// ─── Player standings — shown after dismissing result ─────────────────────────
function PlayerStandings({ payouts, mySocketId, isLastRace }) {
  if (!payouts?.length) return null;
  const sorted = [...payouts].sort((a, b) => b.finalTokens - a.finalTokens);
  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div style={{ padding: '0.5rem 0' }}>
      <h3 style={{ color: '#888', textTransform: 'uppercase', letterSpacing: 2, fontSize: '0.8rem', textAlign: 'center', margin: '0 0 0.75rem' }}>
        {isLastRace ? 'Final Standings' : 'Standings'}
      </h3>
      {!isLastRace && (
        <p style={{ color: '#555', textAlign: 'center', fontSize: '0.82rem', margin: '0 0 1rem' }}>
          Waiting for the host to start the next race…
        </p>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {sorted.map((p, i) => {
          const isMe = p.playerId === mySocketId;
          return (
            <div key={p.playerId} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '0.55rem 0.9rem', borderRadius: 8,
              background: isMe ? '#1a1600' : '#111',
              border: `1px solid ${isMe ? '#f5c51888' : '#222'}`,
            }}>
              <span style={{ fontSize: '1.1rem', width: 26 }}>{medals[i] ?? `${i + 1}.`}</span>
              <span style={{ flex: 1, fontWeight: isMe ? 'bold' : 'normal', color: isMe ? '#f5c518' : '#ccc', fontSize: '0.88rem' }}>
                {p.playerName}{isMe ? ' (you)' : ''}
              </span>
              <span style={{ color: p.delta > 0 ? '#4caf50' : p.delta < 0 ? '#f44336' : '#666', fontSize: '0.82rem' }}>
                {p.delta > 0 ? `+${p.delta}` : p.delta < 0 ? String(p.delta) : '±0'}
              </span>
              <span style={{ color: '#f5c518', fontWeight: 'bold', fontSize: '0.88rem' }}>{p.finalTokens} 💰</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Game component ──────────────────────────────────────────────────────
export default function Game({
  roomCode, racers, mySocketId, baseDeck,
  players: initialPlayers, initialTurnData, initialDraftOptions,
  startingTokens, isHost, raceId, totalRaces, trackLength, sideBets,
  initialSponsorships,
}) {
  const [turnData, setTurnData]               = useState(initialTurnData ?? null);
  const [myOptions, setMyOptions]             = useState(initialDraftOptions ?? null);
  const [draftDone, setDraftDone]             = useState(false);
  const [gamePhase, setGamePhase]             = useState('drafting');
  const [raceState, setRaceState]             = useState(null);
  const [raceLog, setRaceLog]                 = useState([]);
  const [winner, setWinner]                   = useState(null);
  const [pulsingRacer, setPulsingRacer]       = useState(null);
  const [racePrep, setRacePrep]               = useState(null);
  const [tokens, setTokens]                   = useState(startingTokens ?? 10);
  const [myBets, setMyBets]                   = useState({});
  const [mySideBets, setMySideBets]           = useState({});
  const [sideBetOccupants, setSideBetOccupants] = useState({});
  const [lockedRacers, setLockedRacers]       = useState(new Set());
  const [lastDraw, setLastDraw]               = useState(null);
  const [cardFlipKey, setCardFlipKey]         = useState(0);
  const [betSummary, setBetSummary]           = useState(null);
  const [payouts, setPayouts]                 = useState(null);
  const [heldChip, setHeldChip]               = useState(null);
  const [showResult, setShowResult]           = useState(false);
  const [mySponsorship, setMySponsorship]     = useState(null);
  const [allSponsorships, setAllSponsorships] = useState(initialSponsorships ?? []);

  const isLastRace    = raceId >= totalRaces;
  const [deckExpanded, setDeckExpanded] = useState(false);


  useEffect(() => {
    const onTurnUpdate    = (data) => { setTurnData(data); setMyOptions(null); };
    const onDraftOptions  = ({ options }) => setMyOptions(options);
    const onDraftComplete = ({ completedPlayers }) => {
      setTurnData((prev) => prev ? { ...prev, completedPlayers } : prev);
      setDraftDone(true);
      setMyOptions(null);
    };

    const onRaceStarting = ({ deckSize }) => {
      setGamePhase('racing');
      const initial = {};
      racers.forEach((r) => { initial[r.id] = { position: 0, status: 'active' }; });
      setRaceState(initial);
      setRacePrep({ phase: 'shuffling', deckSize });
      setTimeout(() => setRacePrep({ phase: 'countdown', number: 3 }), 1100);
      setTimeout(() => setRacePrep({ phase: 'countdown', number: 2 }), 2100);
      setTimeout(() => setRacePrep({ phase: 'countdown', number: 1 }), 3100);
      if (isHost) setTimeout(() => { playRaceStart(); startRandomSounds(); }, 3400);
      setTimeout(() => setRacePrep({ phase: 'go' }),                    4000);
      setTimeout(() => setRacePrep(null),                                4500);
    };

    const onRaceUpdate = ({ racerStates, card, description, movedRacerId, lockedRacers: lr, betSummary: summary }) => {
      setRaceState(racerStates);
      setRaceLog((prev) => [...prev, { card, description }].slice(-60));
      setLastDraw({ card, description });
      setCardFlipKey((k) => k + 1);
      setGamePhase('racing');
      if (lr)      setLockedRacers(new Set(lr));
      if (summary) setBetSummary(summary);

      if (movedRacerId != null) {
        setPulsingRacer(movedRacerId);
        setTimeout(() => setPulsingRacer(null), 350);
      }
    };

    const onOddsUpdate      = ({ betSummary: summary, lockedRacers: lr }) => {
      if (summary) setBetSummary(summary);
      if (lr)      setLockedRacers(new Set(lr));
    };
    const onBetConfirmed    = ({ bets, tokens: t, sideBets: sb }) => {
      setMyBets(bets ?? {});
      setTokens(t);
      if (sb) setMySideBets(sb);
    };
    const onSideBetsUpdate  = ({ sideBetSummary }) => {
      if (sideBetSummary?.occupants) setSideBetOccupants(sideBetSummary.occupants);
    };

    const onSponsorConfirmed   = ({ tokens: t, sponsorship }) => {
      setTokens(t);
      setMySponsorship(sponsorship);
    };
    const onSponsorshipsUpdate = ({ sponsorships }) => setAllSponsorships(sponsorships ?? []);
    const onSponsorError       = ({ message }) => alert(message);

    const onRaceFinished = ({ winner: w, racerStates, payouts: p, betSummary: summary }) => {
      setRaceState(racerStates);
      setWinner(w);
      setGamePhase('finished');
      if (isHost) { stopRandomSounds(); playRaceFinish(); }
      if (p)       { setPayouts(p); if (!isHost) setShowResult(true); }
      if (summary) setBetSummary(summary);
    };

    socket.on('turn_update',        onTurnUpdate);
    socket.on('draft_options',      onDraftOptions);
    socket.on('draft_complete',     onDraftComplete);
    socket.on('race_starting',      onRaceStarting);
    socket.on('race_update',        onRaceUpdate);
    socket.on('odds_update',        onOddsUpdate);
    socket.on('bet_confirmed',      onBetConfirmed);
    socket.on('side_bets_update',   onSideBetsUpdate);
    socket.on('sponsor_confirmed',  onSponsorConfirmed);
    socket.on('sponsorships_update', onSponsorshipsUpdate);
    socket.on('sponsor_error',      onSponsorError);
    socket.on('race_finished',      onRaceFinished);

    return () => {
      socket.off('turn_update',        onTurnUpdate);
      socket.off('draft_options',      onDraftOptions);
      socket.off('draft_complete',     onDraftComplete);
      socket.off('race_starting',      onRaceStarting);
      socket.off('race_update',        onRaceUpdate);
      socket.off('odds_update',        onOddsUpdate);
      socket.off('bet_confirmed',      onBetConfirmed);
      socket.off('side_bets_update',   onSideBetsUpdate);
      socket.off('sponsor_confirmed',  onSponsorConfirmed);
      socket.off('sponsorships_update', onSponsorshipsUpdate);
      socket.off('sponsor_error',      onSponsorError);
      socket.off('race_finished',      onRaceFinished);
      if (isHost) stopRandomSounds();
    };
  }, [isHost]);

  function handleSelectCard(cardIndex) {
    socket.emit('select_card', { roomCode, cardIndex });
    setMyOptions(null);
  }

  function handlePlaceChip(racerId, betType, slotIndex, amount) {
    socket.emit('place_chip', { roomCode, racerId, betType, slotIndex, amount });
    setHeldChip(null);
  }

  function handlePlaceSideBet(sideBetId, amount) {
    socket.emit('place_side_bet', { roomCode, sideBetId, amount });
    setHeldChip(null);
  }

  function handleSponsorHorse(racerId, amount) {
    socket.emit('sponsor_horse', { roomCode, racerId, amount });
  }

  // Chips are free each race — track which denominations have already been placed (main + side bets)
  const usedChips = new Set([
    ...Object.values(myBets).map((b) => b.amount),
    ...Object.values(mySideBets).map((b) => b.amount),
  ]);

  const anyLocked = lockedRacers.size > 0;
  const allLocked = lockedRacers.size >= racers.length;

  const closingRacers = new Set(
    raceState
      ? Object.entries(raceState)
          .filter(([id, rs]) => {
            const numId   = Number(id);
            const lockPos = (trackLength ?? 10) * 0.75;
            const warnPos = (trackLength ?? 10) * 0.58;
            return !lockedRacers.has(numId) && rs.position >= warnPos && rs.position < lockPos;
          })
          .map(([id]) => Number(id))
      : []
  );

  const myPayout = payouts?.find((p) => p.playerId === mySocketId) ?? null;

  // ── Host / TV display ───────────────────────────────────────────────────────
  if (isHost) {
    return (
      <>
        <RaceCountdown prep={racePrep} />

        <div style={{ minHeight: '100vh', background: '#0a0a0a', padding: '0.3rem 0.5rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ maxWidth: 1400, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', flex: 1 }}>

            <div style={s.header}>
              <h1 style={{ margin: 0, fontSize: '1.6rem', color: '#f5c518', letterSpacing: 2 }}>Race Your Bets</h1>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ color: '#555', fontSize: '0.8rem' }}>Race {raceId}/{totalRaces}</span>
                <span style={s.roomBadge}>{roomCode}</span>
              </div>
            </div>

            {/* Draft status */}
            {gamePhase === 'drafting' && (
              <div style={{ ...s.section, textAlign: 'center', padding: '2rem' }}>
                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🎴</div>
                <h2 style={{ color: '#f5c518', margin: '0 0 0.5rem' }}>Draft in Progress</h2>
                {draftDone ? (
                  <>
                    <p style={{ color: '#4caf50', marginBottom: '1rem' }}>All players have chosen their card!</p>
                    <SponsorBoard racers={racers} allSponsorships={allSponsorships} mySponsorship={null} />
                    <button onClick={() => socket.emit('start_race', { roomCode })} style={{ fontSize: '1.1rem', padding: '0.75rem 2rem', marginTop: '1rem' }}>
                      Start Race
                    </button>
                  </>
                ) : (
                  <>
                    <p style={{ color: '#aaa', fontSize: '1.1rem' }}>{turnData?.currentPlayerName} is choosing…</p>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginTop: '1rem' }}>
                      {initialPlayers.map((p) => {
                        const done = turnData?.completedPlayers?.includes(p.name);
                        const cur  = p.name === turnData?.currentPlayerName;
                        return (
                          <span key={p.id} style={{
                            padding: '4px 14px', borderRadius: 20, fontSize: '0.85rem',
                            background: done ? '#1b3a1b' : cur ? '#2a2200' : '#1a1a1a',
                            border: `1px solid ${done ? '#4caf50' : cur ? '#f5c518' : '#333'}`,
                            color: done ? '#4caf50' : cur ? '#f5c518' : '#666',
                          }}>
                            {done ? '✓ ' : cur ? '◆ ' : ''}{p.name}
                          </span>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Race track */}
            {(gamePhase === 'racing' || gamePhase === 'finished') && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '1rem', padding: '0.5rem 0' }}>
                {gamePhase === 'finished' && winner && (
                  <div style={{ ...s.banner, borderColor: racerById(winner.id, racers).color }}>
                    <span style={{ fontSize: '1.5rem' }}>🏆</span>
                    <strong style={{ color: racerById(winner.id, racers).color, fontSize: '1.1rem' }}>{winner.name} wins!</strong>
                  </div>
                )}
                {gamePhase === 'racing' && (
                  <div style={{ display: 'flex', justifyContent: 'center', height: 260 }}>
                    {lastDraw && <DrawnCard key={cardFlipKey} draw={lastDraw} racers={racers} large />}
                  </div>
                )}
                <RaceTrack racers={racers} raceState={raceState} pulsingRacer={pulsingRacer} trackLength={trackLength ?? 10} lockedRacers={lockedRacers} />
              </div>
            )}

            {/* Podium */}
            {gamePhase === 'finished' && payouts && (
              <div style={s.section}>
                <Podium
                  payouts={payouts}
                  racers={racers}
                  winner={winner}
                  raceId={raceId}
                  totalRaces={totalRaces}
                  isLastRace={isLastRace}
                  onNewRace={() => socket.emit('new_race', { roomCode })}
                  onEndSession={() => socket.emit('end_game', { roomCode })}
                />
              </div>
            )}


            {/* Deck info — always shown during drafting; collapsible during racing */}
            {gamePhase === 'drafting' && (
              <>
                <div style={s.section}><DeckDistribution deck={baseDeck} racers={racers} /></div>
                <div style={s.section}><DeckGrid deck={baseDeck} racers={racers} /></div>
              </>
            )}
            {gamePhase === 'racing' && (
              <div style={s.section}>
                <button
                  onClick={() => setDeckExpanded((v) => !v)}
                  style={{ background: 'none', border: '1px solid #2a2a2a', color: '#555', borderRadius: 6, padding: '6px 16px', cursor: 'pointer', fontSize: '0.8rem', width: '100%' }}
                >
                  {deckExpanded ? '▲ Hide Deck Info' : '▼ Show Deck Info'}
                </button>
                {deckExpanded && (
                  <div style={{ marginTop: '1rem' }}>
                    <DeckDistribution deck={baseDeck} racers={racers} />
                    <div style={{ marginTop: '1rem' }}><DeckGrid deck={baseDeck} racers={racers} /></div>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </>
    );
  }

  // ── Player / phone view ─────────────────────────────────────────────────────
  return (
    <>
      {showResult && myPayout && (
        <PlayerResult
          myPayout={myPayout}
          racers={racers}
          sideBets={sideBets}
          raceId={raceId}
          totalRaces={totalRaces}
          onDismiss={() => setShowResult(false)}
        />
      )}

      {gamePhase === 'racing' && !allLocked && !showResult && (
        <ChipTray
          held={heldChip}
          usedChips={usedChips}
          tokens={tokens}
          onSelect={(v) => setHeldChip(v)}
          onClear={() => setHeldChip(null)}
        />
      )}

      {/* Compact header — always visible */}
      <div style={{ padding: '0.6rem 0.75rem 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: '#f5c518', fontWeight: 'bold', fontSize: '1rem' }}>Race Your Bets</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ color: '#555', fontSize: '0.78rem' }}>{raceId}/{totalRaces}</span>
          <span style={{ color: '#f5c518', fontSize: '0.85rem' }}>💰 {tokens}</span>
          <span style={s.roomBadge}>{roomCode}</span>
        </div>
      </div>

      {/* Draft phase */}
      {gamePhase === 'drafting' && (
        <div style={{ padding: '0.75rem', maxWidth: 520, margin: '0 auto' }}>
          <DraftPanel
            turnData={turnData}
            myOptions={myOptions}
            players={initialPlayers}
            racers={racers}
            mySocketId={mySocketId}
            onSelectCard={handleSelectCard}
            draftDone={draftDone}
          />
          {draftDone && (
            <>
              <SponsorPanel
                racers={racers}
                tokens={tokens}
                mySponsorship={mySponsorship}
                allSponsorships={allSponsorships}
                onSponsor={handleSponsorHorse}
              />
              <p style={{ color: '#666', textAlign: 'center', marginTop: '0.75rem', fontSize: '0.82rem' }}>
                Waiting for the host to start the race…
              </p>
            </>
          )}
        </div>
      )}


      {/* Betting grid + side bets — full viewport width, no maxWidth cap */}
      {gamePhase === 'racing' && !showResult && (
        <div style={{ padding: '0.5rem 0.4rem 90px' }}>
          <BettingGrid
            racers={racers}
            myBets={myBets}
            betSummary={betSummary}
            lockedRacers={lockedRacers}
            closingRacers={closingRacers}
            held={heldChip}
            usedChips={usedChips}
            onPlace={handlePlaceChip}
          />
          <SideBetPanel
            sideBets={sideBets}
            sideBetOccupants={sideBetOccupants}
            mySideBets={mySideBets}
            held={heldChip}
            usedChips={usedChips}
            betsLocked={anyLocked}
            mySocketId={mySocketId}
            onPlace={handlePlaceSideBet}
          />
        </div>
      )}

      {/* Post-race standings */}
      {gamePhase === 'finished' && !showResult && (
        <div style={{ padding: '0.75rem', maxWidth: 520, margin: '0 auto' }}>
          <PlayerStandings
            payouts={payouts}
            mySocketId={mySocketId}
            isLastRace={isLastRace}
          />
        </div>
      )}
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = {
  page:      { padding: '1rem', paddingBottom: '90px' },
  header:    { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' },
  roomBadge: { background: '#0f0f0f', border: '2px solid #f5c518', color: '#f5c518', padding: '4px 12px', borderRadius: 6, fontWeight: 'bold', letterSpacing: 4, fontSize: '0.9rem' },
  section:   { marginBottom: '1.5rem' },
  label:     { color: '#666', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 1, marginBottom: '0.6rem', marginTop: 0 },
  banner:    { display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#0f0f0f', border: '1px solid #333', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '0.75rem' },
};
