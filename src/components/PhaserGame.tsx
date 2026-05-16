'use client'

import React, { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

export default function PhaserGame({ role }: { role: 'p1' | 'p2' }) {
   const gameRef = useRef<HTMLDivElement>(null);
   // Shared joy-keys object — React buttons write here, Phaser reads here
   const joyKeysRef = useRef({ left: false, right: false, down: false, jump: false });

   useEffect(() => {
      if (typeof window === 'undefined') return;

      let isDestroyed = false;
      let game: any;
      const socket: Socket = io();

      import('phaser').then((ph) => {
         if (isDestroyed) return;
         const Phaser = ph.default || ph;

         class MainScene extends Phaser.Scene {
            p1!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
            p2!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
            blocks!: Phaser.Physics.Arcade.StaticGroup;
            qBlocks!: Phaser.Physics.Arcade.StaticGroup;
            obstacles!: Phaser.Physics.Arcade.StaticGroup;
            enemies!: Phaser.Physics.Arcade.Group;
            fireballs!: Phaser.Physics.Arcade.Group;
            mushrooms!: Phaser.Physics.Arcade.Group;
            piranhas!: Phaser.Physics.Arcade.Group;
            movingPlatforms!: Phaser.Physics.Arcade.Group;
            clouds!: Phaser.GameObjects.Group;
            flags!: Phaser.Physics.Arcade.StaticGroup;
            coins!: Phaser.Physics.Arcade.Group;
            cameraCenter!: Phaser.GameObjects.Rectangle;

            cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
            keyW!: Phaser.Input.Keyboard.Key;
            keyA!: Phaser.Input.Keyboard.Key;
            keyS!: Phaser.Input.Keyboard.Key;
            keyD!: Phaser.Input.Keyboard.Key;

            uiText!: Phaser.GameObjects.Text;
            myPlayer!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
            otherPlayer!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;

            audioCtx!: AudioContext;
            bgmInterval!: number;

            joyKeys = joyKeysRef.current;
            prevJump = false;

            hearts = 3;
            gameOver = false;
            gameWon = false;
            waitingForOther = false; 
            countingDown = false;
            level = 1;
            isBig = false;
            coinCount = 0;
            countdownText!: Phaser.GameObjects.Text;
            finishedSet: Set<string> = new Set();

            constructor() {
               super({ key: 'MainScene' });
            }

            drawPlayer(key: string, shirtCol: number, frameType: 'run1' | 'run2' | 'jump' | 'crouch') {
               const skin = 0xffdab9; const overalls = 0x1e90ff; const hat = shirtCol; const shoes = 0x8b4513;
               const g = this.make.graphics({ x: 0, y: 0 }, false); const p = 2;

               if (frameType === 'crouch') {
                  g.fillStyle(hat); g.fillRect(3 * p, 6 * p, 6 * p, 2 * p); g.fillStyle(skin); g.fillRect(3 * p, 8 * p, 6 * p, 3 * p);
                  g.fillStyle(shirtCol); g.fillRect(2 * p, 11 * p, 8 * p, 3 * p); g.fillStyle(overalls); g.fillRect(3 * p, 14 * p, 6 * p, 2 * p);
                  g.fillStyle(shoes); g.fillRect(1 * p, 15 * p, 4 * p, 2 * p); g.fillRect(7 * p, 15 * p, 4 * p, 2 * p);
                  g.generateTexture(key, 13 * p, 17 * p); g.destroy(); return;
               }

               g.fillStyle(hat); g.fillRect(3 * p, 0 * p, 5 * p, 2 * p); g.fillRect(2 * p, 2 * p, 7 * p, 1 * p);
               g.fillStyle(skin); g.fillRect(3 * p, 3 * p, 6 * p, 4 * p);
               g.fillStyle(0x000000); g.fillRect(7 * p, 4 * p, 1 * p, 1 * p); g.fillRect(7 * p, 6 * p, 2 * p, 1 * p);
               g.fillStyle(shirtCol); g.fillRect(3 * p, 7 * p, 6 * p, 3 * p);
               g.fillStyle(overalls); g.fillRect(4 * p, 9 * p, 4 * p, 4 * p); g.fillRect(3 * p, 10 * p, 1 * p, 3 * p); g.fillRect(8 * p, 10 * p, 1 * p, 3 * p);

               g.fillStyle(shirtCol);
               if (frameType === 'jump') { g.fillRect(1 * p, 4 * p, 2 * p, 4 * p); g.fillRect(9 * p, 6 * p, 2 * p, 3 * p); g.fillStyle(skin); g.fillRect(1 * p, 2 * p, 2 * p, 2 * p); g.fillRect(9 * p, 9 * p, 2 * p, 2 * p); }
               else if (frameType === 'run1') { g.fillRect(2 * p, 8 * p, 2 * p, 3 * p); g.fillRect(8 * p, 8 * p, 3 * p, 2 * p); g.fillStyle(skin); g.fillRect(2 * p, 11 * p, 2 * p, 2 * p); g.fillRect(11 * p, 8 * p, 2 * p, 2 * p); }
               else { g.fillRect(1 * p, 8 * p, 3 * p, 2 * p); g.fillRect(9 * p, 8 * p, 2 * p, 3 * p); g.fillStyle(skin); g.fillRect(0 * p, 8 * p, 2 * p, 2 * p); g.fillRect(9 * p, 11 * p, 2 * p, 2 * p); }

               g.fillStyle(overalls);
               if (frameType === 'jump') { g.fillRect(2 * p, 13 * p, 3 * p, 2 * p); g.fillRect(7 * p, 12 * p, 3 * p, 2 * p); g.fillStyle(shoes); g.fillRect(1 * p, 15 * p, 3 * p, 2 * p); g.fillRect(8 * p, 13 * p, 3 * p, 2 * p); }
               else if (frameType === 'run1') { g.fillRect(3 * p, 13 * p, 2 * p, 2 * p); g.fillRect(7 * p, 13 * p, 3 * p, 2 * p); g.fillStyle(shoes); g.fillRect(2 * p, 15 * p, 3 * p, 2 * p); g.fillRect(7 * p, 15 * p, 4 * p, 2 * p); }
               else { g.fillRect(2 * p, 12 * p, 4 * p, 2 * p); g.fillRect(7 * p, 13 * p, 2 * p, 2 * p); g.fillStyle(shoes); g.fillRect(1 * p, 13 * p, 3 * p, 2 * p); g.fillRect(7 * p, 15 * p, 3 * p, 2 * p); }

               g.generateTexture(key, 13 * p, 17 * p); g.destroy();
            }

            drawPrincess(key: string, frameType: 'run1' | 'run2' | 'jump' | 'crouch') {
               const skin = 0xffdab9; const hair = 0xffe066; const dress = 0xffb6c1; const trim = 0xff1493;
               const crown = 0xffd700; const jewel = 0x00bfff; const shoes = 0xe52458; const legs = 0xffffff;
               const g = this.make.graphics({ x: 0, y: 0 }, false); const p = 2;

               if (frameType === 'crouch') {
                  g.fillStyle(crown); g.fillRect(4 * p, 5 * p, 5 * p, 1 * p);
                  g.fillStyle(jewel); g.fillRect(6 * p, 5 * p, 1 * p, 1 * p);
                  g.fillStyle(hair); g.fillRect(3 * p, 6 * p, 7 * p, 4 * p);
                  g.fillStyle(skin); g.fillRect(4 * p, 7 * p, 5 * p, 3 * p);
                  g.fillStyle(dress); g.fillRect(2 * p, 10 * p, 9 * p, 7 * p);
                  g.fillStyle(trim); g.fillRect(2 * p, 15 * p, 9 * p, 2 * p);
                  g.generateTexture(key, 13 * p, 17 * p); g.destroy(); return;
               }

               g.fillStyle(crown); g.fillRect(5 * p, 0 * p, 3 * p, 1 * p); g.fillRect(4 * p, 1 * p, 5 * p, 1 * p);
               g.fillStyle(jewel); g.fillRect(6 * p, 1 * p, 1 * p, 1 * p);
               g.fillStyle(hair); g.fillRect(3 * p, 2 * p, 7 * p, 7 * p);
               g.fillRect(2 * p, 4 * p, 1 * p, 9 * p); g.fillRect(10 * p, 4 * p, 1 * p, 9 * p);
               g.fillRect(1 * p, 6 * p, 1 * p, 5 * p); g.fillRect(11 * p, 6 * p, 1 * p, 5 * p);
               g.fillStyle(skin); g.fillRect(4 * p, 3 * p, 5 * p, 5 * p);
               g.fillStyle(0x000000); g.fillRect(7 * p, 4 * p, 1 * p, 1 * p);
               g.fillStyle(0xff69b4); g.fillRect(8 * p, 6 * p, 1 * p, 1 * p);
               g.fillStyle(dress); g.fillRect(4 * p, 8 * p, 5 * p, 3 * p);
               g.fillStyle(jewel); g.fillCircle(6.5 * p, 9.5 * p, 0.5 * p);

               if (frameType === 'run1') {
                  g.fillStyle(dress); g.fillRect(3 * p, 11 * p, 7 * p, 3 * p);
                  g.fillStyle(trim); g.fillRect(3 * p, 13 * p, 7 * p, 1 * p);
                  g.fillStyle(legs); g.fillRect(4 * p, 14 * p, 2 * p, 2 * p); g.fillRect(7 * p, 14 * p, 2 * p, 1 * p);
                  g.fillStyle(shoes); g.fillRect(3 * p, 16 * p, 3 * p, 1 * p); g.fillRect(7 * p, 15 * p, 3 * p, 1 * p);
                  g.fillStyle(dress); g.fillRect(2 * p, 8 * p, 2 * p, 3 * p); g.fillRect(9 * p, 9 * p, 2 * p, 3 * p);
               } else if (frameType === 'run2') {
                  g.fillStyle(dress); g.fillRect(3 * p, 11 * p, 7 * p, 3 * p);
                  g.fillStyle(trim); g.fillRect(3 * p, 13 * p, 7 * p, 1 * p);
                  g.fillStyle(legs); g.fillRect(4 * p, 14 * p, 2 * p, 1 * p); g.fillRect(7 * p, 14 * p, 2 * p, 2 * p);
                  g.fillStyle(shoes); g.fillRect(3 * p, 15 * p, 3 * p, 1 * p); g.fillRect(7 * p, 16 * p, 3 * p, 1 * p);
                  g.fillStyle(dress); g.fillRect(1 * p, 9 * p, 2 * p, 3 * p); g.fillRect(8 * p, 8 * p, 2 * p, 3 * p);
               } else if (frameType === 'jump') {
                  g.fillStyle(dress); g.fillRect(2 * p, 10 * p, 9 * p, 4 * p);
                  g.fillStyle(trim); g.fillRect(2 * p, 14 * p, 9 * p, 1 * p);
                  g.fillStyle(legs); g.fillRect(4 * p, 15 * p, 2 * p, 2 * p); g.fillRect(7 * p, 15 * p, 2 * p, 1 * p);
                  g.fillStyle(shoes); g.fillRect(4 * p, 16 * p, 2 * p, 1 * p); g.fillRect(7 * p, 16 * p, 2 * p, 1 * p);
                  g.fillStyle(dress); g.fillRect(1 * p, 5 * p, 2 * p, 3 * p); g.fillRect(10 * p, 5 * p, 2 * p, 3 * p);
                  g.fillStyle(skin); g.fillRect(1 * p, 3 * p, 2 * p, 2 * p); g.fillRect(10 * p, 3 * p, 2 * p, 2 * p);
               } else {
                  g.fillStyle(dress); g.fillRect(2 * p, 11 * p, 9 * p, 4 * p);
                  g.fillStyle(trim); g.fillRect(2 * p, 15 * p, 9 * p, 2 * p);
                  g.fillStyle(dress); g.fillRect(2 * p, 8 * p, 2 * p, 3 * p); g.fillRect(9 * p, 8 * p, 2 * p, 3 * p);
               }
               g.generateTexture(key, 13 * p, 17 * p); g.destroy();
            }

            playAudio(freq: number, type: OscillatorType, dur: number, ramp = true) {
               if (!this.audioCtx || freq === 0) return;
               const osc = this.audioCtx.createOscillator();
               const gain = this.audioCtx.createGain();
               osc.type = type;
               osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
               osc.connect(gain); gain.connect(this.audioCtx.destination);
               osc.start();
               if (ramp) {
                  gain.gain.exponentialRampToValueAtTime(0.00001, this.audioCtx.currentTime + dur);
               } else {
                  setTimeout(() => { if (gain) gain.gain.value = 0; }, dur * 1000);
               }
               osc.stop(this.audioCtx.currentTime + dur);
            }

            playJumpSound() {
               if (!this.audioCtx) return;
               const now = this.audioCtx.currentTime;
               const osc = this.audioCtx.createOscillator();
               const gain = this.audioCtx.createGain();
               osc.type = 'square';
               osc.frequency.setValueAtTime(150, now);
               osc.frequency.exponentialRampToValueAtTime(600, now + 0.15);
               gain.gain.setValueAtTime(0.2, now);
               gain.gain.exponentialRampToValueAtTime(0.00001, now + 0.15);
               osc.connect(gain); gain.connect(this.audioCtx.destination);
               osc.start(); osc.stop(now + 0.15);
            }

            playStompSound() {
               if (!this.audioCtx) return;
               this.playAudio(120, 'square', 0.1);
               setTimeout(() => this.playAudio(800, 'sine', 0.05), 20);
            }

            playHurtSound() {
               if (!this.audioCtx) return;
               [300, 250, 200, 150].forEach((f, i) => {
                  setTimeout(() => this.playAudio(f, 'sawtooth', 0.1), i * 80);
               });
            }

            playCoinSound() {
               if (!this.audioCtx) return;
               this.playAudio(987, 'sine', 0.1);
               setTimeout(() => this.playAudio(1318, 'sine', 0.2), 80);
            }

            playPowerUpSound() {
               if (!this.audioCtx) return;
               const notes = [261, 329, 392, 523, 659, 783, 1046];
               notes.forEach((f, i) => {
                  setTimeout(() => this.playAudio(f, 'square', 0.1), i * 60);
               });
            }

            playVictorySound() {
               if (!this.audioCtx) return;
               const melody = [523, 659, 783, 1046, 783, 1046];
               melody.forEach((f, i) => {
                  setTimeout(() => this.playAudio(f, 'square', 0.2), i * 150);
               });
            }

            playGameOverSound() {
               if (!this.audioCtx) return;
               const notes = [392, 349, 329, 261];
               notes.forEach((f, i) => {
                  setTimeout(() => this.playAudio(f, 'square', 0.3), i * 200);
               });
            }

            getMusicData(lvl: number) {
               if (lvl === 1) {
                  const m1 = [440, 0, 440, 523, 659, 0, 587, 0, 523, 0, 392, 0, 440, 0, 523, 0];
                  const m2 = [440, 0, 440, 523, 659, 0, 784, 0, 659, 0, 523, 0, 440, 0, 0, 0];
                  const m3 = [659, 0, 587, 0, 523, 0, 493, 0, 440, 0, 392, 0, 330, 0, 392, 0];
                  const m4 = [440, 0, 523, 0, 659, 0, 784, 0, 880, 0, 0, 0, 880, 0, 880, 0];
                  const melody = [...m1, ...m2, ...m1, ...m4, ...m3, ...m2, ...m1, ...m4];
                  const b1 = [110, 110, 110, 110, 130.8, 130.8, 130.8, 130.8, 98, 98, 98, 98, 146.8, 146.8, 146.8, 146.8];
                  const b2 = [110, 110, 0, 110, 130.8, 130.8, 0, 130.8, 164.8, 164.8, 0, 164.8, 146.8, 146.8, 146.8, 146.8];
                  const bass = [...b1, ...b2, ...b1, ...b2, ...b1, ...b2, ...b1, ...b2];
                  return { melody, bass, tempo: 125, mType: 'square' as OscillatorType, bType: 'sawtooth' as OscillatorType };
               } else if (lvl === 2) {
                  const m1 = [261, 0, 0, 261, 233, 0, 0, 233, 207, 0, 0, 207, 196, 0, 196, 233];
                  const melody = [...m1, ...m1, ...m1, ...m1];
                  const b1 = [65, 0, 65, 0, 58, 0, 58, 0, 52, 0, 52, 0, 49, 0, 49, 0];
                  const bass = [...b1, ...b1, ...b1, ...b1];
                  return { melody, bass, tempo: 150, mType: 'triangle' as OscillatorType, bType: 'square' as OscillatorType };
               } else if (lvl === 3) {
                  const m1 = [311, 293, 311, 293, 311, 0, 261, 0, 311, 293, 311, 293, 311, 0, 349, 0];
                  const m2 = [311, 293, 311, 293, 311, 0, 392, 0, 311, 293, 311, 293, 311, 0, 261, 0];
                  const melody = [...m1, ...m2, ...m1, ...m2];
                  const b1 = [130, 130, 130, 130, 130, 130, 130, 130, 130, 130, 130, 130, 130, 130, 130, 130];
                  const b2 = [103, 103, 103, 103, 103, 103, 103, 103, 116, 116, 116, 116, 116, 116, 116, 116];
                  const bass = [...b1, ...b2, ...b1, ...b2];
                  return { melody, bass, tempo: 100, mType: 'square' as OscillatorType, bType: 'sawtooth' as OscillatorType };
               } else if (lvl === 4) {
                  // Upbeat sky theme
                  const m1 = [523, 0, 659, 0, 784, 0, 659, 0, 523, 0, 392, 0, 523, 0, 659, 0];
                  const m2 = [784, 0, 880, 0, 784, 0, 659, 0, 523, 0, 659, 0, 784, 0, 0, 0];
                  const melody = [...m1, ...m2, ...m1, ...m2];
                  const b1 = [130, 0, 130, 0, 164, 0, 164, 0, 196, 0, 196, 0, 164, 0, 130, 0];
                  const bass = [...b1, ...b1, ...b1, ...b1];
                  return { melody, bass, tempo: 110, mType: 'sine' as OscillatorType, bType: 'triangle' as OscillatorType };
               } else {
                  // Dark boss theme
                  const m1 = [146, 0, 146, 0, 174, 0, 146, 0, 130, 0, 130, 0, 146, 0, 0, 0];
                  const m2 = [174, 0, 196, 0, 220, 0, 196, 0, 174, 0, 146, 0, 130, 0, 146, 0];
                  const melody = [...m1, ...m2, ...m1, ...m2];
                  const b1 = [73, 73, 73, 73, 73, 73, 73, 73, 65, 65, 65, 65, 65, 65, 65, 65];
                  const b2 = [87, 87, 87, 87, 87, 87, 87, 87, 73, 73, 73, 73, 73, 73, 73, 73];
                  const bass = [...b1, ...b2, ...b1, ...b2];
                  return { melody, bass, tempo: 140, mType: 'sawtooth' as OscillatorType, bType: 'square' as OscillatorType };
               }
            }

            startBGM() {
               if (this.bgmInterval) window.clearInterval(this.bgmInterval);
               const data = this.getMusicData(this.level);
               let noteIdx = 0;
               this.bgmInterval = window.setInterval(() => {
                  if (this.gameOver || this.gameWon || this.countingDown) return;
                  if (data.melody[noteIdx % data.melody.length] > 0)
                     this.playAudio(data.melody[noteIdx % data.melody.length], data.mType, 0.12);
                  if (data.bass[noteIdx % data.bass.length] > 0)
                     this.playAudio(data.bass[noteIdx % data.bass.length], data.bType, 0.22);
                  if (this.level === 2) {
                     if (noteIdx % 8 === 4) this.playAudio(6000, 'square', 0.02);
                  } else {
                     if (noteIdx % 4 === 2) this.playAudio(8000, 'square', 0.03);
                  }
                  noteIdx++;
               }, data.tempo) as unknown as number;
            }

            createTextures() {
               const ge = this.make.graphics({ x: 0, y: 0 }, false);
               ge.fillStyle(0x8b4513, 1); ge.fillRect(4, 0, 24, 20);
               ge.fillStyle(0xcc2200, 1); ge.fillRect(0, 0, 32, 14); ge.fillRect(2, 14, 28, 6);
               ge.fillStyle(0xffdab9, 1); ge.fillRect(6, 20, 20, 12);
               ge.fillStyle(0x000, 1); ge.fillRect(9, 23, 5, 5); ge.fillRect(18, 23, 5, 5);
               ge.fillStyle(0xffffff, 1); ge.fillRect(10, 24, 3, 3); ge.fillRect(19, 24, 3, 3);
               ge.fillStyle(0x8b4513, 1); ge.fillRect(2, 28, 10, 4); ge.fillRect(20, 28, 10, 4);
               ge.generateTexture('enemy', 32, 32); ge.destroy();

               const gF = this.make.graphics({ x: 0, y: 0 }, false);
               gF.fillStyle(0xff6600, 1); gF.fillCircle(10, 10, 10);
               gF.fillStyle(0xffff00, 1); gF.fillCircle(10, 10, 6);
               gF.fillStyle(0xffffff, 1); gF.fillCircle(8, 8, 3);
               gF.generateTexture('fireball', 20, 20); gF.destroy();

               const gP = this.make.graphics({ x: 0, y: 0 }, false);
               gP.fillStyle(0x228b22, 1); gP.fillRect(0, 0, 96, 16);
               gP.fillStyle(0x32cd32, 1); gP.fillRect(2, 2, 92, 6);
               gP.lineStyle(2, 0x145214, 1); gP.strokeRect(0, 0, 96, 16);
               gP.generateTexture('movingPlat', 96, 16); gP.destroy();

               const gC = this.make.graphics({ x: 0, y: 0 }, false);
               gC.fillStyle(0xffffff, 0.9); gC.fillEllipse(60, 40, 80, 40); gC.fillEllipse(40, 48, 60, 36); gC.fillEllipse(85, 48, 55, 30); gC.fillEllipse(60, 55, 100, 28);
               gC.fillStyle(0xe8e8ff, 0.5); gC.fillEllipse(55, 35, 50, 20);
               gC.generateTexture('cloud', 120, 70); gC.destroy();

               const gq = this.make.graphics({ x: 0, y: 0 }, false);
               gq.fillStyle(0xf8b800, 1); gq.fillRect(0, 0, 32, 32);
               gq.fillStyle(0xfc6400, 1); gq.fillRect(0, 0, 32, 3); gq.fillRect(0, 0, 3, 32);
               gq.fillStyle(0x7c4c00, 1); gq.fillRect(29, 0, 3, 32); gq.fillRect(0, 29, 32, 3);
               gq.fillStyle(0xffffff, 1); gq.fillRect(13, 5, 6, 3); gq.fillRect(19, 8, 3, 4); gq.fillRect(16, 12, 3, 3); gq.fillRect(16, 19, 3, 3); gq.fillRect(16, 23, 3, 3);
               gq.generateTexture('qblock', 32, 32); gq.clear();
               gq.fillStyle(0x7c5800, 1); gq.fillRect(0, 0, 32, 32);
               gq.fillStyle(0x9b7000, 1); gq.fillRect(2, 2, 28, 28);
               gq.generateTexture('qblock_empty', 32, 32); gq.destroy();

               const gB = this.make.graphics({ x: 0, y: 0 }, false);
               gB.fillStyle(0xc84c0c, 1); gB.fillRect(0, 0, 32, 32);
               gB.fillStyle(0xfc9838, 1); gB.fillRect(1, 1, 14, 6); gB.fillRect(17, 1, 14, 6); gB.fillRect(1, 17, 6, 6); gB.fillRect(9, 17, 14, 6); gB.fillRect(25, 17, 6, 6);
               gB.fillStyle(0x7c3800, 1); gB.fillRect(0, 8, 32, 2); gB.fillRect(0, 24, 32, 2); gB.fillRect(15, 0, 2, 8); gB.fillRect(7, 16, 2, 8); gB.fillRect(23, 16, 2, 8);
               gB.generateTexture('block', 32, 32); gB.destroy();

               const gFlag = this.make.graphics({ x: 0, y: 0 }, false);
               gFlag.fillStyle(0xffffff, 1); gFlag.fillRect(0, 0, 4, 160);
               gFlag.fillStyle(0x00cc00, 1); gFlag.fillRect(4, 0, 28, 20);
               gFlag.generateTexture('flag', 32, 160); gFlag.destroy();

               const gPB = this.make.graphics({ x: 0, y: 0 }, false);
               gPB.fillStyle(0x196419, 1); gPB.fillRect(0, 0, 32, 32);
               gPB.fillStyle(0x22a022, 1); gPB.fillRect(5, 0, 10, 32);
               gPB.fillStyle(0x0d3d0d, 1); gPB.fillRect(0, 0, 3, 32); gPB.fillRect(29, 0, 3, 32);
               gPB.generateTexture('pipe_body', 32, 32); gPB.destroy();

               const gPC = this.make.graphics({ x: 0, y: 0 }, false);
               gPC.fillStyle(0x196419, 1); gPC.fillRect(0, 0, 40, 18);
               gPC.fillStyle(0x22a022, 1); gPC.fillRect(6, 2, 12, 14);
               gPC.fillStyle(0x0d3d0d, 1); gPC.fillRect(0, 0, 3, 18); gPC.fillRect(37, 0, 3, 18);
               gPC.lineStyle(2, 0x0d3d0d, 1); gPC.strokeRect(0, 0, 40, 18);
               gPC.generateTexture('pipe_cap', 40, 18); gPC.destroy();

               const gHill = this.make.graphics({ x: 0, y: 0 }, false);
               gHill.fillStyle(0x3c8c3c, 1); gHill.fillEllipse(56, 44, 96, 64);
               gHill.fillStyle(0x52a852, 1); gHill.fillEllipse(44, 36, 56, 32);
               gHill.generateTexture('hill', 112, 64); gHill.destroy();

               const gCW = this.make.graphics({ x: 0, y: 0 }, false);
               gCW.fillStyle(0x9b5e30, 1); gCW.fillRect(0, 0, 32, 32);
               gCW.fillStyle(0x7a4520, 1); gCW.fillRect(0, 0, 14, 14); gCW.fillRect(18, 16, 14, 14);
               gCW.fillStyle(0x5a3010, 1); gCW.fillRect(0, 14, 32, 3); gCW.fillRect(14, 0, 4, 14); gCW.fillRect(0, 29, 32, 3); gCW.fillRect(14, 16, 4, 14);
               gCW.generateTexture('castle_wall', 32, 32); gCW.destroy();

               // Purple night theme textures for level 3
               const gPBlock = this.make.graphics({ x: 0, y: 0 }, false);
               gPBlock.fillStyle(0x2a1a6e, 1); gPBlock.fillRect(0, 0, 32, 32);
               gPBlock.fillStyle(0x3d2a8f, 1); gPBlock.fillRect(1, 1, 14, 6); gPBlock.fillRect(17, 1, 14, 6); gPBlock.fillRect(1, 17, 6, 6); gPBlock.fillRect(9, 17, 14, 6); gPBlock.fillRect(25, 17, 6, 6);
               gPBlock.fillStyle(0x1a0e4e, 1); gPBlock.fillRect(0, 8, 32, 2); gPBlock.fillRect(0, 24, 32, 2); gPBlock.fillRect(15, 0, 2, 8); gPBlock.fillRect(7, 16, 2, 8); gPBlock.fillRect(23, 16, 2, 8);
               gPBlock.generateTexture('purple_block', 32, 32); gPBlock.destroy();

               const gPPipeB = this.make.graphics({ x: 0, y: 0 }, false);
               gPPipeB.fillStyle(0x5c2d91, 1); gPPipeB.fillRect(0, 0, 32, 32);
               gPPipeB.fillStyle(0x7b3fbd, 1); gPPipeB.fillRect(5, 0, 10, 32);
               gPPipeB.fillStyle(0x3d1a6e, 1); gPPipeB.fillRect(0, 0, 3, 32); gPPipeB.fillRect(29, 0, 3, 32);
               gPPipeB.generateTexture('purple_pipe_body', 32, 32); gPPipeB.destroy();

               const gPPipeC = this.make.graphics({ x: 0, y: 0 }, false);
               gPPipeC.fillStyle(0x5c2d91, 1); gPPipeC.fillRect(0, 0, 40, 18);
               gPPipeC.fillStyle(0x7b3fbd, 1); gPPipeC.fillRect(6, 2, 12, 14);
               gPPipeC.fillStyle(0x3d1a6e, 1); gPPipeC.fillRect(0, 0, 3, 18); gPPipeC.fillRect(37, 0, 3, 18);
               gPPipeC.lineStyle(2, 0x3d1a6e, 1); gPPipeC.strokeRect(0, 0, 40, 18);
               gPPipeC.generateTexture('purple_pipe_cap', 40, 18); gPPipeC.destroy();

               const gPBush = this.make.graphics({ x: 0, y: 0 }, false);
               gPBush.fillStyle(0x2d1b4e, 1); gPBush.fillEllipse(60, 50, 120, 50); gPBush.fillEllipse(35, 45, 60, 40); gPBush.fillEllipse(90, 45, 70, 44);
               gPBush.fillStyle(0x3d2566, 1); gPBush.fillEllipse(50, 40, 50, 30); gPBush.fillEllipse(80, 42, 40, 26);
               gPBush.generateTexture('purple_bush', 120, 64); gPBush.destroy();

               const gStar = this.make.graphics({ x: 0, y: 0 }, false);
               gStar.fillStyle(0xffee00, 1);
               gStar.fillRect(4, 0, 2, 2); gStar.fillRect(0, 4, 10, 2); gStar.fillRect(2, 2, 6, 6); gStar.fillRect(4, 6, 2, 4);
               gStar.generateTexture('star', 10, 10); gStar.destroy();

               const gSmBlock = this.make.graphics({ x: 0, y: 0 }, false);
               gSmBlock.fillStyle(0x1a1a5e, 1); gSmBlock.fillRect(0, 0, 32, 32);
               gSmBlock.fillStyle(0x2a2a7e, 1); gSmBlock.fillRect(2, 2, 12, 12); gSmBlock.fillRect(18, 2, 12, 12); gSmBlock.fillRect(2, 18, 12, 12); gSmBlock.fillRect(18, 18, 12, 12);
               gSmBlock.fillStyle(0x0e0e3e, 1); gSmBlock.fillRect(0, 15, 32, 2); gSmBlock.fillRect(15, 0, 2, 32);
               gSmBlock.generateTexture('steel_block', 32, 32); gSmBlock.destroy();

               // Bullet Bill cannon texture
               const gCannon = this.make.graphics({ x: 0, y: 0 }, false);
               gCannon.fillStyle(0x111111, 1); gCannon.fillRect(0, 0, 32, 32);
               gCannon.fillStyle(0x333333, 1); gCannon.fillRect(2, 0, 28, 8);
               gCannon.fillStyle(0x222222, 1); gCannon.fillRect(4, 8, 24, 20);
               gCannon.fillStyle(0x444444, 1); gCannon.fillRect(6, 10, 20, 4);
               gCannon.fillStyle(0x111111, 1); gCannon.fillRect(0, 28, 32, 4);
               gCannon.generateTexture('cannon', 32, 32); gCannon.destroy();

               // Bullet Bill projectile texture
               const gBullet = this.make.graphics({ x: 0, y: 0 }, false);
               gBullet.fillStyle(0x111111, 1); gBullet.fillEllipse(12, 10, 24, 18);
               gBullet.fillStyle(0x333333, 1); gBullet.fillRect(0, 4, 8, 12);
               gBullet.fillStyle(0xffffff, 1); gBullet.fillCircle(18, 8, 3);
               gBullet.fillStyle(0x000000, 1); gBullet.fillCircle(18, 8, 1.5);
               gBullet.generateTexture('bullet_bill', 24, 20); gBullet.destroy();

               // Hammer Brother texture
               const gHB = this.make.graphics({ x: 0, y: 0 }, false);
               gHB.fillStyle(0x228b22, 1); gHB.fillEllipse(16, 22, 22, 20);
               gHB.fillStyle(0x32cd32, 1); gHB.fillEllipse(14, 18, 14, 12);
               gHB.fillStyle(0xfff44f, 1); gHB.fillEllipse(16, 8, 16, 14);
               gHB.fillStyle(0xffffff, 1); gHB.fillCircle(12, 6, 3); gHB.fillCircle(20, 6, 3);
               gHB.fillStyle(0x000000, 1); gHB.fillCircle(12, 6, 1.5); gHB.fillCircle(20, 6, 1.5);
               gHB.fillStyle(0xffffff, 1); gHB.fillRect(0, 0, 6, 3); gHB.fillRect(4, 0, 3, 8);
               gHB.fillStyle(0x8b4513, 1); gHB.fillRect(2, 8, 3, 10);
               gHB.generateTexture('hammer_bro', 32, 32); gHB.destroy();

               // Hammer projectile
               const gHammer = this.make.graphics({ x: 0, y: 0 }, false);
               gHammer.fillStyle(0x8b4513, 1); gHammer.fillRect(6, 4, 4, 14);
               gHammer.fillStyle(0x666666, 1); gHammer.fillRect(2, 0, 12, 6);
               gHammer.generateTexture('hammer', 16, 18); gHammer.destroy();

               // Level 4 textures - Sky platform level
               const gMushPlat = this.make.graphics({ x: 0, y: 0 }, false);
               // Flat green platform with rounded ends and dark spots (like the screenshot)
               gMushPlat.fillStyle(0x228b22, 1); gMushPlat.fillRect(10, 4, 108, 16);
               gMushPlat.fillStyle(0x228b22, 1); gMushPlat.fillEllipse(10, 12, 20, 16); gMushPlat.fillEllipse(118, 12, 20, 16);
               gMushPlat.fillStyle(0x32cd32, 1); gMushPlat.fillRect(10, 2, 108, 8);
               gMushPlat.fillStyle(0x145214, 1); gMushPlat.fillCircle(24, 12, 5); gMushPlat.fillCircle(48, 14, 6); gMushPlat.fillCircle(72, 12, 5); gMushPlat.fillCircle(96, 14, 6); gMushPlat.fillCircle(112, 12, 4);
               gMushPlat.fillStyle(0x3cb03c, 1); gMushPlat.fillRect(10, 0, 108, 3);
               gMushPlat.generateTexture('mush_platform', 128, 20); gMushPlat.destroy();

               const gMushStem = this.make.graphics({ x: 0, y: 0 }, false);
               gMushStem.fillStyle(0x196419, 1); gMushStem.fillRect(0, 0, 20, 64);
               gMushStem.fillStyle(0x22a022, 1); gMushStem.fillRect(4, 0, 8, 64);
               gMushStem.fillStyle(0x0d3d0d, 1); gMushStem.fillRect(0, 0, 2, 64); gMushStem.fillRect(18, 0, 2, 64);
               gMushStem.generateTexture('mush_stem', 20, 64); gMushStem.destroy();

               const gStoneWall = this.make.graphics({ x: 0, y: 0 }, false);
               gStoneWall.fillStyle(0x8b7355, 1); gStoneWall.fillRect(0, 0, 32, 32);
               gStoneWall.fillStyle(0xa08c60, 1); gStoneWall.fillRect(1, 1, 14, 10); gStoneWall.fillRect(17, 1, 14, 10); gStoneWall.fillRect(1, 13, 8, 8); gStoneWall.fillRect(11, 13, 10, 8); gStoneWall.fillRect(23, 13, 8, 8); gStoneWall.fillRect(1, 23, 14, 8); gStoneWall.fillRect(17, 23, 14, 8);
               gStoneWall.fillStyle(0x6b5535, 1); gStoneWall.fillRect(0, 11, 32, 2); gStoneWall.fillRect(0, 21, 32, 2); gStoneWall.fillRect(15, 0, 2, 11); gStoneWall.fillRect(9, 11, 2, 10); gStoneWall.fillRect(21, 11, 2, 10); gStoneWall.fillRect(15, 21, 2, 11);
               gStoneWall.generateTexture('stone_wall', 32, 32); gStoneWall.destroy();

               // Level 5 textures - Lava/Boss level
               const gLavaBlock = this.make.graphics({ x: 0, y: 0 }, false);
               gLavaBlock.fillStyle(0x4a1a0a, 1); gLavaBlock.fillRect(0, 0, 32, 32);
               gLavaBlock.fillStyle(0x6b2a10, 1); gLavaBlock.fillRect(1, 1, 14, 14); gLavaBlock.fillRect(17, 17, 14, 14);
               gLavaBlock.fillStyle(0x3a0a00, 1); gLavaBlock.fillRect(0, 15, 32, 2); gLavaBlock.fillRect(15, 0, 2, 32);
               gLavaBlock.generateTexture('lava_block', 32, 32); gLavaBlock.destroy();

               const gLava = this.make.graphics({ x: 0, y: 0 }, false);
               gLava.fillStyle(0xff4400, 1); gLava.fillRect(0, 0, 64, 32);
               gLava.fillStyle(0xff6600, 1); gLava.fillRect(0, 0, 64, 8);
               gLava.fillStyle(0xffaa00, 1); gLava.fillRect(5, 0, 12, 4); gLava.fillRect(30, 0, 16, 5); gLava.fillRect(52, 0, 10, 3);
               gLava.fillStyle(0xcc2200, 1); gLava.fillRect(0, 20, 64, 12);
               gLava.generateTexture('lava', 64, 32); gLava.destroy();

               const gBowser = this.make.graphics({ x: 0, y: 0 }, false);
               gBowser.fillStyle(0x228b22, 1); gBowser.fillEllipse(32, 36, 48, 40);
               gBowser.fillStyle(0x32cd32, 1); gBowser.fillEllipse(28, 30, 30, 24);
               gBowser.fillStyle(0xfff44f, 1); gBowser.fillEllipse(32, 16, 28, 24);
               gBowser.fillStyle(0xffffff, 1); gBowser.fillCircle(24, 12, 5); gBowser.fillCircle(40, 12, 5);
               gBowser.fillStyle(0xff0000, 1); gBowser.fillCircle(24, 12, 3); gBowser.fillCircle(40, 12, 3);
               gBowser.fillStyle(0x8b4513, 1); gBowser.fillEllipse(32, 40, 40, 30);
               gBowser.fillStyle(0xa0522d, 1); gBowser.fillRect(16, 32, 8, 4); gBowser.fillRect(28, 28, 8, 4); gBowser.fillRect(40, 32, 8, 4);
               gBowser.fillStyle(0xff4500, 1); gBowser.fillRect(20, 4, 4, 8); gBowser.fillRect(28, 2, 4, 8); gBowser.fillRect(36, 4, 4, 8); gBowser.fillRect(44, 6, 4, 6);
               gBowser.fillStyle(0x228b22, 1); gBowser.fillEllipse(16, 52, 14, 10); gBowser.fillEllipse(48, 52, 14, 10);
               gBowser.generateTexture('bowser', 64, 60); gBowser.destroy();

               const gFireBreath = this.make.graphics({ x: 0, y: 0 }, false);
               gFireBreath.fillStyle(0xff4400, 1); gFireBreath.fillEllipse(16, 10, 32, 16);
               gFireBreath.fillStyle(0xff8800, 1); gFireBreath.fillEllipse(12, 10, 20, 10);
               gFireBreath.fillStyle(0xffcc00, 1); gFireBreath.fillEllipse(8, 10, 10, 6);
               gFireBreath.generateTexture('fire_breath', 32, 20); gFireBreath.destroy();

               const gM = this.make.graphics({ x: 0, y: 0 }, false);
               gM.fillStyle(0xffdab9, 1); gM.fillRect(6, 16, 12, 10); gM.fillStyle(0xeec090, 1); gM.fillRect(6, 22, 12, 4);
               gM.fillStyle(0xcc0000, 1); gM.fillEllipse(12, 12, 24, 18); gM.fillRect(4, 12, 16, 8);
               gM.fillStyle(0xffffff, 1); gM.fillCircle(7, 10, 3); gM.fillCircle(17, 8, 3); gM.fillCircle(13, 14, 2);
               gM.fillStyle(0xffdab9, 1); gM.fillRect(6, 17, 4, 4); gM.fillRect(14, 17, 4, 4);
               gM.fillStyle(0x000000, 1); gM.fillRect(7, 18, 2, 2); gM.fillRect(15, 18, 2, 2);
               gM.generateTexture('mushroom', 24, 26); gM.destroy();

               // Green 1-up mushroom
               const gM1 = this.make.graphics({ x: 0, y: 0 }, false);
               gM1.fillStyle(0xffdab9, 1); gM1.fillRect(6, 16, 12, 10); gM1.fillStyle(0xeec090, 1); gM1.fillRect(6, 22, 12, 4);
               gM1.fillStyle(0x00aa00, 1); gM1.fillEllipse(12, 12, 24, 18); gM1.fillRect(4, 12, 16, 8);
               gM1.fillStyle(0xffffff, 1); gM1.fillCircle(7, 10, 3); gM1.fillCircle(17, 8, 3); gM1.fillCircle(13, 14, 2);
               gM1.fillStyle(0xffdab9, 1); gM1.fillRect(6, 17, 4, 4); gM1.fillRect(14, 17, 4, 4);
               gM1.fillStyle(0x000000, 1); gM1.fillRect(7, 18, 2, 2); gM1.fillRect(15, 18, 2, 2);
               gM1.generateTexture('mushroom_1up', 24, 26); gM1.destroy();

               // Collectible coin texture
               const gCoin = this.make.graphics({ x: 0, y: 0 }, false);
               gCoin.fillStyle(0xff8c00, 1); gCoin.fillEllipse(10, 12, 16, 20);
               gCoin.fillStyle(0xffcc00, 1); gCoin.fillEllipse(10, 12, 10, 16);
               gCoin.fillStyle(0xffffff, 0.4); gCoin.fillEllipse(8, 9, 4, 8);
               gCoin.generateTexture('coin', 20, 24); gCoin.destroy();

               const gPP = this.make.graphics({ x: 0, y: 0 }, false);
               gPP.fillStyle(0x228b22, 1); gPP.fillRect(9, 16, 6, 16);
               gPP.fillStyle(0xcc0000, 1); gPP.fillEllipse(12, 12, 24, 22);
               gPP.fillStyle(0xffffff, 1); gPP.fillRect(2, 12, 20, 5);
               gPP.fillStyle(0xcc0000, 1); gPP.fillRect(5, 12, 3, 4); gPP.fillRect(11, 12, 3, 4); gPP.fillRect(17, 12, 3, 4);
               gPP.fillStyle(0xffffff, 1); gPP.fillCircle(7, 7, 4); gPP.fillCircle(17, 7, 4);
               gPP.fillStyle(0x000000, 1); gPP.fillCircle(8, 7, 2); gPP.fillCircle(18, 7, 2);
               gPP.fillStyle(0xff6666, 1); gPP.fillCircle(5, 4, 2); gPP.fillCircle(19, 4, 2);
               gPP.generateTexture('piranha', 24, 32); gPP.destroy();

               const gK = this.make.graphics({ x: 0, y: 0 }, false);
               gK.fillStyle(0x228b22, 1); gK.fillEllipse(16, 18, 26, 22);
               gK.fillStyle(0x32cd32, 1); gK.fillEllipse(14, 15, 16, 12);
               gK.lineStyle(1, 0x145214, 1); gK.strokeEllipse(16, 18, 26, 22); gK.lineBetween(16, 7, 16, 29); gK.lineBetween(5, 12, 27, 24);
               gK.fillStyle(0xfff44f, 1); gK.fillEllipse(16, 5, 14, 12);
               gK.fillStyle(0xffffff, 1); gK.fillCircle(13, 4, 2); gK.fillCircle(19, 4, 2);
               gK.fillStyle(0x000000, 1); gK.fillCircle(13, 4, 1); gK.fillCircle(19, 4, 1);
               gK.fillStyle(0xfff44f, 1); gK.fillEllipse(9, 29, 10, 6); gK.fillEllipse(23, 29, 10, 6);
               gK.generateTexture('koopa', 32, 32); gK.destroy();

               this.drawPlayer('p1_run1', 0xd50000, 'run1'); this.drawPlayer('p1_run2', 0xd50000, 'run2'); this.drawPlayer('p1_jump', 0xd50000, 'jump'); this.drawPlayer('p1_crouch', 0xd50000, 'crouch');
               this.drawPrincess('p2_run1', 'run1'); this.drawPrincess('p2_run2', 'run2'); this.drawPrincess('p2_jump', 'jump'); this.drawPrincess('p2_crouch', 'crouch');
               this.anims.create({ key: 'p1_run', frames: [{ key: 'p1_run1' }, { key: 'p1_run2' }], frameRate: 10, repeat: -1 });
               this.anims.create({ key: 'p2_run', frames: [{ key: 'p2_run1' }, { key: 'p2_run2' }], frameRate: 10, repeat: -1 });
            }

            create() {
               this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
               this.physics.world.setBounds(0, 0, 10000, 480);
               this.cameraCenter = this.add.rectangle(400, 240, 10, 10, 0, 0);
               this.cameras.main.startFollow(this.cameraCenter, false, 0.1, 0.1);
               this.cameras.main.setBounds(0, 0, 10000, 480);
               this.add.rectangle(5000, 240, 10000, 480, 0x5c94fc).setDepth(-10);

               this.createTextures();

               this.blocks = this.physics.add.staticGroup();
               this.qBlocks = this.physics.add.staticGroup();
               this.obstacles = this.physics.add.staticGroup();
               this.enemies = this.physics.add.group();
               this.fireballs = this.physics.add.group();
               this.mushrooms = this.physics.add.group({ allowGravity: true });
               this.piranhas = this.physics.add.group({ allowGravity: false });
               this.movingPlatforms = this.physics.add.group({ immovable: true, allowGravity: false });
               this.flags = this.physics.add.staticGroup();
               this.coins = this.physics.add.group({ allowGravity: false });

               this.clouds = this.add.group();
               const cloudSpeeds = [20, 30, 15, 25, 18, 35, 22];
               for (let ci = 0; ci < 40; ci++) {
                  const cx = Phaser.Math.Between(0, 9800); const cy = Phaser.Math.Between(40, 200); const sc = Phaser.Math.FloatBetween(0.6, 1.4);
                  const cloud = this.add.image(cx, cy, 'cloud').setScrollFactor(0.2).setScale(sc).setDepth(-5).setAlpha(Phaser.Math.FloatBetween(0.7, 1));
                  cloud.setData('speed', cloudSpeeds[ci % cloudSpeeds.length]); cloud.setData('baseX', cx);
                  this.clouds.add(cloud);
               }

               this.p1 = this.physics.add.sprite(150, 360, 'p1_run1');
               this.p2 = this.physics.add.sprite(80, 360, 'p2_run1');
               this.p1.setBodySize(18, 28); this.p1.setOffset(4, 6);
               this.p2.setBodySize(18, 28); this.p2.setOffset(4, 6);
               this.p1.setCollideWorldBounds(true); this.p2.setCollideWorldBounds(true);
               this.p1.setDepth(10); this.p2.setDepth(10);

               this.physics.add.collider(this.p1, this.blocks, this.hitBlock as any, undefined, this);
               this.physics.add.collider(this.p2, this.blocks, this.hitBlock as any, undefined, this);
               this.physics.add.collider(this.enemies, this.blocks);
               this.physics.add.collider(this.p1, this.movingPlatforms); this.physics.add.collider(this.p2, this.movingPlatforms);
               this.physics.add.collider(this.p1, this.qBlocks, this.hitQBlock as any, undefined, this);
               this.physics.add.collider(this.p2, this.qBlocks, this.hitQBlock as any, undefined, this);
               this.physics.add.collider(this.mushrooms, this.blocks);
               this.physics.add.overlap(this.p1, this.mushrooms, this.collectMushroom as any, undefined, this);
               this.physics.add.overlap(this.p2, this.mushrooms, this.collectMushroom as any, undefined, this);
               this.physics.add.overlap(this.p1, this.piranhas, () => this.takeDamage(this.p1), undefined, this);
               this.physics.add.overlap(this.p2, this.piranhas, () => this.takeDamage(this.p2), undefined, this);
               this.physics.add.overlap(this.p1, this.enemies, this.hitEnemy as any, undefined, this);
               this.physics.add.overlap(this.p2, this.enemies, this.hitEnemy as any, undefined, this);
               this.physics.add.overlap(this.p1, this.fireballs, () => this.takeDamage(this.p1), undefined, this);
               this.physics.add.overlap(this.p2, this.fireballs, () => this.takeDamage(this.p2), undefined, this);
               this.physics.add.overlap(this.p1, this.obstacles, () => this.takeDamage(this.p1), undefined, this);
               this.physics.add.overlap(this.p2, this.obstacles, () => this.takeDamage(this.p2), undefined, this);
               this.physics.add.overlap(this.p1, this.flags, this.touchFlag as any, undefined, this);
               this.physics.add.overlap(this.p2, this.flags, this.touchFlag as any, undefined, this);
               this.physics.add.overlap(this.p1, this.coins, this.collectCoin as any, undefined, this);
               this.physics.add.overlap(this.p2, this.coins, this.collectCoin as any, undefined, this);

               this.myPlayer = role === 'p1' ? this.p1 : this.p2;
               this.otherPlayer = role === 'p1' ? this.p2 : this.p1;
               this.cursors = this.input.keyboard!.createCursorKeys();
               this.keyW = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W);
               this.keyA = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A);
               this.keyS = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S);
               this.keyD = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D);

               this.uiText = this.add.text(20, 20, '', { fontSize: '24px', color: '#fff', stroke: '#000', strokeThickness: 4 }).setScrollFactor(0);
               this.countdownText = this.add.text(400, 200, '', { fontSize: '80px', color: '#ffe600', stroke: '#000', strokeThickness: 8, fontStyle: 'bold' }).setOrigin(0.5).setScrollFactor(0).setDepth(20).setAlpha(0);

               socket.emit('join', role);
               socket.on('init', (data: any) => {
                  if (data.currentLevel) {
                     this.level = data.currentLevel;
                     this.generateLevel(this.level);
                  }
                  if (data.state) {
                     const opRole = role === 'p1' ? 'p2' : 'p1';
                     if (data.state[opRole]) { this.otherPlayer.setX(data.state[opRole].x); this.otherPlayer.setY(data.state[opRole].y); }
                  }
               });

               socket.on('stateUpdate', (st: any) => {
                  if (this.countingDown) return;
                  const opRole = role === 'p1' ? 'p2' : 'p1';
                  if (st[opRole]) {
                     this.otherPlayer.setX(st[opRole].x); this.otherPlayer.setY(st[opRole].y);
                     this.otherPlayer.setFlipX(st[opRole].flipX); this.otherPlayer.setScale(st[opRole].scale || 1);
                     if (st[opRole].anim === 'crouch') { this.otherPlayer.setBodySize(18, 16); this.otherPlayer.setOffset(4, 18); }
                     else { this.otherPlayer.setBodySize(18, 28); this.otherPlayer.setOffset(4, 6); }
                     if (st[opRole].anim === 'run') { if (!this.otherPlayer.anims.isPlaying) this.otherPlayer.play(`${opRole}_run`); }
                     else { this.otherPlayer.anims.stop(); this.otherPlayer.setTexture(`${opRole}_${st[opRole].anim}`); }
                  }
               });

               socket.on('playerFinished', (finRole: string) => {
                  this.finishedSet.add(finRole);
                  if (finRole === role) { this.waitingForOther = true; this.playAudio(523, 'square', 0.15); setTimeout(() => this.playAudio(659, 'square', 0.15), 150); setTimeout(() => this.playAudio(784, 'square', 0.2), 300); }
               });

               socket.on('startCountdown', (nextLvl: number) => {
                  this.countingDown = true; this.gameWon = true; let tick = 10;
                  const countNotes = [220, 247, 262, 294, 330, 349, 392, 440, 494, 523];
                  const doTick = () => {
                     if (tick <= 0) {
                        this.playAudio(784, 'square', 0.1); setTimeout(() => this.playAudio(880, 'square', 0.1), 100); setTimeout(() => this.playAudio(988, 'square', 0.1), 200); setTimeout(() => this.playAudio(1047, 'square', 0.3), 300);
                        this.tweens.add({ targets: this.countdownText, alpha: 0, duration: 400, onComplete: () => {
                           this.countdownText.setAlpha(0); this.countingDown = false; this.waitingForOther = false; this.finishedSet.clear(); this.level = nextLvl; this.gameWon = false;
                           this.p1.setPosition(150, 360); this.p1.setVelocity(0, 0); this.p2.setPosition(80, 360); this.p2.setVelocity(0, 0);
                           this.cameraCenter.setPosition(400, 240); this.cameras.main.scrollX = 0;
                           this.generateLevel(this.level);
                        }});
                        return;
                     }
                     this.playAudio(countNotes[10 - tick], 'square', 0.18); this.playAudio(80, 'sawtooth', 0.15);
                     if (tick <= 3) this.playAudio(countNotes[10 - tick] * 2, 'sine', 0.1);
                     this.countdownText.setText(`${tick}`); this.countdownText.setAlpha(1); this.tweens.add({ targets: this.countdownText, scaleX: 1.4, scaleY: 1.4, duration: 200, yoyo: true });
                     tick--; this.time.delayedCall(1000, doTick);
                  };
                  this.countdownText.setText('BOTH MADE IT! \uD83C\uDF89'); this.countdownText.setAlpha(1); this.time.delayedCall(1200, () => doTick());
               });

               socket.on('loadLevel', (lvl: number) => { this.level = lvl; this.gameWon = false; this.generateLevel(this.level); });
               socket.on('gameOver', () => { this.gameOver = true; });

               this.startBGM();
               this.generateLevel(this.level);
            }

            generateLevel(lvl: number) {
               this.blocks.clear(true, true); this.obstacles.clear(true, true); this.enemies.clear(true, true); this.qBlocks.clear(true, true); this.flags.clear(true, true); this.fireballs.clear(true, true); this.movingPlatforms.clear(true, true); this.mushrooms?.clear(true, true); this.piranhas?.clear(true, true); this.coins?.clear(true, true);
               this.children.list.filter((c: any) => c.getData && c.getData('decoration')).forEach((c: any) => c.destroy());

               const B = 32; const GY = 440; const GY2 = 472; const eSpeed = 55 + lvl * 12;

               const addPipe = (px: number, segs: number, piranha = false) => {
                  for (let s = 0; s < segs - 1; s++) (this.blocks.create(px, GY - B * (s + 1), 'pipe_body') as Phaser.Physics.Arcade.Sprite).setDepth(2);
                  (this.blocks.create(px, GY - B * segs + 7, 'pipe_cap') as Phaser.Physics.Arcade.Sprite).setDepth(2);
                  if (piranha) {
                     const topY = GY - B * segs - 20; const hiddenY = GY - B * (segs - 1) + 4;
                     const pl = this.piranhas.create(px, hiddenY, 'piranha') as Phaser.Physics.Arcade.Sprite;
                     (pl.body as any).allowGravity = false; pl.setDepth(1);
                     this.tweens.add({ targets: pl, y: topY, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: Phaser.Math.Between(0, 900) });
                  }
               };
               const addGoomba = (ex: number, ey = GY - B) => { const en = this.enemies.create(ex, ey, 'enemy') as Phaser.Physics.Arcade.Sprite; (en.body as any).allowGravity = true; en.setVelocityX(-eSpeed); en.setData('dir', -eSpeed); (en.body as any).setBounceX(1); };
               const addKoopa = (ex: number, ey = GY - B) => { const kp = this.enemies.create(ex, ey, 'koopa') as Phaser.Physics.Arcade.Sprite; (kp.body as any).allowGravity = true; kp.setVelocityX(-eSpeed * 0.8); kp.setData('dir', -eSpeed * 0.8); (kp.body as any).setBounceX(1); };
               const addMovPlat = (px: number, py: number, spd: number, range = 90) => { const pl = this.movingPlatforms.create(px, py, 'movingPlat') as Phaser.Physics.Arcade.Sprite; pl.setData('originX', px); pl.setData('speed', spd); pl.setData('range', range); (pl.body as any).allowGravity = false; (pl.body as any).immovable = true; };
               const buildCastle = (cx: number) => { for (let col = 0; col < 5; col++) for (let row = 0; row < 4; row++) this.blocks.create(cx + col * B + B / 2, GY - row * B, 'castle_wall'); for (let row = 4; row < 7; row++) { this.blocks.create(cx + B / 2, GY - row * B, 'castle_wall'); this.blocks.create(cx + 4 * B + B / 2, GY - row * B, 'castle_wall'); } };
               const buildStairs = (startX: number, tex = 'block') => { for (let step = 0; step < 8; step++) { const sx = startX + step * B; for (let row = 0; row <= step; row++) this.blocks.create(sx + B / 2, GY - row * B, tex); } };

               if (lvl === 1) {
                  this.add.rectangle(5000, 240, 10000, 480, 0x5c94fc).setDepth(-10).setData('decoration', true);
                  [[180, 1], [500, 1.4], [1900, 1], [3600, 1.2], [5600, 0.9]].forEach(([hx, sc]) => this.add.image(hx as number, GY - 22, 'hill').setScale(sc as number).setDepth(-3).setData('decoration', true));
                  for (let x = 0; x < 8500; x += B) { this.blocks.create(x + B / 2, GY, 'block'); this.blocks.create(x + B / 2, GY2, 'block'); }
                  addPipe(480, 2); addPipe(1260, 3); addPipe(2300, 2);
                  const BH = GY - 4 * B; [736, 800, 864, 928].forEach((bx, i) => { if (i === 1 || i === 2) { const qb = this.qBlocks.create(bx, BH, 'qblock'); qb.setData('active', true); } else this.blocks.create(bx, BH, 'block'); });
                  [1600, 1664, 1728].forEach(bx => { const qb = this.qBlocks.create(bx, GY - 5 * B, 'qblock'); qb.setData('active', true); });
                  this.blocks.create(1792, GY - 5 * B, 'block');
                  [2976, 3040, 3104, 3168].forEach((bx, i) => { if (i % 2 === 0) this.blocks.create(bx, GY - 5 * B, 'block'); else { const qb = this.qBlocks.create(bx, GY - 5 * B, 'qblock'); qb.setData('active', true); } });
                  addMovPlat(2600, 340, 60); addMovPlat(4400, 300, -60);
                  [900, 1500, 2150, 3700, 4600, 5300].forEach(ex => addGoomba(ex));
                  // Coins
                  [[400, GY - 3 * B], [464, GY - 3 * B], [528, GY - 3 * B], [1000, GY - 6 * B], [1064, GY - 6 * B], [1700, GY - 3 * B], [1764, GY - 3 * B], [2500, GY - 4 * B], [2564, GY - 4 * B], [2628, GY - 4 * B], [3500, GY - 3 * B], [3564, GY - 3 * B], [4200, GY - 4 * B], [4264, GY - 4 * B], [5000, GY - 3 * B], [5064, GY - 3 * B]].forEach(([cx, cy]) => { const coin = this.coins.create(cx as number, cy as number, 'coin') as Phaser.Physics.Arcade.Sprite; (coin.body as any).allowGravity = false; this.tweens.add({ targets: coin, y: (cy as number) - 6, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }); });
                  buildStairs(6464); this.flags.create(6960, GY - 192, 'flag'); buildCastle(7400);
               } else if (lvl === 2) {
                  this.add.rectangle(5000, 240, 10000, 480, 0x000018).setDepth(-10).setData('decoration', true);
                  for (let x = 0; x < 8500; x += B) { this.blocks.create(x + B / 2, 16, 'block'); this.blocks.create(x + B / 2, 48, 'block'); }
                  for (let x = 0; x < 8500; x += B) { if (!(x >= 2600 && x < 2600 + B * 4)) { this.blocks.create(x + B / 2, GY, 'block'); this.blocks.create(x + B / 2, GY2, 'block'); } }
                  addPipe(380, 3, true); addPipe(760, 2, true); addPipe(1380, 4, true); addPipe(2000, 3, false); addPipe(3200, 3, true); addPipe(4100, 4, true); addPipe(5000, 3, true); addPipe(5800, 2, true);
                  [[640, GY - 3 * B, 4], [1100, GY - 5 * B, 3], [1900, GY - 4 * B, 4], [3000, GY - 4 * B, 3], [3700, GY - 6 * B, 4], [4600, GY - 3 * B, 3]].forEach(([bx, by, len]) => { for (let i = 0; i < (len as number); i++) this.blocks.create((bx as number) + i * B, by as number, 'block'); });
                  [900, 1200, 2900, 4000].forEach(bx => { const qb = this.qBlocks.create(bx, GY - 5 * B, 'qblock'); qb.setData('active', true); });
                  addMovPlat(2900, 310, 70, 100); addMovPlat(4900, 330, -70, 100);
                  [650, 1150, 1950, 3100, 3750, 4300, 5200, 5850].forEach((ex, i) => i % 2 === 0 ? addGoomba(ex) : addKoopa(ex));
                  // Coins
                  [[500, GY - 4 * B], [564, GY - 4 * B], [1000, GY - 6 * B], [1064, GY - 6 * B], [1128, GY - 6 * B], [1800, GY - 5 * B], [1864, GY - 5 * B], [2800, GY - 3 * B], [2864, GY - 3 * B], [3500, GY - 5 * B], [3564, GY - 5 * B], [3628, GY - 5 * B], [4500, GY - 4 * B], [4564, GY - 4 * B], [5500, GY - 3 * B], [5564, GY - 3 * B]].forEach(([cx, cy]) => { const coin = this.coins.create(cx as number, cy as number, 'coin') as Phaser.Physics.Arcade.Sprite; (coin.body as any).allowGravity = false; this.tweens.add({ targets: coin, y: (cy as number) - 6, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }); });
                  buildStairs(6464, 'castle_wall'); this.flags.create(6960, GY - 192, 'flag'); buildCastle(7400);
               } else if (lvl === 3) {
                  // Mario Forever World 3 style - Purple Night Theme
                  // Gradient sky background
                  const skyG = this.make.graphics({ x: 0, y: 0 }, false);
                  const gradColors = [0x3a3a5c, 0x3e3e62, 0x424268, 0x46466e, 0x4a4a74, 0x4e4e7a, 0x525280, 0x565686, 0x5a5a8c, 0x5e5e92, 0x626298, 0x66669e];
                  gradColors.forEach((col, i) => { skyG.fillStyle(col, 1); skyG.fillRect(0, i * 40, 10000, 40); });
                  skyG.generateTexture('lvl3_sky', 10000, 480); skyG.destroy();
                  this.add.image(5000, 240, 'lvl3_sky').setDepth(-10).setData('decoration', true);

                  // Dark purple bush silhouettes (two layers for depth like the screenshot)
                  [[80, 1.3], [400, 1.0], [800, 1.5], [1300, 1.1], [1800, 1.4], [2400, 0.9], [3000, 1.3], [3500, 1.0], [4100, 1.5], [4700, 1.1], [5300, 1.3], [5900, 1.0], [6500, 1.4], [7100, 0.9]].forEach(([bx, sc]) => this.add.image(bx as number, GY - 16, 'purple_bush').setScale(sc as number).setDepth(-3).setData('decoration', true));
                  [[300, 0.7], [1000, 0.8], [2000, 0.7], [3200, 0.8], [4400, 0.7], [5600, 0.8], [6800, 0.7]].forEach(([bx, sc]) => this.add.image(bx as number, GY - 55, 'purple_bush').setScale(sc as number).setAlpha(0.5).setDepth(-4).setData('decoration', true));

                  // Yellow stars on the ground (like Mario Forever)
                  [60, 500, 1100, 1600, 2500, 3300, 4500, 5400, 6000, 6800].forEach(sx => this.add.image(sx, GY - 6, 'star').setScale(1.5).setDepth(-1).setData('decoration', true));
                  // Twinkling stars in sky
                  for (let si = 0; si < 25; si++) { const sx = Phaser.Math.Between(0, 9800); const sy = Phaser.Math.Between(20, 180); const star = this.add.image(sx, sy, 'star').setScale(Phaser.Math.FloatBetween(0.4, 1.0)).setAlpha(Phaser.Math.FloatBetween(0.3, 0.8)).setDepth(-5).setData('decoration', true); this.tweens.add({ targets: star, alpha: 0.1, duration: Phaser.Math.Between(1000, 2500), yoyo: true, repeat: -1, delay: Phaser.Math.Between(0, 2000) }); }

                  // Ground - purple blocks with pits
                  const pits: [number, number][] = [[1700, 1700 + B * 3], [3100, 3100 + B * 3], [4500, 4500 + B * 4], [5800, 5800 + B * 3]];
                  for (let x = 0; x < 8500; x += B) { if (!pits.some(([s, e]) => x >= s && x < e)) { this.blocks.create(x + B / 2, GY, 'purple_block'); this.blocks.create(x + B / 2, GY2, 'purple_block'); } }

                  // Purple pipes with piranhas
                  const addPurplePipe = (px: number, segs: number, piranha = false) => {
                     for (let s = 0; s < segs - 1; s++) (this.blocks.create(px, GY - B * (s + 1), 'purple_pipe_body') as Phaser.Physics.Arcade.Sprite).setDepth(2);
                     (this.blocks.create(px, GY - B * segs + 7, 'purple_pipe_cap') as Phaser.Physics.Arcade.Sprite).setDepth(2);
                     if (piranha) {
                        const topY = GY - B * segs - 20; const hiddenY = GY - B * (segs - 1) + 4;
                        const pl = this.piranhas.create(px, hiddenY, 'piranha') as Phaser.Physics.Arcade.Sprite;
                        (pl.body as any).allowGravity = false; pl.setDepth(1);
                        this.tweens.add({ targets: pl, y: topY, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: Phaser.Math.Between(0, 900) });
                     }
                  };
                  addPurplePipe(350, 2, true); addPurplePipe(900, 3, true); addPurplePipe(2000, 4, true); addPurplePipe(3600, 3, true); addPurplePipe(5200, 3, true); addPurplePipe(6100, 2, true);

                  // Bullet Bill Cannons (stacked black cannons that shoot bullets)
                  const addCannon = (cx: number, height: number) => {
                     for (let h = 0; h < height; h++) this.blocks.create(cx, GY - B * (h + 1) + B / 2, 'cannon');
                     // Spawn bullet bills periodically from this cannon
                     const cannonTop = GY - B * height;
                     this.time.addEvent({ delay: 2500 + Phaser.Math.Between(0, 1000), loop: true, callback: () => {
                        if (this.gameOver || this.gameWon || this.countingDown) return;
                        const bullet = this.enemies.create(cx - 20, cannonTop - 10, 'bullet_bill') as Phaser.Physics.Arcade.Sprite;
                        (bullet.body as any).allowGravity = false;
                        bullet.setVelocityX(-180);
                        bullet.setData('dir', -180);
                        this.time.delayedCall(5000, () => { if (bullet && bullet.active) bullet.destroy(); });
                     }});
                  };
                  addCannon(1400, 2); addCannon(2700, 2); addCannon(3900, 3); addCannon(5500, 2); addCannon(6400, 2);

                  // Hammer Brothers (enemies that jump and throw hammers)
                  const addHammerBro = (hx: number, hy: number) => {
                     const hb = this.enemies.create(hx, hy, 'hammer_bro') as Phaser.Physics.Arcade.Sprite;
                     (hb.body as any).allowGravity = true;
                     hb.setVelocityX(40); hb.setData('dir', 40); (hb.body as any).setBounceX(1);
                     // Jump periodically
                     this.time.addEvent({ delay: 1800 + Phaser.Math.Between(0, 800), loop: true, callback: () => {
                        if (!hb.active || this.gameOver) return;
                        hb.setVelocityY(-350);
                     }});
                     // Throw hammers
                     this.time.addEvent({ delay: 1200 + Phaser.Math.Between(0, 600), loop: true, callback: () => {
                        if (!hb.active || this.gameOver || this.gameWon) return;
                        const hammer = this.enemies.create(hb.x, hb.y - 16, 'hammer') as Phaser.Physics.Arcade.Sprite;
                        (hammer.body as any).allowGravity = true;
                        hammer.setVelocityX(hb.flipX ? 120 : -120);
                        hammer.setVelocityY(-300);
                        this.tweens.add({ targets: hammer, angle: 360, duration: 400, repeat: -1 });
                        this.time.delayedCall(3000, () => { if (hammer && hammer.active) hammer.destroy(); });
                     }});
                  };
                  addHammerBro(1900, GY - B * 2); addHammerBro(4200, GY - B * 2); addHammerBro(5900, GY - B * 2);

                  // Floating block platforms with ? blocks and steel blocks (like the screenshot)
                  // Section 1: blocks + ? blocks near start
                  [480, 512, 544, 576, 608, 640, 672].forEach((bx, i) => {
                     if (i === 2 || i === 3) { const qb = this.qBlocks.create(bx, GY - 4 * B, 'qblock'); qb.setData('active', true); }
                     else this.blocks.create(bx, GY - 4 * B, 'steel_block');
                  });
                  // Section 2: elevated platform
                  [1100, 1132, 1164, 1196, 1228].forEach(bx => this.blocks.create(bx, GY - 6 * B, 'steel_block'));
                  // Section 3: ? blocks mid-level
                  [2300, 2364, 2428].forEach(bx => { const qb = this.qBlocks.create(bx, GY - 4 * B, 'qblock'); qb.setData('active', true); });
                  // Section 4: long platform over pit
                  [3100, 3132, 3164, 3196].forEach(bx => this.blocks.create(bx, GY - 5 * B, 'steel_block'));
                  // Section 5: high blocks with ? blocks
                  [4000, 4032, 4064, 4096, 4128, 4160].forEach((bx, i) => {
                     if (i === 1 || i === 4) { const qb = this.qBlocks.create(bx, GY - 5 * B, 'qblock'); qb.setData('active', true); }
                     else this.blocks.create(bx, GY - 5 * B, 'steel_block');
                  });
                  // Section 6: stepping stones over last pit
                  [4500, 4564, 4628].forEach(bx => this.blocks.create(bx, GY - 3 * B, 'steel_block'));
                  // Section 7: final approach blocks
                  [5600, 5632, 5664, 5696, 5728].forEach((bx, i) => {
                     if (i === 2) { const qb = this.qBlocks.create(bx, GY - 4 * B, 'qblock'); qb.setData('active', true); }
                     else this.blocks.create(bx, GY - 4 * B, 'steel_block');
                  });

                  // Regular enemies - Koopas and Goombas
                  [600, 1050, 1500, 2100, 2500, 3400, 4800, 5100, 5400, 6200].forEach((ex, i) => i % 3 === 0 ? addKoopa(ex) : addGoomba(ex));

                  // Moving platforms over pits
                  addMovPlat(1750, 360, 60, 50); addMovPlat(3150, 340, -60, 50); addMovPlat(4550, 360, 70, 60); addMovPlat(5850, 340, -60, 50);

                  // Floating coins (collectible)
                  [[700, GY - 6 * B], [764, GY - 6 * B], [2350, GY - 6 * B], [2414, GY - 6 * B], [4050, GY - 7 * B], [4114, GY - 7 * B], [1150, GY - 3 * B], [1214, GY - 3 * B], [1278, GY - 3 * B], [3650, GY - 4 * B], [3714, GY - 4 * B], [5650, GY - 5 * B], [5714, GY - 5 * B], [5778, GY - 5 * B], [6750, GY - 3 * B], [6814, GY - 3 * B]].forEach(([cx, cy]) => { const coin = this.coins.create(cx as number, cy as number, 'coin') as Phaser.Physics.Arcade.Sprite; (coin.body as any).allowGravity = false; this.tweens.add({ targets: coin, y: (cy as number) - 6, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }); });

                  // End section: stairs and flag
                  buildStairs(6700, 'purple_block'); this.flags.create(7200, GY - 192, 'flag'); buildCastle(7600);
               } else if (lvl === 4) {
                  // Level 4 - Sky Platform Hopping (no ground, small floating platforms)
                  this.add.rectangle(5000, 240, 10000, 480, 0x87ceeb).setDepth(-10).setData('decoration', true);
                  // No ground - just open sky. Falling off = death at world bounds

                  // Starting large platform
                  for (let x = 0; x < 6; x++) this.blocks.create(80 + x * B, 390, 'block');

                  // Green leaf platforms on stems (flat on top, rounded ends, stem going down to bottom)
                  const addMushPlatform = (mx: number, my: number) => {
                     this.blocks.create(mx, my, 'mush_platform');
                     // Stem extends from platform all the way down to bottom of screen
                     const stemStart = my + 14;
                     const stemEnd = 500; // past bottom of screen
                     for (let sy = stemStart; sy < stemEnd; sy += 20) this.add.image(mx, sy, 'mush_stem').setDepth(-1).setData('decoration', true);
                  };

                  // Platform sequence - hop from platform to platform
                  addMushPlatform(380, 300); addMushPlatform(560, 260);
                  addMushPlatform(750, 310); addMushPlatform(950, 240);
                  addMushPlatform(1150, 290); addMushPlatform(1380, 220);
                  addMushPlatform(1600, 280); addMushPlatform(1820, 330);
                  addMushPlatform(2050, 250); addMushPlatform(2280, 300);
                  addMushPlatform(2500, 220); addMushPlatform(2720, 270);
                  addMushPlatform(2950, 320); addMushPlatform(3180, 240);
                  addMushPlatform(3420, 290); addMushPlatform(3660, 210);
                  addMushPlatform(3900, 270); addMushPlatform(4140, 320);
                  addMushPlatform(4380, 230); addMushPlatform(4620, 280);
                  addMushPlatform(4860, 240); addMushPlatform(5100, 310);
                  addMushPlatform(5340, 260); addMushPlatform(5580, 220);
                  addMushPlatform(5820, 300);

                  // Some ? blocks floating between platforms
                  [700, 1250, 1900, 2600, 3300, 4000, 4700, 5450].forEach(bx => { const qb = this.qBlocks.create(bx, 220, 'qblock'); qb.setData('active', true); });

                  // Moving platforms for tricky gaps
                  addMovPlat(1000, 350, 50, 60); addMovPlat(2150, 300, -50, 70); addMovPlat(3550, 320, 60, 50); addMovPlat(4950, 290, -50, 60);

                  // Enemies on platforms
                  [560, 1150, 1820, 2500, 3180, 3900, 4620, 5340].forEach((ex, i) => i % 2 === 0 ? addGoomba(ex, 240) : addKoopa(ex, 240));

                  // Piranhas on some stems
                  [750, 1600, 2720, 3660, 4860].forEach(px => {
                     const pl = this.piranhas.create(px, 380, 'piranha') as Phaser.Physics.Arcade.Sprite;
                     (pl.body as any).allowGravity = false; pl.setDepth(1);
                     this.tweens.add({ targets: pl, y: 300, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: Phaser.Math.Between(0, 1000) });
                  });

                  // Coins between platforms
                  [[450, 300], [650, 260], [1050, 240], [1500, 280], [2150, 250], [2850, 320], [3550, 240], [4250, 280], [4750, 240], [5200, 260], [5700, 300], [5900, 260]].forEach(([cx, cy]) => { const coin = this.coins.create(cx, cy, 'coin') as Phaser.Physics.Arcade.Sprite; (coin.body as any).allowGravity = false; this.tweens.add({ targets: coin, y: cy - 6, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }); });

                  // End platform and flag
                  for (let x = 0; x < 8; x++) this.blocks.create(6100 + x * B, 380, 'block');
                  this.flags.create(6400, 380 - 160, 'flag');
                  buildCastle(6700);

               } else {
                  // Level 5 - Lava/Boss Level (Bowser fight)
                  // Dark red/black background
                  const lavaG = this.make.graphics({ x: 0, y: 0 }, false);
                  const lavaColors = [0x1a0000, 0x200000, 0x2a0500, 0x330800, 0x3d0a00, 0x4a0c00, 0x550e00, 0x601000, 0x6b1200, 0x751400, 0x801600, 0x8b1800];
                  lavaColors.forEach((col, i) => { lavaG.fillStyle(col, 1); lavaG.fillRect(0, i * 40, 10000, 40); });
                  lavaG.generateTexture('lvl5_sky', 10000, 480); lavaG.destroy();
                  this.add.image(5000, 240, 'lvl5_sky').setDepth(-10).setData('decoration', true);

                  // Flowing lava at the bottom (animated)
                  for (let x = 0; x < 8500; x += 64) {
                     const lv = this.add.image(x + 32, GY + 8, 'lava').setDepth(-1).setData('decoration', true);
                     this.tweens.add({ targets: lv, x: lv.x + 16, duration: 1200 + Phaser.Math.Between(0, 400), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
                  }
                  // Lava bubbles popping up
                  this.time.addEvent({ delay: 800, loop: true, callback: () => {
                     if (this.gameOver || this.gameWon) return;
                     const bx = Phaser.Math.Between(100, 5000); const bubble = this.add.circle(bx, GY, 6, 0xff6600).setDepth(0).setData('decoration', true);
                     this.tweens.add({ targets: bubble, y: GY - Phaser.Math.Between(30, 80), alpha: 0, scaleX: 0.3, scaleY: 0.3, duration: 600, onComplete: () => bubble.destroy() });
                  }});

                  // Ground - lava blocks with gaps (lava pits)
                  const lavaPits: [number, number][] = [[800, 800 + B * 3], [1600, 1600 + B * 3], [2400, 2400 + B * 4], [3200, 3200 + B * 3], [4000, 4000 + B * 3]];
                  for (let x = 0; x < 5500; x += B) { if (!lavaPits.some(([s, e]) => x >= s && x < e)) { this.blocks.create(x + B / 2, GY, 'lava_block'); this.blocks.create(x + B / 2, GY2, 'lava_block'); } }
                  // Lava in the pits (kills on touch)
                  lavaPits.forEach(([s, e]) => { for (let x = s; x < e; x += B) { const lavaObs = this.obstacles.create(x + B / 2, GY + 8, 'lava') as Phaser.Physics.Arcade.Sprite; lavaObs.setSize(32, 16); } });

                  // Stone platforms above lava pits
                  [[850, GY - 3 * B, 2], [1650, GY - 3 * B, 2], [2480, GY - 3 * B, 3], [3250, GY - 4 * B, 2], [4050, GY - 3 * B, 2]].forEach(([px, py, len]) => { for (let i = 0; i < (len as number); i++) this.blocks.create((px as number) + i * B, py as number, 'lava_block'); });

                  // Fireballs shooting up from lava pits
                  lavaPits.forEach(([s]) => {
                     this.time.addEvent({ delay: 2000 + Phaser.Math.Between(0, 1000), loop: true, callback: () => {
                        if (this.gameOver || this.gameWon) return;
                        const fb = this.fireballs.create(s + B * 1.5, GY + 10, 'fireball') as Phaser.Physics.Arcade.Sprite;
                        (fb.body as any).allowGravity = false;
                        fb.setVelocityY(-350);
                        this.time.delayedCall(2000, () => { if (fb && fb.active) fb.destroy(); });
                     }});
                  });

                  // Enemies
                  [400, 1100, 1900, 2900, 3600].forEach((ex, i) => i % 2 === 0 ? addGoomba(ex) : addKoopa(ex));

                  // ? blocks
                  [500, 1300, 2100, 3000, 3800].forEach(bx => { const qb = this.qBlocks.create(bx, GY - 5 * B, 'qblock'); qb.setData('active', true); });

                  // Coins
                  [[300, GY - 3 * B], [364, GY - 3 * B], [1200, GY - 4 * B], [1264, GY - 4 * B], [2000, GY - 3 * B], [2064, GY - 3 * B], [2800, GY - 4 * B], [2864, GY - 4 * B], [3500, GY - 3 * B], [3564, GY - 3 * B]].forEach(([cx, cy]) => { const coin = this.coins.create(cx as number, cy as number, 'coin') as Phaser.Physics.Arcade.Sprite; (coin.body as any).allowGravity = false; this.tweens.add({ targets: coin, y: (cy as number) - 6, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }); });

                  // === BOWSER BOSS ARENA (starts at x=4800) ===
                  // Boss arena floor
                  for (let x = 4800; x < 6200; x += B) { this.blocks.create(x + B / 2, GY, 'lava_block'); this.blocks.create(x + B / 2, GY2, 'lava_block'); }
                  // Arena walls
                  for (let row = 0; row < 6; row++) { this.blocks.create(4800, GY - row * B, 'lava_block'); }

                  // Bowser boss
                  const bowser = this.enemies.create(5500, GY - 60, 'bowser') as Phaser.Physics.Arcade.Sprite;
                  (bowser.body as any).allowGravity = true;
                  bowser.setData('isBoss', true); bowser.setData('bossHP', 10); bowser.setData('dir', -80);
                  bowser.setVelocityX(-80); (bowser.body as any).setBounceX(1);
                  bowser.setScale(1.5); bowser.setBodySize(50, 50);

                  // Bowser jumps
                  this.time.addEvent({ delay: 2500, loop: true, callback: () => {
                     if (!bowser.active || this.gameOver || this.gameWon) return;
                     bowser.setVelocityY(-500);
                  }});

                  // Bowser breathes fire
                  this.time.addEvent({ delay: 1800, loop: true, callback: () => {
                     if (!bowser.active || this.gameOver || this.gameWon) return;
                     const fb = this.fireballs.create(bowser.x - 40, bowser.y, 'fire_breath') as Phaser.Physics.Arcade.Sprite;
                     (fb.body as any).allowGravity = false;
                     fb.setVelocityX(-250);
                     this.time.delayedCall(3000, () => { if (fb && fb.active) fb.destroy(); });
                  }});

                  // Flag after boss arena
                  this.flags.create(6100, GY - 192, 'flag');
               }
               this.startBGM();
            }

            musicPowerUp() { this.playPowerUpSound(); }
            playBrickSound() { if (!this.audioCtx) return; const now = this.audioCtx.currentTime; const osc1 = this.audioCtx.createOscillator(); const gain1 = this.audioCtx.createGain(); osc1.type = 'square'; osc1.frequency.setValueAtTime(220, now); osc1.frequency.exponentialRampToValueAtTime(80, now + 0.08); gain1.gain.setValueAtTime(0.35, now); gain1.gain.exponentialRampToValueAtTime(0.00001, now + 0.12); osc1.connect(gain1); gain1.connect(this.audioCtx.destination); osc1.start(now); osc1.stop(now + 0.12); const osc2 = this.audioCtx.createOscillator(); const gain2 = this.audioCtx.createGain(); osc2.type = 'sawtooth'; osc2.frequency.setValueAtTime(600, now); osc2.frequency.exponentialRampToValueAtTime(200, now + 0.07); gain2.gain.setValueAtTime(0.2, now); gain2.gain.exponentialRampToValueAtTime(0.00001, now + 0.07); osc2.connect(gain2); gain2.connect(this.audioCtx.destination); osc2.start(now); osc2.stop(now + 0.07); }
            playBrickBreakSound() { if (!this.audioCtx) return; const now = this.audioCtx.currentTime; const osc1 = this.audioCtx.createOscillator(); const gain1 = this.audioCtx.createGain(); osc1.type = 'square'; osc1.frequency.setValueAtTime(300, now); osc1.frequency.exponentialRampToValueAtTime(50, now + 0.1); gain1.gain.setValueAtTime(0.5, now); gain1.gain.exponentialRampToValueAtTime(0.00001, now + 0.15); osc1.connect(gain1); gain1.connect(this.audioCtx.destination); osc1.start(now); osc1.stop(now + 0.15); const osc2 = this.audioCtx.createOscillator(); const gain2 = this.audioCtx.createGain(); osc2.type = 'sawtooth'; osc2.frequency.setValueAtTime(900, now); osc2.frequency.exponentialRampToValueAtTime(150, now + 0.08); gain2.gain.setValueAtTime(0.35, now); gain2.gain.exponentialRampToValueAtTime(0.00001, now + 0.08); osc2.connect(gain2); gain2.connect(this.audioCtx.destination); osc2.start(now); osc2.stop(now + 0.08); const osc3 = this.audioCtx.createOscillator(); const gain3 = this.audioCtx.createGain(); osc3.type = 'sawtooth'; osc3.frequency.setValueAtTime(500, now + 0.04); osc3.frequency.exponentialRampToValueAtTime(100, now + 0.12); gain3.gain.setValueAtTime(0.25, now + 0.04); gain3.gain.exponentialRampToValueAtTime(0.00001, now + 0.12); osc3.connect(gain3); gain3.connect(this.audioCtx.destination); osc3.start(now + 0.04); osc3.stop(now + 0.12); }
            hitBlock(player: any, block: any) { if (!player.body.touching.up || !block.body?.touching.down || block.y >= 430) return; const now = Date.now(); if (block.getData('lastBump') && now - block.getData('lastBump') < 300) return; block.setData('lastBump', now); if (player.getData('isBig')) { this.playBrickBreakSound(); const bx = block.x; const by = block.y; const debrisColors = [0xc84c0c, 0xfc9838, 0x7c3800]; for (let i = 0; i < 4; i++) { const chunk = this.add.rectangle(bx + (i % 2 === 0 ? -8 : 8), by + (i < 2 ? -4 : 4), 10, 10, debrisColors[i % debrisColors.length]); const vx = (i % 2 === 0 ? -1 : 1) * Phaser.Math.Between(80, 160); const vy = i < 2 ? -Phaser.Math.Between(200, 340) : -Phaser.Math.Between(80, 180); this.tweens.add({ targets: chunk, x: chunk.x + vx * 0.6, y: chunk.y + vy * 0.5, angle: Phaser.Math.Between(-180, 180), alpha: 0, duration: 380, ease: 'Quad.easeIn', onComplete: () => chunk.destroy() }); } block.destroy(); } else { this.playBrickSound(); const origY = block.y; this.tweens.add({ targets: block, y: origY - 8, duration: 60, yoyo: true, ease: 'Quad.easeOut', onComplete: () => { block.y = origY; block.refreshBody(); } }); } }
            hitQBlock(player: any, block: any) { if (player.body.touching.up && block.body?.touching.down && block.getData('active')) { block.setData('active', false); block.setTexture('qblock_empty'); this.playPowerUpSound(); const is1Up = Math.random() < 0.3; const tex = is1Up ? 'mushroom_1up' : 'mushroom'; const mush = this.mushrooms.create(block.x, block.y - 28, tex) as Phaser.Physics.Arcade.Sprite; mush.setData('is1Up', is1Up); mush.setVelocityX(80); mush.setBounceX(1); mush.setCollideWorldBounds(true); } }
            collectMushroom(player: any, mush: any) { if (!mush.active) return; const is1Up = mush.getData('is1Up'); mush.destroy(); this.playPowerUpSound(); if (is1Up) { this.hearts++; this.tweens.add({ targets: player, alpha: 0.3, yoyo: true, repeat: 3, duration: 80, onComplete: () => player.setAlpha(1) }); } else { player.setData('isBig', true); this.isBig = true; player.setScale(1.4); this.tweens.add({ targets: player, alpha: 0.3, yoyo: true, repeat: 3, duration: 80, onComplete: () => player.setAlpha(1) }); } }
            collectCoin(player: any, coin: any) { if (!coin.active) return; coin.destroy(); this.playCoinSound(); this.coinCount++; if (this.coinCount >= 100) { this.coinCount = 0; this.hearts++; this.playPowerUpSound(); } }
            hitEnemy(player: any, enemy: any) { if (player.body.touching.down && enemy.body.touching.up) { if (enemy.getData('isBoss')) { let hp = enemy.getData('bossHP') - 1; enemy.setData('bossHP', hp); this.playStompSound(); player.setVelocityY(-500); enemy.setAlpha(0.5); this.time.delayedCall(200, () => { if (enemy.active) enemy.setAlpha(1); }); if (hp <= 0) { enemy.destroy(); this.playVictorySound(); this.gameWon = true; this.showBirthdayCelebration(); } } else { enemy.destroy(); player.setVelocityY(-400); this.playStompSound(); } } else { if (player === this.myPlayer) this.takeDamage(player); } }

            showBirthdayCelebration() {
               // Stop BGM
               if (this.bgmInterval) window.clearInterval(this.bgmInterval);

               // Dark overlay
               const overlay = this.add.rectangle(400, 240, 800, 480, 0x000000, 0.7).setScrollFactor(0).setDepth(50);
               this.tweens.add({ targets: overlay, alpha: 0.85, duration: 1000 });

               // Main message
               const msg1 = this.add.text(400, 140, '🎂 Happy Birthday! 🎂', { fontSize: '42px', color: '#ff69b4', stroke: '#fff', strokeThickness: 4, fontStyle: 'bold' }).setOrigin(0.5).setScrollFactor(0).setDepth(60).setAlpha(0);
               const msg2 = this.add.text(400, 220, 'I Love You So Much ❤️', { fontSize: '36px', color: '#ff1493', stroke: '#fff', strokeThickness: 3, fontStyle: 'bold' }).setOrigin(0.5).setScrollFactor(0).setDepth(60).setAlpha(0);
               const msg3 = this.add.text(400, 290, '🎉🎊 You are amazing! 🎊🎉', { fontSize: '28px', color: '#ffd700', stroke: '#000', strokeThickness: 2 }).setOrigin(0.5).setScrollFactor(0).setDepth(60).setAlpha(0);

               this.tweens.add({ targets: msg1, alpha: 1, scaleX: 1.1, scaleY: 1.1, duration: 800, delay: 500, yoyo: false });
               this.tweens.add({ targets: msg2, alpha: 1, scaleX: 1.05, scaleY: 1.05, duration: 800, delay: 1200, yoyo: false });
               this.tweens.add({ targets: msg3, alpha: 1, duration: 800, delay: 1900 });

               // Pulsing heart animation on the love message
               this.time.delayedCall(1500, () => { this.tweens.add({ targets: msg2, scaleX: 1.15, scaleY: 1.15, duration: 600, yoyo: true, repeat: -1 }); });

               // Glitter/confetti particles
               const colors = [0xff69b4, 0xffd700, 0x00ff00, 0xff4500, 0x00bfff, 0xff1493, 0x7fff00, 0xff6347, 0xee82ee, 0xffa500];
               this.time.addEvent({ delay: 80, repeat: 150, callback: () => {
                  const gx = Phaser.Math.Between(50, 750); const gy = Phaser.Math.Between(-20, 0);
                  const color = colors[Phaser.Math.Between(0, colors.length - 1)];
                  const size = Phaser.Math.Between(3, 8);
                  const glitter = this.add.rectangle(gx, gy, size, size, color).setScrollFactor(0).setDepth(55);
                  const angle = Phaser.Math.Between(-30, 30);
                  this.tweens.add({ targets: glitter, y: 500, x: gx + angle * 3, angle: Phaser.Math.Between(-180, 180), alpha: 0.3, duration: Phaser.Math.Between(2000, 4000), onComplete: () => glitter.destroy() });
               }});

               // Balloons rising up
               const balloonColors = [0xff0000, 0xff69b4, 0xffd700, 0x00bfff, 0x9400d3, 0x00ff00, 0xff4500, 0xff1493];
               this.time.addEvent({ delay: 300, repeat: 30, callback: () => {
                  const bx = Phaser.Math.Between(50, 750); const by = 500;
                  const bColor = balloonColors[Phaser.Math.Between(0, balloonColors.length - 1)];
                  const balloon = this.add.ellipse(bx, by, 20, 26, bColor).setScrollFactor(0).setDepth(52);
                  const string = this.add.line(0, 0, bx, by + 13, bx + Phaser.Math.Between(-5, 5), by + 35, 0xffffff).setScrollFactor(0).setDepth(52);
                  const targetY = Phaser.Math.Between(-50, 100);
                  const sway = Phaser.Math.Between(-40, 40);
                  this.tweens.add({ targets: balloon, y: targetY, x: bx + sway, duration: Phaser.Math.Between(3000, 5000), ease: 'Sine.easeOut' });
                  this.tweens.add({ targets: string, y: targetY - by + 13, x: sway, duration: Phaser.Math.Between(3000, 5000), ease: 'Sine.easeOut', onComplete: () => { string.destroy(); } });
               }});

               // Sparkle stars
               this.time.addEvent({ delay: 200, repeat: 60, callback: () => {
                  const sx = Phaser.Math.Between(50, 750); const sy = Phaser.Math.Between(50, 430);
                  const sparkle = this.add.star(sx, sy, 5, 3, 8, 0xffffff).setScrollFactor(0).setDepth(53).setAlpha(0);
                  this.tweens.add({ targets: sparkle, alpha: 1, scaleX: 1.5, scaleY: 1.5, duration: 300, yoyo: true, onComplete: () => sparkle.destroy() });
               }});

               // Play celebration melody
               if (this.audioCtx) {
                  const melody = [523, 523, 587, 523, 698, 659, 0, 523, 523, 587, 523, 784, 698, 0, 523, 523, 1046, 880, 698, 659, 587, 932, 932, 880, 698, 784, 698];
                  melody.forEach((f, i) => { if (f > 0) setTimeout(() => this.playAudio(f, 'sine', 0.3), i * 250); });
               }

               this.uiText.setText('');
            }
            touchFlag(player: any, flag: any) { const playerRole = (player === this.p1) ? 'p1' : 'p2'; if (playerRole !== role) return; if (this.finishedSet.has(playerRole)) return; socket.emit('flagTouched', playerRole); this.playVictorySound(); }
            createJoystick() {}
            takeDamage(player: any) { if (player.alpha !== 1 || this.gameOver || this.gameWon) return; this.playHurtSound(); if (player.getData('isBig')) { player.setData('isBig', false); this.isBig = false; player.setScale(1); player.setAlpha(0.5); this.tweens.add({ targets: player, alpha: 0, yoyo: true, repeat: 5, duration: 100, onComplete: () => player.setAlpha(1) }); return; } this.hearts--; if (this.hearts <= 0) { this.playGameOverSound(); this.gameOver = true; socket.emit('gameOver'); } else { player.setAlpha(0.5); this.tweens.add({ targets: player, alpha: 0, yoyo: true, repeat: 5, duration: 100, onComplete: () => player.setAlpha(1) }); player.setVelocityY(-350); } }

            update() {
               if (this.gameOver) { this.uiText.setText('GAME OVER!'); return; }
               if (this.waitingForOther && !this.countingDown) { this.uiText.setText(this.finishedSet.has('p1') && this.finishedSet.has('p2') ? 'Both done! Starting...' : `Waiting for ${this.finishedSet.has('p1') ? 'P2' : 'P1'}...`); return; }
               if (this.countingDown) return;

               this.movingPlatforms.getChildren().forEach((p: any) => {
                  const originX = p.getData('originX'); const range = p.getData('range'); let speed = p.getData('speed'); const oldX = p.x;
                  if (p.x < originX - range && speed < 0) { speed = Math.abs(speed); p.setData('speed', speed); }
                  else if (p.x > originX + range && speed > 0) { speed = -Math.abs(speed); p.setData('speed', speed); }
                  (p.body as any).setVelocityX(speed);
                  const deltaX = p.x - oldX;
                  [this.p1, this.p2].forEach(plr => { if (plr.body.touching.down && Phaser.Geom.Intersects.RectangleToRectangle(plr.getBounds(), p.getBounds())) plr.x += deltaX; });
               });

               this.clouds.getChildren().forEach((c: any) => { c.x -= c.getData('speed') * 0.02; if (c.x < -200) c.x = 10000; });
               this.enemies.getChildren().forEach((e: any) => { if (e.body && e.body.velocity.x === 0) { const d = (e.getData('dir') || 60) * -1; e.setVelocityX(d); e.setData('dir', d); } });

               const isLeft = this.cursors.left.isDown || this.keyA.isDown || this.joyKeys.left;
               const isRight = this.cursors.right.isDown || this.keyD.isDown || this.joyKeys.right;
               const isJumpHeld = this.cursors.up.isDown || this.keyW.isDown || this.cursors.space.isDown || this.joyKeys.jump;
               const isJumpJustDown = isJumpHeld && !this.prevJump; this.prevJump = isJumpHeld;
               const isCrouch = this.cursors.down.isDown || this.keyS.isDown || this.joyKeys.down;
               const onGround = this.myPlayer.body.touching.down;
               let animState = 'run1';

               if (isCrouch && onGround) { this.myPlayer.setVelocityX(0); this.myPlayer.setBodySize(18, 16); this.myPlayer.setOffset(4, 18); animState = 'crouch'; this.myPlayer.anims.stop(); }
               else {
                  this.myPlayer.setBodySize(18, 28); this.myPlayer.setOffset(4, 6);
                  if (isLeft) { this.myPlayer.setVelocityX(-250); this.myPlayer.setFlipX(true); if (onGround) { animState = 'run'; this.myPlayer.play(`${role}_run`, true); } }
                  else if (isRight) { this.myPlayer.setVelocityX(250); this.myPlayer.setFlipX(false); if (onGround) { animState = 'run'; this.myPlayer.play(`${role}_run`, true); } }
                  else { this.myPlayer.setVelocityX(0); animState = 'run1'; this.myPlayer.anims.stop(); }
                  if (isJumpJustDown && onGround) { this.myPlayer.setVelocityY(-750); this.playJumpSound(); }
                  if (!isJumpHeld && this.myPlayer.body.velocity.y < -200) this.myPlayer.setVelocityY(this.myPlayer.body.velocity.y * 0.8);
                  if (!onGround) { animState = 'jump'; this.myPlayer.anims.stop(); }
               }
               if (animState !== 'run') this.myPlayer.setTexture(`${role}_${animState}`);

               const targetX = Math.max(Math.min(this.p1.x, this.p2.x) + 300, this.cameras.main.scrollX + 400);
               this.cameraCenter.x = Phaser.Math.Clamp(targetX, 400, 9600);
               if (this.myPlayer.x < this.cameras.main.scrollX + 10) this.myPlayer.x = this.cameras.main.scrollX + 10;

               socket.emit('updateState', { role, x: this.myPlayer.x, y: this.myPlayer.y, anim: animState, flipX: this.myPlayer.flipX, scale: this.myPlayer.scale });
               this.uiText.setText(`LEVEL ${this.level}  🪙×${this.coinCount}  ${'❤️'.repeat(this.hearts)}`);
            }
         }

         const config: Phaser.Types.Core.GameConfig = { type: Phaser.AUTO, scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 800, height: 480 }, parent: gameRef.current!, physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 1600 }, debug: false } }, scene: [MainScene], backgroundColor: '#5c94fc' };
         game = new Phaser.Game(config);
      });

      return () => {
         isDestroyed = true; if (game) game.destroy(true); if (socket) socket.disconnect();
         if (typeof window !== 'undefined') { const all = window.setInterval(() => {}, 9999); for (let i = 0; i <= all; i++) window.clearInterval(i); }
      };
   }, [role]);

   const press = useCallback((action: keyof typeof joyKeysRef.current, val: boolean) => { joyKeysRef.current[action] = val; }, []);
   const btnStyle = (color: string): React.CSSProperties => ({ width: 64, height: 64, borderRadius: '50%', background: color, border: '3px solid rgba(255,255,255,0.35)', color: '#fff', fontSize: 22, fontWeight: 'bold', cursor: 'pointer', userSelect: 'none', touchAction: 'none', WebkitTouchCallout: 'none', WebkitUserSelect: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.5)', flexShrink: 0 } as React.CSSProperties);
   const bind = (action: keyof typeof joyKeysRef.current) => ({ onPointerDown: (e: React.PointerEvent) => { e.currentTarget.setPointerCapture(e.pointerId); press(action, true); }, onPointerUp: () => press(action, false), onPointerLeave: () => press(action, false), onContextMenu: (e: React.MouseEvent) => e.preventDefault() });

   return (
      <div style={{ width: '100vw', height: '100dvh', background: '#111', position: 'relative', overflow: 'hidden', WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none', touchAction: 'manipulation' } as React.CSSProperties}>
         <div ref={gameRef} style={{ width: '100%', height: '100%' }} />
         <div style={{ position: 'absolute', left: 30, bottom: 8, transform: 'translateY(-50%)', display: 'grid', gridTemplateColumns: 'repeat(3, 70px)', gridTemplateRows: 'repeat(2, 70px)', zIndex: 10 }}>
            <div /><button style={btnStyle('rgba(60,60,200,0.82)')} {...bind('jump')}>▲</button><div />
            <button style={btnStyle('rgba(60,60,200,0.82)')} {...bind('left')}>◀</button><button style={btnStyle('rgba(60,60,200,0.82)')} {...bind('down')}>▼</button><button style={btnStyle('rgba(60,60,200,0.82)')} {...bind('right')}>▶</button>
         </div>
         <button style={{ ...btnStyle('rgba(210,30,30,0.88)'), position: 'absolute', right: 30, bottom: 8, transform: 'translateY(-50%)', width: 72, height: 72, fontSize: 15, zIndex: 10 }} {...bind('jump')}>JUMP</button>
      </div>
   );
}
