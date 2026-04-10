'use client'

import React, { useState } from 'react';
import dynamic from 'next/dynamic';

const PhaserGame = dynamic(() => import('@/components/PhaserGame'), { ssr: false });

export default function Home() {
  const [role, setRole] = useState<'p1' | 'p2' | null>(null);

  function goFullscreen() {
    const elem = document.documentElement as any;

    // 1. Attempt standard and vendor-prefixed Fullscreen API for Android/Desktop/iPad
    if (elem.requestFullscreen) {
      elem.requestFullscreen().catch(() => { });
    } else if (elem.webkitRequestFullscreen) { /* Safari / iOS Chrome */
      elem.webkitRequestFullscreen();
    } else if (elem.mozRequestFullScreen) { /* Firefox */
      elem.mozRequestFullScreen();
    } else if (elem.msRequestFullscreen) { /* IE/Edge */
      elem.msRequestFullscreen();
    }

    // 2. Attempt to lock the screen to landscape automatically
    try {
      if (screen.orientation && (screen.orientation as any).lock) {
        (screen.orientation as any).lock('landscape').catch(() => { });
      }
    } catch (e) {
      // Ignore errors silently on unsupported browsers
    }

    // 3. For iPhone Safari (where Fullscreen API is disabled by Apple), 
    // a slight scroll is the native method to collapse the URL menu bar.
    window.scrollTo(0, 1);
  }

  if (!role) {
    return (
      <main style={{ width: '100vw', height: '100dvh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backgroundColor: '#222', color: '#fff', fontFamily: 'monospace' }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '2rem', textAlign: 'center', textShadow: '2px 2px #000' }}>Mini Retro Runner Co-op</h1>
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            onClick={() => setRole('p1')}
            style={{ padding: '1rem 2rem', fontSize: '1.5rem', backgroundColor: '#d50000', color: 'white', border: '4px solid #fff', borderRadius: '12px', cursor: 'pointer', boxShadow: '0 8px #990000' }}
          >
            Play as Mario (P1 - Red)
          </button>

          <button
            onClick={() => setRole('p2')}
            style={{ padding: '1rem 2rem', fontSize: '1.5rem', backgroundColor: '#00c853', color: 'white', border: '4px solid #fff', borderRadius: '12px', cursor: 'pointer', boxShadow: '0 8px #007e33' }}
          >
            Play as Luigi (P2 - Green)
          </button>
        </div>
      </main>
    );
  }

  return (
    <main style={{ width: '100vw', height: '100dvh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#222', margin: 0, padding: 0, position: 'relative' }}>
      <PhaserGame role={role} />
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
