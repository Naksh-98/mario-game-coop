'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';

const PhaserGame = dynamic(() => import('@/components/PhaserGame'), { ssr: false });
const MiniGame = dynamic(() => import('@/components/MiniGame'), { ssr: false });

interface GameSettings {
  musicVol: number;   // 0-1
  sfxVol: number;     // 0-1
  btnPos: 'left' | 'right';
}

function loadSettings(): GameSettings {
  try {
    const s = localStorage.getItem('mario_settings');
    if (s) return { ...{ musicVol: 0.5, sfxVol: 0.7, btnPos: 'left' }, ...JSON.parse(s) };
  } catch { }
  return { musicVol: 0.5, sfxVol: 0.7, btnPos: 'left' };
}

export default function Home() {
  const [role, setRole] = useState<'p1' | 'p2' | 'mini' | 'editor' | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [blinkOn, setBlinkOn] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<GameSettings>({ musicVol: 0.5, sfxVol: 0.7, btnPos: 'left' });
  const [loadedSave, setLoadedSave] = useState<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const data = JSON.parse(text);

        if (
          typeof data.level === 'number' &&
          typeof data.score === 'number' &&
          typeof data.hearts === 'number' &&
          typeof data.coinCount === 'number'
        ) {
          setLoadedSave(data);
          alert(`Save game loaded! Level: ${data.level}, Score: ${data.score}pts. Select Player 1 or Player 2 to start.`);
        } else {
          alert('Invalid save file format! Make sure it contains level, score, hearts, and coinCount.');
        }
      } catch (err) {
        alert('Error parsing the save file. Please select a valid JSON save game file.');
      }
    };
    reader.readAsText(file);
  }, []);

  const handleLoadSaveGame = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  }, []);

  // Load settings from localStorage on mount
  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  // Save settings whenever they change
  useEffect(() => {
    try { localStorage.setItem('mario_settings', JSON.stringify(settings)); } catch { }
    if (audioRef.current) audioRef.current.volume = settings.musicVol;
  }, [settings]);

  // Play/Stop Lobby BGM
  useEffect(() => {
    if (!role) {
      if (!audioRef.current) {
        audioRef.current = new Audio('/audio/mainscreen.mp3');
        audioRef.current.loop = true;
        audioRef.current.volume = settings.musicVol;
      }
      audioRef.current.play().catch(() => { });
    } else {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    }
    return () => { if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; } };
  }, [role]);

  // Assist with autoplay on any interaction
  const triggerAudioPlay = useCallback(() => {
    if (audioRef.current && audioRef.current.paused) audioRef.current.play().catch(() => { });
  }, []);

  // Play real Mario coin sound on menu navigation
  const playCoinSound = useCallback(() => {
    try {
      const sfx = new Audio('/audio/mario_coin_sound.mp3');
      sfx.volume = settings.sfxVol;
      sfx.play().catch(() => { });
    } catch { }
  }, [settings.sfxVol]);

  // Blink the selector arrow
  useEffect(() => {
    if (role || showSettings) return;
    const interval = setInterval(() => setBlinkOn(b => !b), 500);
    return () => clearInterval(interval);
  }, [role, showSettings]);

  // Arrow key navigation for menu
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (role) return;
    if (showSettings) {
      if (e.key === 'Escape') setShowSettings(false);
      return;
    }
    triggerAudioPlay();
    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
      playCoinSound(); setSelectedIndex(i => (i === 0 ? 5 : i - 1));
    } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
      playCoinSound(); setSelectedIndex(i => (i === 5 ? 0 : i + 1));
    } else if (e.key === 'Enter' || e.key === ' ') {
      if (selectedIndex === 3) {
        setRole('editor');
      } else if (selectedIndex === 4) {
        handleLoadSaveGame();
      } else if (selectedIndex === 5) {
        setShowSettings(true);
      } else {
        setRole(selectedIndex === 0 ? 'p1' : selectedIndex === 1 ? 'p2' : 'mini');
      }
    }
  }, [role, selectedIndex, showSettings, triggerAudioPlay, playCoinSound, handleLoadSaveGame]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('pointerdown', triggerAudioPlay);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('pointerdown', triggerAudioPlay);
    };
  }, [handleKeyDown, triggerAudioPlay]);

  function goFullscreen() {
    const elem = document.documentElement as any;
    if (elem.requestFullscreen) elem.requestFullscreen().catch(() => { });
    else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen();
    else if (elem.mozRequestFullScreen) elem.mozRequestFullScreen();
    try {
      if (screen.orientation && (screen.orientation as any).lock)
        (screen.orientation as any).lock('landscape').catch(() => { });
    } catch { }
    window.scrollTo(0, 1);
  }

  // ─── Slider style helper ─────────────────────────────────────────────────────
  const sliderStyle: React.CSSProperties = {
    WebkitAppearance: 'none', appearance: 'none',
    width: '100%', height: 8, borderRadius: 4,
    background: 'rgba(255,255,255,0.15)',
    outline: 'none', cursor: 'pointer',
  };

  // ─── Settings Modal ──────────────────────────────────────────────────────────
  const SettingsModal = () => (
    <div
      onClick={() => setShowSettings(false)}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
          border: '2px solid rgba(255,215,0,0.4)',
          borderRadius: 20, padding: '2rem 2.5rem', minWidth: 340, maxWidth: '90vw',
          boxShadow: '0 20px 60px rgba(0,0,0,0.8), 0 0 40px rgba(255,215,0,0.15)',
          fontFamily: 'monospace',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.8rem' }}>
          <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: '#ffd700', textShadow: '0 0 12px rgba(255,215,0,0.5)' }}>
            ⚙️ SETTINGS
          </div>
          <button
            onClick={() => setShowSettings(false)}
            style={{ background: 'none', border: '2px solid rgba(255,255,255,0.3)', color: '#fff', fontSize: '1.2rem', width: 36, height: 36, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
          >✕</button>
        </div>

        {/* Music Volume */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
            <label style={{ color: '#fff', fontSize: '1rem', fontWeight: 'bold' }}>🎵 Music Volume</label>
            <span style={{ color: '#ffd700', fontSize: '0.95rem', fontWeight: 'bold', minWidth: 40, textAlign: 'right' }}>
              {Math.round(settings.musicVol * 100)}%
            </span>
          </div>
          <input
            type="range" min={0} max={100} value={Math.round(settings.musicVol * 100)}
            onChange={e => setSettings(s => ({ ...s, musicVol: Number(e.target.value) / 100 }))}
            style={sliderStyle}
          />
        </div>

        {/* SFX Volume */}
        <div style={{ marginBottom: '1.8rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
            <label style={{ color: '#fff', fontSize: '1rem', fontWeight: 'bold' }}>🔊 SFX Volume</label>
            <span style={{ color: '#ffd700', fontSize: '0.95rem', fontWeight: 'bold', minWidth: 40, textAlign: 'right' }}>
              {Math.round(settings.sfxVol * 100)}%
            </span>
          </div>
          <input
            type="range" min={0} max={100} value={Math.round(settings.sfxVol * 100)}
            onChange={e => {
              const v = Number(e.target.value) / 100;
              setSettings(s => ({ ...s, sfxVol: v }));
            }}
            style={sliderStyle}
          />
        </div>

        {/* Button Position */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ color: '#fff', fontSize: '1rem', fontWeight: 'bold', marginBottom: '0.8rem' }}>🎮 D-Pad Position</div>
          <div style={{ display: 'flex', gap: '0.8rem' }}>
            {(['left', 'right'] as const).map(pos => (
              <button
                key={pos}
                onClick={() => setSettings(s => ({ ...s, btnPos: pos }))}
                style={{
                  flex: 1, padding: '0.7rem 0', borderRadius: 10, cursor: 'pointer', fontFamily: 'monospace', fontWeight: 'bold',
                  fontSize: '0.95rem', transition: 'all 0.2s',
                  background: settings.btnPos === pos ? 'linear-gradient(135deg, #ffd700, #ff8c00)' : 'rgba(255,255,255,0.08)',
                  border: settings.btnPos === pos ? '2px solid #ffd700' : '2px solid rgba(255,255,255,0.2)',
                  color: settings.btnPos === pos ? '#000' : '#fff',
                  boxShadow: settings.btnPos === pos ? '0 4px 16px rgba(255,215,0,0.4)' : 'none',
                }}
              >
                {pos === 'left' ? '◀ Left Side' : 'Right Side ▶'}
              </button>
            ))}
          </div>
          <div style={{ color: '#aaa', fontSize: '0.75rem', marginTop: '0.5rem', textAlign: 'center' }}>
            Controls where the D-Pad appears during gameplay
          </div>
        </div>

        {/* Test SFX button */}
        <button
          onClick={playCoinSound}
          style={{
            width: '100%', padding: '0.7rem', borderRadius: 10, cursor: 'pointer',
            background: 'rgba(255,215,0,0.12)', border: '2px solid rgba(255,215,0,0.35)',
            color: '#ffd700', fontFamily: 'monospace', fontSize: '0.95rem', fontWeight: 'bold',
            transition: 'all 0.2s',
          }}
        >
          🎵 Test SFX Sound
        </button>
      </div>
    </div>
  );

  // ─── Menu Screen ─────────────────────────────────────────────────────────────
  if (!role) {
    return (
      <main style={{ width: '100vw', height: '100dvh', backgroundColor: '#000', color: '#fff', fontFamily: 'monospace', overflow: 'hidden', position: 'relative' }}>

        <input
          type="file"
          accept=".json"
          ref={fileInputRef}
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />

        {showSettings && <SettingsModal />}

        {/* Sky background */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #5c94fc 0%, #5c94fc 60%, #8b4513 60%, #8b4513 100%)', zIndex: 0 }} />

        {/* Clouds */}
        <div style={{ position: 'absolute', top: '8%', left: '10%', width: 120, height: 50, background: '#fff', borderRadius: '50px', opacity: 0.9, zIndex: 1 }} />
        <div style={{ position: 'absolute', top: '15%', right: '15%', width: 90, height: 40, background: '#fff', borderRadius: '40px', opacity: 0.8, zIndex: 1 }} />
        <div style={{ position: 'absolute', top: '5%', right: '40%', width: 100, height: 45, background: '#fff', borderRadius: '45px', opacity: 0.85, zIndex: 1 }} />

        {/* Content Wrapper - Centered Vertically and Horizontally across the entire screen */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', zIndex: 10 }}>

          {/* Banner */}
          <div style={{ textAlign: 'center', marginBottom: '1.2rem' }}>
            <div style={{ fontSize: 'clamp(3rem, 11vw, 5.5rem)', fontWeight: 'bold', color: '#ff0000', textShadow: '5px 5px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000', letterSpacing: '5px', padding: '0.6rem 2.2rem', background: 'rgba(0,0,0,0.6)', borderRadius: '16px', border: '4px solid #ffd700', display: 'inline-block' }}>
              SUPER MARIO
            </div>
            <div style={{ fontSize: 'clamp(1.2rem, 3.5vw, 2.2rem)', color: '#ffd700', textShadow: '3px 3px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000', marginTop: '0.5rem', letterSpacing: '3px', fontWeight: 'bold' }}>
              CO-OP ADVENTURE
            </div>
          </div>

          {/* Menu options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', alignItems: 'center' }}>
            {/* Player 1 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ width: 20, fontSize: '1.1rem', visibility: selectedIndex === 0 && blinkOn ? 'visible' : 'hidden' }}>▶</span>
              <div
                onClick={() => { playCoinSound(); setSelectedIndex(0); setRole('p1'); }}
                style={{ padding: '0.4rem 1.5rem', fontSize: 'clamp(0.8rem, 1.8vw, 1.1rem)', backgroundColor: selectedIndex === 0 ? '#d50000' : '#660000', color: 'white', border: selectedIndex === 0 ? '2px solid #fff' : '2px solid #666', borderRadius: '6px', minWidth: '220px', textAlign: 'center', transition: 'all 0.2s', cursor: 'pointer' }}
              >
                🍄 PLAYER 1 - MARIO
              </div>
            </div>

            {/* Player 2 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ width: 20, fontSize: '1.1rem', visibility: selectedIndex === 1 && blinkOn ? 'visible' : 'hidden' }}>▶</span>
              <div
                onClick={() => { playCoinSound(); setSelectedIndex(1); setRole('p2'); }}
                style={{ padding: '0.4rem 1.5rem', fontSize: 'clamp(0.8rem, 1.8vw, 1.1rem)', backgroundColor: selectedIndex === 1 ? '#ff69b4' : '#8b0060', color: 'white', border: selectedIndex === 1 ? '2px solid #fff' : '2px solid #666', borderRadius: '6px', minWidth: '220px', textAlign: 'center', transition: 'all 0.2s', cursor: 'pointer' }}
              >
                👸 PLAYER 2 - PRINCESS
              </div>
            </div>

            {/* Mario Minix */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ width: 20, fontSize: '1.1rem', visibility: selectedIndex === 2 && blinkOn ? 'visible' : 'hidden' }}>▶</span>
              <div
                onClick={() => { playCoinSound(); setSelectedIndex(2); setRole('mini'); }}
                style={{ padding: '0.4rem 1.5rem', fontSize: 'clamp(0.8rem, 1.8vw, 1.1rem)', backgroundColor: selectedIndex === 2 ? '#ffd700' : '#8b6914', color: selectedIndex === 2 ? '#000' : '#fff', border: selectedIndex === 2 ? '2px solid #fff' : '2px solid #666', borderRadius: '6px', minWidth: '220px', textAlign: 'center', transition: 'all 0.2s', cursor: 'pointer' }}
              >
                ⭐ MARIO MINIX - SURVIVAL
              </div>
            </div>

            {/* Level Editor */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ width: 20, fontSize: '1.1rem', visibility: selectedIndex === 3 && blinkOn ? 'visible' : 'hidden' }}>▶</span>
              <div
                onClick={() => { playCoinSound(); setSelectedIndex(3); setRole('editor'); }}
                style={{ padding: '0.4rem 1.5rem', fontSize: 'clamp(0.8rem, 1.8vw, 1.1rem)', backgroundColor: selectedIndex === 3 ? '#1565c0' : '#0d47a1', color: 'white', border: selectedIndex === 3 ? '2px solid #fff' : '2px solid #666', borderRadius: '6px', minWidth: '220px', textAlign: 'center', transition: 'all 0.2s', cursor: 'pointer' }}
              >
                🎨 LEVEL EDITOR
              </div>
            </div>

            {/* Load Save Game */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ width: 20, fontSize: '1.1rem', visibility: selectedIndex === 4 && blinkOn ? 'visible' : 'hidden' }}>▶</span>
              <div
                onClick={() => { playCoinSound(); setSelectedIndex(4); handleLoadSaveGame(); }}
                style={{ padding: '0.4rem 1.5rem', fontSize: 'clamp(0.8rem, 1.8vw, 1.1rem)', backgroundColor: selectedIndex === 4 ? '#2e7d32' : '#1b5e20', color: 'white', border: selectedIndex === 4 ? '2px solid #fff' : '2px solid #666', borderRadius: '6px', minWidth: '220px', textAlign: 'center', transition: 'all 0.2s', cursor: 'pointer' }}
              >
                {loadedSave ? `💾 LOADED (LVL ${loadedSave.level})` : '💾 LOAD SAVE GAME'}
              </div>
            </div>

            {/* Settings */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ width: 20, fontSize: '1.1rem', visibility: selectedIndex === 5 && blinkOn ? 'visible' : 'hidden' }}>▶</span>
              <div
                onClick={() => { playCoinSound(); setSelectedIndex(5); setShowSettings(true); }}
                style={{ padding: '0.4rem 1.5rem', fontSize: 'clamp(0.8rem, 1.8vw, 1.1rem)', backgroundColor: selectedIndex === 5 ? '#555555' : '#222222', color: 'white', border: selectedIndex === 5 ? '2px solid #fff' : '2px solid #666', borderRadius: '6px', minWidth: '220px', textAlign: 'center', transition: 'all 0.2s', cursor: 'pointer' }}
              >
                ⚙️ SETTINGS
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div style={{ marginTop: '0.6rem', textAlign: 'center', color: '#ffd700', fontSize: 'clamp(0.6rem, 1.1vw, 0.8rem)', textShadow: '1px 1px 0 #000' }}>
            <p>▲▼ SELECT  •  ENTER TO START</p>
            <p style={{ marginTop: '0.3rem', color: '#aaa', fontSize: '0.8em' }}>Both players must join to play together!</p>
          </div>

        </div>

        {/* Mobile D-pad */}
        <div style={{ position: 'absolute', [settings.btnPos === 'left' ? 'left' : 'right']: 30, bottom: 20, display: 'grid', gridTemplateColumns: 'repeat(3, 60px)', gridTemplateRows: 'repeat(2, 60px)', zIndex: 20 }}>
          <div />
          <button onPointerDown={() => { playCoinSound(); setSelectedIndex(i => (i === 0 ? 5 : i - 1)); }} style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(60,60,200,0.82)', border: '3px solid rgba(255,255,255,0.35)', color: '#fff', fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', touchAction: 'none' }}>▲</button>
          <div />
          <div />
          <button onPointerDown={() => { playCoinSound(); setSelectedIndex(i => (i === 5 ? 0 : i + 1)); }} style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(60,60,200,0.82)', border: '3px solid rgba(255,255,255,0.35)', color: '#fff', fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', touchAction: 'none' }}>▼</button>
          <div />
        </div>
        <button
          onPointerDown={() => {
            if (selectedIndex === 3) {
              setRole('editor');
            } else if (selectedIndex === 4) {
              handleLoadSaveGame();
            } else if (selectedIndex === 5) {
              setShowSettings(true);
            } else {
              setRole(selectedIndex === 0 ? 'p1' : selectedIndex === 1 ? 'p2' : 'mini');
            }
          }}
          style={{ position: 'absolute', [settings.btnPos === 'left' ? 'right' : 'left']: 30, bottom: 20, width: 72, height: 72, borderRadius: '50%', background: 'rgba(210,30,30,0.88)', border: '3px solid rgba(255,255,255,0.35)', color: '#fff', fontSize: 14, fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20, touchAction: 'none' }}
        >ENTER</button>

        {/* Ground bricks decoration */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%', zIndex: 2, display: 'flex', flexWrap: 'wrap', overflow: 'hidden' }}>
          {Array.from({ length: 100 }).map((_, i) => (
            <div key={i} style={{ width: 32, height: 32, backgroundColor: i % 7 === 0 ? '#a0522d' : '#c84c0c', border: '1px solid #7c3800', flexShrink: 0 }} />
          ))}
        </div>
      </main>
    );
  }

  if (role === 'editor') {
    return (
      <main style={{ width: '100vw', height: '100dvh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#222', margin: 0, padding: 0, position: 'relative' }}>
        <PhaserGame
          role={'editor'}
          onExit={() => setRole(null)}
          musicVolume={settings.musicVol}
          sfxVolume={settings.sfxVol}
          btnPos={settings.btnPos}
        />
      </main>
    );
  }

  if (role === 'mini') {
    return (
      <main style={{ width: '100vw', height: '100dvh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#222', margin: 0, padding: 0, position: 'relative' }}>
        <MiniGame musicVolume={settings.musicVol} sfxVolume={settings.sfxVol} btnPos={settings.btnPos} />
      </main>
    );
  }

  return (
    <main style={{ width: '100vw', height: '100dvh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#222', margin: 0, padding: 0, position: 'relative' }}>
      <PhaserGame
        role={role as 'p1' | 'p2'}
        musicVolume={settings.musicVol}
        sfxVolume={settings.sfxVol}
        btnPos={settings.btnPos}
        initialLevel={loadedSave ? loadedSave.level : 1}
        initialScore={loadedSave ? loadedSave.score : 0}
        initialHearts={loadedSave ? loadedSave.hearts : 3}
        initialCoins={loadedSave ? loadedSave.coinCount : 0}
      />
      <button
        onClick={goFullscreen}
        style={{ position: 'absolute', top: '20px', right: '20px', padding: '10px 16px', fontSize: '1rem', backgroundColor: 'rgba(255, 255, 255, 0.1)', color: 'white', border: '2px solid rgba(255, 255, 255, 0.3)', borderRadius: '8px', cursor: 'pointer', zIndex: 100, backdropFilter: 'blur(4px)' }}
      >
        ⛶ Fullscreen
      </button>
    </main>
  );
}
