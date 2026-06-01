'use client'

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';

const PhaserGame = dynamic(() => import('@/components/PhaserGame'), { ssr: false });
const MiniGame = dynamic(() => import('@/components/MiniGame'), { ssr: false });

export default function Home() {
  const [role, setRole] = useState<'p1' | 'p2' | 'mini' | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [blinkOn, setBlinkOn] = useState(true);

  // Blink the selector arrow
  useEffect(() => {
    if (role) return;
    const interval = setInterval(() => setBlinkOn(b => !b), 500);
    return () => clearInterval(interval);
  }, [role]);

  // Arrow key navigation for menu
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (role) return;
    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
      setSelectedIndex(i => (i === 0 ? 2 : i - 1));
    } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
      setSelectedIndex(i => (i === 2 ? 0 : i + 1));
    } else if (e.key === 'Enter' || e.key === ' ') {
      setRole(selectedIndex === 0 ? 'p1' : selectedIndex === 1 ? 'p2' : 'mini');
    }
  }, [role, selectedIndex]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  function goFullscreen() {
    const elem = document.documentElement as any;
    if (elem.requestFullscreen) {
      elem.requestFullscreen().catch(() => { });
    } else if (elem.webkitRequestFullscreen) {
      elem.webkitRequestFullscreen();
    } else if (elem.mozRequestFullScreen) {
      elem.mozRequestFullScreen();
    } else if (elem.msRequestFullscreen) {
      elem.msRequestFullscreen();
    }
    try {
      if (screen.orientation && (screen.orientation as any).lock) {
        (screen.orientation as any).lock('landscape').catch(() => { });
      }
    } catch (e) { }
    window.scrollTo(0, 1);
  }

  if (!role) {
    return (
      <main style={{ width: '100vw', height: '100dvh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backgroundColor: '#000', color: '#fff', fontFamily: 'monospace', overflow: 'hidden', position: 'relative' }}>
        {/* Sky background */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #5c94fc 0%, #5c94fc 60%, #8b4513 60%, #8b4513 100%)', zIndex: 0 }} />
        
        {/* Clouds */}
        <div style={{ position: 'absolute', top: '8%', left: '10%', width: 120, height: 50, background: '#fff', borderRadius: '50px', opacity: 0.9, zIndex: 1 }} />
        <div style={{ position: 'absolute', top: '15%', right: '15%', width: 90, height: 40, background: '#fff', borderRadius: '40px', opacity: 0.8, zIndex: 1 }} />
        <div style={{ position: 'absolute', top: '5%', right: '40%', width: 100, height: 45, background: '#fff', borderRadius: '45px', opacity: 0.85, zIndex: 1 }} />

        {/* Banner */}
        <div style={{ zIndex: 10, textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ 
            fontSize: 'clamp(2rem, 6vw, 4rem)', 
            fontWeight: 'bold', 
            color: '#ff0000', 
            textShadow: '3px 3px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000',
            letterSpacing: '3px',
            padding: '0.5rem 1.5rem',
            background: 'rgba(0,0,0,0.6)',
            borderRadius: '12px',
            border: '4px solid #ffd700'
          }}>
            SUPER MARIO
          </div>
          <div style={{ 
            fontSize: 'clamp(1.2rem, 3vw, 2rem)', 
            color: '#ffd700', 
            textShadow: '2px 2px 0 #000',
            marginTop: '0.5rem',
            letterSpacing: '2px'
          }}>
            CO-OP ADVENTURE
          </div>
        </div>

        {/* Menu options */}
        <div style={{ zIndex: 10, display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
          {/* Player 1 option */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ width: 30, fontSize: '1.5rem', visibility: selectedIndex === 0 && blinkOn ? 'visible' : 'hidden' }}>▶</span>
            <div style={{ 
              padding: '0.8rem 2rem', 
              fontSize: 'clamp(1rem, 2.5vw, 1.5rem)', 
              backgroundColor: selectedIndex === 0 ? '#d50000' : '#660000', 
              color: 'white', 
              border: selectedIndex === 0 ? '3px solid #fff' : '3px solid #666', 
              borderRadius: '8px',
              minWidth: '250px',
              textAlign: 'center',
              transition: 'all 0.2s'
            }}>
              🍄 PLAYER 1 - MARIO
            </div>
          </div>

          {/* Player 2 option */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ width: 30, fontSize: '1.5rem', visibility: selectedIndex === 1 && blinkOn ? 'visible' : 'hidden' }}>▶</span>
            <div style={{ 
              padding: '0.8rem 2rem', 
              fontSize: 'clamp(1rem, 2.5vw, 1.5rem)', 
              backgroundColor: selectedIndex === 1 ? '#ff69b4' : '#8b0060', 
              color: 'white', 
              border: selectedIndex === 1 ? '3px solid #fff' : '3px solid #666', 
              borderRadius: '8px',
              minWidth: '250px',
              textAlign: 'center',
              transition: 'all 0.2s'
            }}>
              👸 PLAYER 2 - PRINCESS
            </div>
          </div>

          {/* Mario Minix option */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ width: 30, fontSize: '1.5rem', visibility: selectedIndex === 2 && blinkOn ? 'visible' : 'hidden' }}>▶</span>
            <div style={{ 
              padding: '0.8rem 2rem', 
              fontSize: 'clamp(1rem, 2.5vw, 1.5rem)', 
              backgroundColor: selectedIndex === 2 ? '#ffd700' : '#8b6914', 
              color: selectedIndex === 2 ? '#000' : '#fff', 
              border: selectedIndex === 2 ? '3px solid #fff' : '3px solid #666', 
              borderRadius: '8px',
              minWidth: '250px',
              textAlign: 'center',
              transition: 'all 0.2s'
            }}>
              ⭐ MARIO MINIX - SURVIVAL
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div style={{ zIndex: 10, marginTop: '2rem', textAlign: 'center', color: '#ffd700', fontSize: 'clamp(0.7rem, 1.5vw, 1rem)', textShadow: '1px 1px 0 #000' }}>
          <p>▲▼ SELECT  •  ENTER TO START</p>
          <p style={{ marginTop: '0.5rem', color: '#aaa', fontSize: '0.8em' }}>Both players must join to play together!</p>
        </div>

        {/* On-screen buttons for mobile (d-pad + enter) */}
        <div style={{ position: 'absolute', left: 30, bottom: 20, display: 'grid', gridTemplateColumns: 'repeat(3, 60px)', gridTemplateRows: 'repeat(2, 60px)', zIndex: 20 }}>
          <div />
          <button onPointerDown={() => setSelectedIndex(i => (i === 0 ? 2 : i - 1))} style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(60,60,200,0.82)', border: '3px solid rgba(255,255,255,0.35)', color: '#fff', fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', touchAction: 'none' }}>▲</button>
          <div />
          <div />
          <button onPointerDown={() => setSelectedIndex(i => (i === 2 ? 0 : i + 1))} style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(60,60,200,0.82)', border: '3px solid rgba(255,255,255,0.35)', color: '#fff', fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', touchAction: 'none' }}>▼</button>
          <div />
        </div>
        <button onPointerDown={() => setRole(selectedIndex === 0 ? 'p1' : selectedIndex === 1 ? 'p2' : 'mini')} style={{ position: 'absolute', right: 30, bottom: 20, width: 72, height: 72, borderRadius: '50%', background: 'rgba(210,30,30,0.88)', border: '3px solid rgba(255,255,255,0.35)', color: '#fff', fontSize: 14, fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20, touchAction: 'none' }}>ENTER</button>

        {/* Ground bricks decoration */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%', zIndex: 2, display: 'flex', flexWrap: 'wrap', overflow: 'hidden' }}>
          {Array.from({ length: 100 }).map((_, i) => (
            <div key={i} style={{ width: 32, height: 32, backgroundColor: i % 7 === 0 ? '#a0522d' : '#c84c0c', border: '1px solid #7c3800', flexShrink: 0 }} />
          ))}
        </div>
      </main>
    );
  }

  if (role === 'mini') {
    return (
      <main style={{ width: '100vw', height: '100dvh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#222', margin: 0, padding: 0, position: 'relative' }}>
        <MiniGame />
      </main>
    );
  }

  return (
    <main style={{ width: '100vw', height: '100dvh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#222', margin: 0, padding: 0, position: 'relative' }}>
      <PhaserGame role={role as 'p1' | 'p2'} />
      <button
        onClick={goFullscreen}
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          padding: '10px 16px',
          fontSize: '1rem',
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          color: 'white',
          border: '2px solid rgba(255, 255, 255, 0.3)',
          borderRadius: '8px',
          cursor: 'pointer',
          zIndex: 100,
          backdropFilter: 'blur(4px)'
        }}
      >
        ⛶ Fullscreen
      </button>
    </main>
  );
}
