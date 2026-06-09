'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

type CallState = 'idle' | 'calling' | 'incoming' | 'connected';

/**
 * CallOverlay — peer-to-peer audio/video calling between the two co-op players,
 * using Socket.io for signaling and WebRTC for the media stream.
 *
 * Renders a call button (top-right, below the settings gear) and the call UI.
 */
export default function CallOverlay() {
  const [callState, setCallState] = useState<CallState>('idle');
  const [withVideo, setWithVideo] = useState(true);
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [incomingVideo, setIncomingVideo] = useState(true);
  const [callPos, setCallPos] = useState({ x: 0, y: 0 });
  const [selfPos, setSelfPos] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ target: 'call' | 'self' | null; offX: number; offY: number }>({ target: null, offX: 0, offY: 0 });

  const socketRef = useRef<Socket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);
  const isCallerRef = useRef(false);

  const ICE_SERVERS: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

  // ─── Cleanup helper ───────────────────────────────────────────────
  const cleanup = useCallback(() => {
    if (pcRef.current) { try { pcRef.current.close(); } catch {} pcRef.current = null; }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    pendingIceRef.current = [];
    isCallerRef.current = false;
  }, []);

  const endCall = useCallback((notify = true) => {
    if (notify) socketRef.current?.emit('callEnded');
    cleanup();
    setCallState('idle');
    setMuted(false);
    setCamOff(false);
  }, [cleanup]);

  // ─── Create peer connection ───────────────────────────────────────
  const createPeer = useCallback(() => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pc.onicecandidate = (e) => {
      if (e.candidate) socketRef.current?.emit('webrtcIce', { candidate: e.candidate });
    };
    pc.ontrack = (e) => {
      const stream = e.streams[0];
      // Always route remote audio through a dedicated <audio> element — iOS Safari
      // won't reliably play audio from a hidden/inactive <video> element.
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = stream;
        remoteAudioRef.current.play?.().catch(() => {});
      }
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
        remoteVideoRef.current.play?.().catch(() => {});
      }
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected' || pc.connectionState === 'closed') {
        // peer dropped
      }
    };
    pcRef.current = pc;
    return pc;
  }, []);

  // ─── Get local media ──────────────────────────────────────────────
  const getMedia = useCallback(async (video: boolean) => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video });
    localStreamRef.current = stream;
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
      localVideoRef.current.play?.().catch(() => {});
    }
    return stream;
  }, []);

  // ─── Start a call (caller) ────────────────────────────────────────
  const startCall = useCallback(async (video: boolean) => {
    try {
      // Kick the audio element within the user gesture so iOS allows playback later
      remoteAudioRef.current?.play?.().catch(() => {});
      isCallerRef.current = true;
      setWithVideo(video);
      setCallState('calling');
      socketRef.current?.emit('callRequest', { video });
    } catch (err) {
      endCall(false);
    }
  }, [endCall]);

  // ─── Accept an incoming call (callee) ─────────────────────────────
  const acceptCall = useCallback(async () => {
    try {
      // Kick the audio element within the user gesture so iOS allows playback
      remoteAudioRef.current?.play?.().catch(() => {});
      const stream = await getMedia(incomingVideo);
      const pc = createPeer();
      stream.getTracks().forEach(t => pc.addTrack(t, stream));
      setWithVideo(incomingVideo);
      setCallState('connected');
      socketRef.current?.emit('callAccepted', { video: incomingVideo });
    } catch (err) {
      socketRef.current?.emit('callRejected');
      endCall(false);
    }
  }, [getMedia, createPeer, incomingVideo, endCall]);

  const rejectCall = useCallback(() => {
    socketRef.current?.emit('callRejected');
    setCallState('idle');
  }, []);

  // ─── Socket + signaling wiring ────────────────────────────────────
  useEffect(() => {
    const socket = io();
    socketRef.current = socket;
    socket.emit('join', 'call');

    socket.on('callRequest', (data: { video: boolean }) => {
      // Only show incoming if we're idle
      setCallState((s) => {
        if (s === 'idle') { setIncomingVideo(!!data.video); return 'incoming'; }
        return s;
      });
    });

    socket.on('callAccepted', async (data: { video: boolean }) => {
      // We are the caller; the callee accepted — start the offer
      try {
        const stream = await getMedia(withVideoRef.current);
        const pc = createPeer();
        stream.getTracks().forEach(t => pc.addTrack(t, stream));
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('webrtcOffer', { sdp: offer });
        setCallState('connected');
      } catch (err) {
        endCall();
      }
    });

    socket.on('callRejected', () => { cleanup(); setCallState('idle'); });
    socket.on('callEnded', () => { cleanup(); setCallState('idle'); setMuted(false); setCamOff(false); });

    socket.on('webrtcOffer', async (data: { sdp: RTCSessionDescriptionInit }) => {
      try {
        let pc = pcRef.current;
        if (!pc) pc = createPeer();
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        // flush queued ICE
        for (const c of pendingIceRef.current) { try { await pc.addIceCandidate(c); } catch {} }
        pendingIceRef.current = [];
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('webrtcAnswer', { sdp: answer });
      } catch (err) {}
    });

    socket.on('webrtcAnswer', async (data: { sdp: RTCSessionDescriptionInit }) => {
      try {
        const pc = pcRef.current;
        if (!pc) return;
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        for (const c of pendingIceRef.current) { try { await pc.addIceCandidate(c); } catch {} }
        pendingIceRef.current = [];
      } catch (err) {}
    });

    socket.on('webrtcIce', async (data: { candidate: RTCIceCandidateInit }) => {
      try {
        const pc = pcRef.current;
        if (pc && pc.remoteDescription) { await pc.addIceCandidate(data.candidate); }
        else { pendingIceRef.current.push(data.candidate); }
      } catch (err) {}
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep a ref of withVideo for use inside socket callbacks
  const withVideoRef = useRef(withVideo);
  useEffect(() => { withVideoRef.current = withVideo; }, [withVideo]);

  // ─── Controls ─────────────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    const s = localStreamRef.current;
    if (!s) return;
    s.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    setMuted(m => !m);
  }, []);

  const toggleCam = useCallback(() => {
    const s = localStreamRef.current;
    if (!s) return;
    s.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
    setCamOff(c => !c);
  }, []);

  // ─── Drag the call / self windows ────────────────────────────────
  const onCallDragStart = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    dragRef.current = { target: 'call', offX: e.clientX - callPos.x, offY: e.clientY - callPos.y };
  }, [callPos]);

  const onSelfDragStart = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    dragRef.current = { target: 'self', offX: e.clientX - selfPos.x, offY: e.clientY - selfPos.y };
  }, [selfPos]);

  const onDragMove = useCallback((e: React.PointerEvent) => {
    if (dragRef.current.target === 'call') {
      setCallPos({ x: e.clientX - dragRef.current.offX, y: e.clientY - dragRef.current.offY });
    } else if (dragRef.current.target === 'self') {
      setSelfPos({ x: e.clientX - dragRef.current.offX, y: e.clientY - dragRef.current.offY });
    }
  }, []);

  const onDragEnd = useCallback(() => { dragRef.current.target = null; }, []);

  // ─── UI ───────────────────────────────────────────────────────────
  const iconBtn: React.CSSProperties = {
    width: 44, height: 44, fontSize: '1.2rem', backgroundColor: 'rgba(255,255,255,0.1)',
    color: 'white', border: '2px solid rgba(255,255,255,0.3)', borderRadius: '8px',
    cursor: 'pointer', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center',
  };

  return (
    <>
      {/* Call button — top-right, below the settings gear */}
      {callState === 'idle' && (
        <div style={{ position: 'absolute', top: '124px', right: '20px', display: 'flex', flexDirection: 'column', gap: 8, zIndex: 100 }}>
          <button title="Audio call" onClick={() => startCall(false)} style={iconBtn}>📞</button>
          <button title="Video call" onClick={() => startCall(true)} style={iconBtn}>📹</button>
        </div>
      )}

      {/* Calling... (caller waiting) */}
      {callState === 'calling' && (
        <div style={overlayBox}>
          <div style={{ color: '#fff', fontFamily: 'monospace', fontSize: '1.1rem', marginBottom: 12 }}>Calling teammate…</div>
          <button onClick={() => endCall()} style={endBtn}>✕ Cancel</button>
        </div>
      )}

      {/* Incoming call prompt */}
      {callState === 'incoming' && (
        <div style={overlayBox}>
          <div style={{ color: '#fff', fontFamily: 'monospace', fontSize: '1.1rem', marginBottom: 12 }}>
            Incoming {incomingVideo ? 'video' : 'audio'} call
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={acceptCall} style={{ ...endBtn, background: '#1b8a3a' }}>✓ Accept</button>
            <button onClick={rejectCall} style={endBtn}>✕ Decline</button>
          </div>
        </div>
      )}

      {/* Connected call UI — draggable, shows the remote (other player) */}
      <div
        onPointerDown={onCallDragStart}
        onPointerMove={onDragMove}
        onPointerUp={onDragEnd}
        onPointerCancel={onDragEnd}
        style={{
          position: 'absolute', left: '50%', bottom: '20px',
          transform: `translateX(-50%) translate(${callPos.x}px, ${callPos.y}px)`,
          zIndex: 120, display: callState === 'connected' ? 'flex' : 'none',
          flexDirection: 'column', alignItems: 'center', gap: 8,
          cursor: 'grab', touchAction: 'none',
        }}
      >
        <video ref={remoteVideoRef} autoPlay playsInline muted style={{ width: 200, height: 150, background: '#000', borderRadius: 8, border: '2px solid rgba(255,255,255,0.4)', objectFit: 'cover', display: withVideo ? 'block' : 'none', pointerEvents: 'none' }} />
        <div style={{ display: 'flex', gap: 10 }}>
          <button onPointerDown={(e) => e.stopPropagation()} onClick={toggleMute} style={iconBtn} title={muted ? 'Unmute' : 'Mute'}>{muted ? '🔇' : '🎤'}</button>
          {withVideo && <button onPointerDown={(e) => e.stopPropagation()} onClick={toggleCam} style={iconBtn} title={camOff ? 'Camera on' : 'Camera off'}>{camOff ? '🚫' : '📹'}</button>}
          <button onPointerDown={(e) => e.stopPropagation()} onClick={() => endCall()} style={endBtn}>✕ End</button>
        </div>
      </div>

      {/* Self-view — separately draggable */}
      <div
        onPointerDown={onSelfDragStart}
        onPointerMove={onDragMove}
        onPointerUp={onDragEnd}
        onPointerCancel={onDragEnd}
        style={{
          position: 'absolute', left: '20px', bottom: '20px',
          transform: `translate(${selfPos.x}px, ${selfPos.y}px)`,
          zIndex: 121, display: (callState === 'connected' && withVideo) ? 'block' : 'none',
          cursor: 'grab', touchAction: 'none',
        }}
      >
        <video ref={localVideoRef} autoPlay playsInline muted style={{ width: 110, height: 82, background: '#000', borderRadius: 8, border: '2px solid rgba(255,255,255,0.5)', objectFit: 'cover', pointerEvents: 'none' }} />
      </div>

      {/* Dedicated remote audio element — required for reliable audio playback on iOS Safari */}
      <audio ref={remoteAudioRef} autoPlay playsInline />
    </>
  );
}

const overlayBox: React.CSSProperties = {
  position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
  zIndex: 200, background: 'rgba(20,20,40,0.95)', border: '2px solid rgba(255,215,0,0.4)',
  borderRadius: 16, padding: '1.5rem 2rem', display: 'flex', flexDirection: 'column',
  alignItems: 'center', boxShadow: '0 10px 40px rgba(0,0,0,0.7)',
};

const endBtn: React.CSSProperties = {
  padding: '0.6rem 1.2rem', borderRadius: 10, cursor: 'pointer', background: '#b02020',
  border: 'none', color: '#fff', fontFamily: 'monospace', fontWeight: 'bold', fontSize: '0.95rem',
};
