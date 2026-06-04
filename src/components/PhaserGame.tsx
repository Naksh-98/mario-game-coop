'use client'

import React, { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { createTextures as createAllTextures } from '@/lib/textureFactory';
import LevelEditorScene from '@/scenes/LevelEditorScene';
import { getLevelBySlot } from '@/lib/levelStorage';
import type { LevelData, PlacedObject } from '@/lib/levelData';

export default function PhaserGame({
   role,
   musicVolume = 0.5,
   sfxVolume = 0.7,
   btnPos = 'left',
   initialLevel = 1,
   initialScore = 0,
   initialHearts = 3,
   initialCoins = 0,
   onExit
}: {
   role: 'p1' | 'p2' | 'editor';
   musicVolume?: number;
   sfxVolume?: number;
   btnPos?: 'left' | 'right';
   initialLevel?: number;
   initialScore?: number;
   initialHearts?: number;
   initialCoins?: number;
   onExit?: () => void;
}) {
   const gameRef = useRef<HTMLDivElement>(null);
   // Shared joy-keys object — React buttons write here, Phaser reads here
   const joyKeysRef = useRef({ left: false, right: false, down: false, jump: false, fire: false });
   const musicVolumeRef = useRef(musicVolume);
   const sfxVolumeRef = useRef(sfxVolume);
   useEffect(() => { musicVolumeRef.current = musicVolume; }, [musicVolume]);
   useEffect(() => { sfxVolumeRef.current = sfxVolume; }, [sfxVolume]);

   const [showSaveBtn, setShowSaveBtn] = React.useState(false);
   const [saveData, setSaveData] = React.useState<any>(null);
   const [hasFirePower, setHasFirePower] = React.useState(false);

   React.useEffect(() => {
      const handler = () => setHasFirePower(true);
      const clearHandler = () => setHasFirePower(false);
      window.addEventListener('marioFirePowerOn', handler);
      window.addEventListener('marioFirePowerOff', clearHandler);
      return () => {
         window.removeEventListener('marioFirePowerOn', handler);
         window.removeEventListener('marioFirePowerOff', clearHandler);
      };
   }, []);

   React.useEffect(() => {
      const handler = (e: Event) => {
         const customEvent = e as CustomEvent;
         setSaveData(customEvent.detail);
         setShowSaveBtn(true);
      };
      window.addEventListener('marioGameWon', handler);
      return () => window.removeEventListener('marioGameWon', handler);
   }, []);

   const handleSaveGame = () => {
      const dataToSave = {
         score: saveData?.score || 0,
         hearts: saveData?.hearts || 3,
         coinCount: saveData?.coinCount || 0,
         level: 6,
         savedAt: new Date().toISOString()
      };
      try {
         const blob = new Blob([JSON.stringify(dataToSave, null, 2)], { type: 'application/json' });
         const url = URL.createObjectURL(blob);
         const link = document.createElement('a');
         link.href = url;
         link.download = `mario_savegame_${new Date().toISOString().split('T')[0]}.json`;
         document.body.appendChild(link);
         link.click();
         document.body.removeChild(link);
         URL.revokeObjectURL(url);
         alert('Save game downloaded successfully! Keep this file safe and load it on the main menu to resume from Level 6.');
      } catch (err) {
         alert('Failed to download save game file.');
      }
      setShowSaveBtn(false);
   };

   useEffect(() => {
      if (typeof window === 'undefined') return;

      // Prevent all text selection and context menus on touch
      const preventSelect = (e: Event) => e.preventDefault();
      document.addEventListener('selectstart', preventSelect);
      document.addEventListener('contextmenu', preventSelect);

      let isDestroyed = false;
      let game: any;

      // --- EDITOR MODE: skip socket, use LevelEditorScene ---
      if (role === 'editor') {
         import('phaser').then((ph) => {
            if (isDestroyed) return;
            const Phaser = ph.default || ph;

            const editorConfig: Phaser.Types.Core.GameConfig = {
               type: Phaser.AUTO,
               scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 800, height: 480 },
               parent: gameRef.current!,
               physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
               scene: [LevelEditorScene],
               backgroundColor: '#2c2c2c',
            };
            game = new Phaser.Game(editorConfig);
            // Pass onExit to the scene via scene init data
            game.scene.start('LevelEditorScene', { onExit: () => {
               if (game) { game.destroy(true); game = null; }
               onExit?.();
            }});
         });

         return () => {
            isDestroyed = true;
            if (game) { game.destroy(true); game = null; }
            document.removeEventListener('selectstart', preventSelect);
            document.removeEventListener('contextmenu', preventSelect);
         };
      }

      // --- GAMEPLAY MODE (p1/p2): use socket + MainScene ---
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
            playerFireballs!: Phaser.Physics.Arcade.Group;
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
            currentBgm: Phaser.Sound.BaseSound | null = null;

            joyKeys = joyKeysRef.current;
            prevJump = false;
            prevFire = false;
            hasFire = false;
            lastFireTime = 0;

            hearts = 3;
            gameOver = false;
            gameWon = false;
            waitingForOther = false; 
            countingDown = false;
            level = 1;
            isBig = false;
            coinCount = 0;
            score = 0;
            levelTimer = 120; // 2 minutes in seconds
            timerEvent!: Phaser.Time.TimerEvent;
            countdownText!: Phaser.GameObjects.Text;
            finishedSet: Set<string> = new Set();
            castleX = 0;
            playingCustomFromLibrary = false;

            constructor() {
               super({ key: 'MainScene' });
            }

            preload() {
               this.load.audio('browsercontact', '/audio/browsercontact.mp3');
               this.load.audio('level1', '/audio/level1.mp3');
               this.load.audio('level2', '/audio/level2.mp3');
               this.load.audio('level3', '/audio/level3.mp3');
               this.load.audio('level4', '/audio/level4new.mp3');
               this.load.audio('level5', '/audio/level_5.mp3');
               this.load.audio('mariodeath', '/audio/mariodeath.mp3');
               this.load.audio('victory', '/audio/winningsongafterbothtouchflag.mp3');
               this.load.audio('coin', '/audio/mario_coin_sound.mp3');
               this.load.audio('jump', '/audio/Super+Mario+-+Jump+(Sound+Effect).mp3');
               this.load.audio('killedbrowser', '/audio/killedbrowser.mp3');
               this.load.audio('bowserfire', '/audio/Super_Mario_Bros_Bowser fire.mp3');
               this.load.audio('level6', '/audio/level6.mp3');
            }

            playAudio(freq: number, type: OscillatorType, dur: number, ramp = true) {
               if (!this.audioCtx || freq === 0 || sfxVolumeRef.current <= 0) return;
               const osc = this.audioCtx.createOscillator();
               const gain = this.audioCtx.createGain();
               osc.type = type;
               osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
               gain.gain.setValueAtTime(sfxVolumeRef.current, this.audioCtx.currentTime);
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
               try { this.sound.play('jump', { volume: sfxVolumeRef.current * 0.9 }); } catch (e) {}
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
               try { this.sound.play('coin', { volume: sfxVolumeRef.current }); } catch (e) {}
            }

            playPowerUpSound() {
               if (!this.audioCtx) return;
               const notes = [261, 329, 392, 523, 659, 783, 1046];
               notes.forEach((f, i) => {
                  setTimeout(() => this.playAudio(f, 'square', 0.1), i * 60);
               });
            }

            playVictorySound() {
               if (this.currentBgm) { this.currentBgm.stop(); this.currentBgm.destroy(); this.currentBgm = null; }
               try { this.sound.play('victory', { volume: musicVolumeRef.current * 1.2 }); } catch (e) { console.error(e); }
            }

            playKilledBrowserSound() {
               if (this.currentBgm) { this.currentBgm.stop(); this.currentBgm.destroy(); this.currentBgm = null; }
               try { this.sound.play('killedbrowser', { volume: musicVolumeRef.current * 1.2 }); } catch (e) { console.error(e); }
            }

            playGameOverSound() {
               if (this.currentBgm) { this.currentBgm.stop(); this.currentBgm.destroy(); this.currentBgm = null; }
               if (this.sound && (this.sound as any).context && (this.sound as any).context.state === 'suspended') (this.sound as any).context.resume();
               try { this.sound.play('mariodeath', { volume: musicVolumeRef.current }); } catch (e) { console.error(e); }
            }

            startBGM() {
               if (this.currentBgm) { this.currentBgm.stop(); this.currentBgm.destroy(); this.currentBgm = null; }
               if (this.gameOver || this.gameWon || this.countingDown) return;
               let key = '';
               if (this.level === 1) key = 'level1';
               else if (this.level === 2) key = 'level2';
               else if (this.level === 3) key = 'level3';
               else if (this.level === 4) key = 'level4';
               else if (this.level === 5) key = 'level5';
               else if (this.level >= 6) key = 'level6';
               if (key) {
                  try {
                     this.currentBgm = this.sound.add(key, { loop: true, volume: musicVolumeRef.current });
                     this.currentBgm.play();
                  } catch (e) { console.error('Error playing BGM:', e); }
               }
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

            createTextures() {
               createAllTextures(this);
            }

            create() {
               this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
               // Resume AudioContext on user interaction (required for mobile browsers in production)
               const resumeCtx = () => { if (this.audioCtx && this.audioCtx.state === 'suspended') this.audioCtx.resume(); };
               document.addEventListener('pointerdown', resumeCtx, { once: false });
               document.addEventListener('touchstart', resumeCtx, { once: false });
               document.addEventListener('keydown', resumeCtx, { once: false });
               
               // Initialize stats from React props closure
               this.hearts = initialHearts;
               this.level = initialLevel;
               this.coinCount = initialCoins;
               this.score = initialScore;

               if (initialLevel > 1) {
                  socket.emit('setServerLevel', initialLevel);
               }

               // Unsuspend/Resume both the synthesis and Sound Manager contexts on any user input
               const resumeAudio = () => {
                  if (this.audioCtx && this.audioCtx.state === 'suspended') {
                     this.audioCtx.resume();
                  }
                  const snd = this.sound as any;
                  if (snd.context && snd.context.state === 'suspended') {
                     snd.context.resume().then(() => {
                        if (this.currentBgm && !this.currentBgm.isPlaying) {
                           this.currentBgm.play();
                        } else if (!this.currentBgm) {
                           this.startBGM();
                        }
                     });
                  }
               };
               this.input.on('pointerdown', resumeAudio);
               this.input.keyboard?.on('keydown', resumeAudio);

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
               this.playerFireballs = this.physics.add.group({ allowGravity: true });
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
               // Player fireballs bounce on blocks and destroy enemies
               this.physics.add.collider(this.playerFireballs, this.blocks, (fb: any) => { fb.setVelocityY(-220); });
               this.physics.add.collider(this.playerFireballs, this.movingPlatforms, (fb: any) => { fb.setVelocityY(-220); });
               this.physics.add.overlap(this.playerFireballs, this.enemies, this.fireballHitEnemy as any, undefined, this);
               this.physics.add.overlap(this.p1, this.obstacles, (_p: any, obs: any) => { if (obs.getData && obs.getData('isLava')) { if (!this.gameOver) { this.hearts = 0; this.playGameOverSound(); this.gameOver = true; socket.emit('gameOver'); this.deathAnimation(this.p1); } } else { this.takeDamage(this.p1); } }, undefined, this);
               this.physics.add.overlap(this.p2, this.obstacles, (_p: any, obs: any) => { if (obs.getData && obs.getData('isLava')) { if (!this.gameOver) { this.hearts = 0; this.playGameOverSound(); this.gameOver = true; socket.emit('gameOver'); this.deathAnimation(this.p2); } } else { this.takeDamage(this.p2); } }, undefined, this);
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

               this.uiText = this.add.text(20, 20, '', { fontSize: '24px', color: '#fff', stroke: '#000', strokeThickness: 4 }).setScrollFactor(0).setDepth(999);
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
                     const oSkin = st[opRole].fire ? 'fire_' : '';
                     if (st[opRole].anim === 'crouch') { this.otherPlayer.setBodySize(18, 16); this.otherPlayer.setOffset(4, 18); }
                     else { this.otherPlayer.setBodySize(18, 28); this.otherPlayer.setOffset(4, 6); }
                     if (st[opRole].anim === 'run') { if (!this.otherPlayer.anims.isPlaying || !this.otherPlayer.anims.currentAnim?.key.includes(oSkin)) this.otherPlayer.play(`${opRole}_${oSkin}run`); }
                     else { this.otherPlayer.anims.stop(); this.otherPlayer.setTexture(`${opRole}_${oSkin}${st[opRole].anim}`); }
                  }
               });

               socket.on('playerFinished', (finRole: string) => {
                  this.finishedSet.add(finRole);
                  if (finRole === role) { this.waitingForOther = true; this.playAudio(523, 'square', 0.15); setTimeout(() => this.playAudio(659, 'square', 0.15), 150); setTimeout(() => this.playAudio(784, 'square', 0.2), 300); }
               });
               
               socket.on('startCountdown', (nextLvl: number) => {
                  this.countingDown = true; this.gameWon = true; let tick = 10;
                  const countNotes = [220, 247, 262, 294, 330, 349, 392, 440, 494, 523];

                  if (this.level === 1 || this.level === 2 || this.level === 3) {
                     // 1. Disable physics bodies
                     (this.p1.body as any).enable = false;
                     (this.p2.body as any).enable = false;

                     // 2. Play run animations
                     this.p1.play('p1_run', true);
                     this.p2.play('p2_run', true);

                     // 3. Move players to the castle door
                     const doorX = this.castleX + 80;

                     // We will tween them to doorX
                     this.tweens.add({
                        targets: [this.p1, this.p2],
                        x: doorX,
                        duration: 2000,
                        ease: 'Linear',
                        onComplete: () => {
                           // Once at the door, face forward / stop animation
                           this.p1.anims.stop();
                           this.p2.anims.stop();
                           this.p1.setTexture('p1_run1');
                           this.p2.setTexture('p2_run1');

                           // Set depth to 0 so they walk behind the castle walls (depth 12)
                           this.p1.setDepth(0);
                           this.p2.setDepth(0);

                           // Walk "up" (into the door) by moving Y up and fading out
                           this.tweens.add({
                              targets: [this.p1, this.p2],
                              y: '-=15',
                              scaleX: 0.1,
                              scaleY: 0.1,
                              alpha: 0,
                              duration: 1000,
                              ease: 'Quad.easeOut'
                           });
                        }
                     });
                  }
                  
                  const doTick = () => {
                     if (tick <= 0) {
                        this.playAudio(784, 'square', 0.1); setTimeout(() => this.playAudio(880, 'square', 0.1), 100); setTimeout(() => this.playAudio(988, 'square', 0.1), 200); setTimeout(() => this.playAudio(1047, 'square', 0.3), 300);
                        this.tweens.add({ targets: this.countdownText, alpha: 0, duration: 400, onComplete: () => {
                           this.countdownText.setAlpha(0); this.countingDown = false; this.waitingForOther = false; this.finishedSet.clear(); this.level = nextLvl; this.gameWon = false;
                           // Reset fire power on new level
                           this.hasFire = false; this.p1.setData('fireOutfit', false); this.p2.setData('fireOutfit', false);
                           if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('marioFirePowerOff'));
                           // For level 4 (pillar platforming), spawn from the sky to land on first pillar
                           if (nextLvl === 4) {
                              this.p1.setPosition(150, 100); this.p1.setVelocity(0, 0); this.p2.setPosition(100, 100); this.p2.setVelocity(0, 0);
                           } else {
                              this.p1.setPosition(150, 360); this.p1.setVelocity(0, 0); this.p2.setPosition(80, 360); this.p2.setVelocity(0, 0);
                           }
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
               socket.on('loadCustomLevel', (levelId: string) => {
                  try {
                     const entries = JSON.parse(localStorage.getItem('mario_custom_levels') || '[]');
                     const entry = entries.find((e: any) => e?.id === levelId);
                     if (entry && entry.data) {
                        this.playingCustomFromLibrary = true;
                        this.generateCustomLevel(entry.data as LevelData);
                     }
                  } catch (e) { console.warn('Failed to load custom level:', e); }
               });
               socket.on('gameOver', () => { if (!this.gameOver) { this.gameOver = true; this.playGameOverSound(); this.deathAnimation(this.myPlayer); } });

               this.startBGM();
               this.generateLevel(this.level);
            }

            generateLevel(lvl: number) {
               this.blocks.clear(true, true); this.obstacles.clear(true, true); this.enemies.clear(true, true); this.qBlocks.clear(true, true); this.flags.clear(true, true); this.fireballs.clear(true, true); this.movingPlatforms.clear(true, true); this.mushrooms?.clear(true, true); this.piranhas?.clear(true, true); this.coins?.clear(true, true);
               this.children.list.filter((c: any) => c.getData && c.getData('decoration')).forEach((c: any) => c.destroy());

               if (this.p1 && this.p2) {
                  this.p1.setAlpha(1); this.p2.setAlpha(1);
                  this.p1.setDepth(10); this.p2.setDepth(10);
                  this.p1.setScale(this.p1.getData('isBig') ? 1.4 : 1);
                  this.p2.setScale(this.p2.getData('isBig') ? 1.4 : 1);
                  if (this.p1.body) (this.p1.body as any).enable = true;
                  if (this.p2.body) (this.p2.body as any).enable = true;
                  (this.p1.body as any).allowGravity = true;
                  (this.p2.body as any).allowGravity = true;
               }

               if (lvl >= 6) {
                  // First check localStorage
                  const savedLevel = getLevelBySlot(lvl);
                  if (savedLevel) {
                     this.generateCustomLevel(savedLevel.data);
                     return;
                  }
                  // Then try loading from public/levels/ static files
                  fetch('/api/list-levels').then(r => r.json()).then(({ levels }) => {
                     const fileLvl = levels?.find((l: any) => l.slotNumber === lvl);
                     if (fileLvl) {
                        fetch(`/levels/${fileLvl.fileName}`).then(r => r.json()).then((data: any) => {
                           this.generateCustomLevel(data as LevelData);
                        }).catch(() => this.showComingSoon(lvl));
                     } else {
                        this.showComingSoon(lvl);
                     }
                  }).catch(() => this.showComingSoon(lvl));
                  return;
               }

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
               const buildCastle = (cx: number) => {
                   this.castleX = cx;

                   // Door background (black rectangle, depth 1, behind players)
                   const doorBg = this.add.rectangle(cx + 80, GY - 48, 32, 64, 0x000000).setDepth(1);
                   doorBg.setData('decoration', true);

                   for (let col = 0; col < 5; col++) {
                      for (let row = 0; row < 4; row++) {
                         // Leave empty space for the door (col 2, row 0, 1, 2)
                         if (col === 2 && row < 3) continue;

                         const wall = this.blocks.create(cx + col * B + B / 2, GY - row * B, 'castle_wall') as Phaser.Physics.Arcade.Sprite;
                         wall.setDepth(12); // Front of players
                      }
                   }
                   for (let row = 4; row < 7; row++) {
                      const wallL = this.blocks.create(cx + B / 2, GY - row * B, 'castle_wall') as Phaser.Physics.Arcade.Sprite;
                      const wallR = this.blocks.create(cx + 4 * B + B / 2, GY - row * B, 'castle_wall') as Phaser.Physics.Arcade.Sprite;
                      wallL.setDepth(12);
                      wallR.setDepth(12);
                   }

                   // Windows (black rectangles with border decoration on col 1 & 3, row 3)
                   // Left window
                   const winL = this.add.rectangle(cx + 48, GY - 96, 12, 18, 0x000000).setDepth(13);
                   winL.setData('decoration', true);
                   const winFrameL = this.add.graphics().setDepth(13).setData('decoration', true);
                   winFrameL.lineStyle(2, 0x5a3010, 1);
                   winFrameL.strokeRect(cx + 42, GY - 105, 12, 18);

                   // Right window
                   const winR = this.add.rectangle(cx + 112, GY - 96, 12, 18, 0x000000).setDepth(13);
                   winR.setData('decoration', true);
                   const winFrameR = this.add.graphics().setDepth(13).setData('decoration', true);
                   winFrameR.lineStyle(2, 0x5a3010, 1);
                   winFrameR.strokeRect(cx + 106, GY - 105, 12, 18);

                   // Door frame outline
                   const doorFrame = this.add.graphics().setDepth(13).setData('decoration', true);
                   doorFrame.lineStyle(3, 0x5a3010, 1);
                   doorFrame.strokeRect(cx + 64, GY - 80, 32, 64);
                };
                const buildStairs = (startX: number, tex = 'block') => { for (let step = 0; step < 8; step++) { const sx = startX + step * B; for (let row = 0; row <= step; row++) this.blocks.create(sx + B / 2, GY - row * B, tex); } };

               if (lvl === 1) {
                  this.add.rectangle(5000, 240, 10000, 480, 0x5c94fc).setDepth(-10).setData('decoration', true);
                  [[180, 1], [500, 1.4], [1900, 1], [3600, 1.2], [5600, 0.9]].forEach(([hx, sc]) => this.add.image(hx as number, GY - 22, 'hill').setScale(sc as number).setDepth(-3).setData('decoration', true));
                  for (let x = 0; x < 8500; x += B) { if (!(x >= 2000 && x < 2000 + B * 3)) { this.blocks.create(x + B / 2, GY, 'block'); this.blocks.create(x + B / 2, GY2, 'block'); } }
                  addPipe(480, 2); addPipe(1260, 3); addPipe(2300, 2);
                  const BH = GY - 4 * B; [736, 800, 864, 928].forEach((bx, i) => { if (i === 1 || i === 2) { const qb = this.qBlocks.create(bx, BH, 'qblock'); qb.setData('active', true); } else this.blocks.create(bx, BH, 'block'); });
                  [1600, 1664, 1728].forEach(bx => { const qb = this.qBlocks.create(bx, GY - 5 * B, 'qblock'); qb.setData('active', true); });
                  this.blocks.create(1792, GY - 5 * B, 'block');
                  [2976, 3040, 3104, 3168].forEach((bx, i) => { if (i % 2 === 0) this.blocks.create(bx, GY - 5 * B, 'block'); else { const qb = this.qBlocks.create(bx, GY - 5 * B, 'qblock'); qb.setData('active', true); } });
                  addMovPlat(2600, 340, 60); addMovPlat(4400, 300, -60);
                  [900, 1500, 2150, 3700, 4600, 5300].forEach(ex => addGoomba(ex));

                  // Wall puzzles - walls you have to jump over
                  for (let row = 0; row < 3; row++) this.blocks.create(3400, GY - row * B, 'block');
                  for (let row = 0; row < 4; row++) this.blocks.create(4900, GY - row * B, 'block');
                  for (let row = 0; row < 2; row++) this.blocks.create(5600, GY - row * B, 'block');

                  // Hammer Brothers
                  const addHammerBro = (hx: number, hy: number) => {
                     const hb = this.enemies.create(hx, hy, 'hammer_bro') as Phaser.Physics.Arcade.Sprite;
                     (hb.body as any).allowGravity = true;
                     hb.setVelocityX(40); hb.setData('dir', 40); (hb.body as any).setBounceX(1);
                     this.time.addEvent({ delay: 2000 + Phaser.Math.Between(0, 800), loop: true, callback: () => {
                        if (!hb.active || this.gameOver) return;
                        hb.setVelocityY(-350);
                     }});
                     this.time.addEvent({ delay: 1500 + Phaser.Math.Between(0, 600), loop: true, callback: () => {
                        if (!hb.active || this.gameOver || this.gameWon) return;
                        const hammer = this.enemies.create(hb.x, hb.y - 16, 'hammer') as Phaser.Physics.Arcade.Sprite;
                        (hammer.body as any).allowGravity = true;
                        hammer.setVelocityX(hb.flipX ? 120 : -120);
                        hammer.setVelocityY(-300);
                        this.tweens.add({ targets: hammer, angle: 360, duration: 400, repeat: -1 });
                        this.time.delayedCall(3000, () => { if (hammer && hammer.active) hammer.destroy(); });
                     }});
                  };
                  addHammerBro(3500, GY - B * 2); addHammerBro(5100, GY - B * 2);
                  // Coins
                  [[400, GY - 3 * B], [464, GY - 3 * B], [528, GY - 3 * B], [1000, GY - 6 * B], [1064, GY - 6 * B], [1700, GY - 3 * B], [1764, GY - 3 * B], [2500, GY - 4 * B], [2564, GY - 4 * B], [2628, GY - 4 * B], [3500, GY - 3 * B], [3564, GY - 3 * B], [4200, GY - 4 * B], [4264, GY - 4 * B], [5000, GY - 3 * B], [5064, GY - 3 * B], [5500, GY - 3 * B], [5564, GY - 3 * B], [5628, GY - 3 * B], [6000, GY - 4 * B], [6064, GY - 4 * B]].forEach(([cx, cy]) => { const coin = this.coins.create(cx as number, cy as number, 'coin') as Phaser.Physics.Arcade.Sprite; (coin.body as any).allowGravity = false; this.tweens.add({ targets: coin, y: (cy as number) - 6, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }); });
                  // Coin cluster (4 rows x 8 coins)
                  for (let row = 0; row < 4; row++) { for (let col = 0; col < 8; col++) { const cx = 4400 + col * 28; const cy = GY - (3 + row) * B; const coin = this.coins.create(cx, cy, 'coin') as Phaser.Physics.Arcade.Sprite; (coin.body as any).allowGravity = false; this.tweens.add({ targets: coin, y: cy - 6, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: col * 50 }); } }
                  buildStairs(6464); this.flags.create(6960, GY - 80, 'flag'); buildCastle(7400);
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
                  [[500, GY - 4 * B], [564, GY - 4 * B], [1000, GY - 6 * B], [1064, GY - 6 * B], [1128, GY - 6 * B], [1800, GY - 5 * B], [1864, GY - 5 * B], [2800, GY - 3 * B], [2864, GY - 3 * B], [3500, GY - 5 * B], [3564, GY - 5 * B], [3628, GY - 5 * B], [4500, GY - 4 * B], [4564, GY - 4 * B], [5500, GY - 3 * B], [5564, GY - 3 * B], [5800, GY - 4 * B], [5864, GY - 4 * B], [6100, GY - 3 * B], [6164, GY - 3 * B]].forEach(([cx, cy]) => { const coin = this.coins.create(cx as number, cy as number, 'coin') as Phaser.Physics.Arcade.Sprite; (coin.body as any).allowGravity = false; this.tweens.add({ targets: coin, y: (cy as number) - 6, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }); });
                  // Coin cluster (3 rows x 10 coins)
                  for (let row = 0; row < 3; row++) { for (let col = 0; col < 10; col++) { const cx = 3800 + col * 28; const cy = GY - (3 + row) * B; const coin = this.coins.create(cx, cy, 'coin') as Phaser.Physics.Arcade.Sprite; (coin.body as any).allowGravity = false; this.tweens.add({ targets: coin, y: cy - 6, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: col * 50 }); } }
                  buildStairs(6464, 'castle_wall'); this.flags.create(6960, GY - 80, 'flag'); buildCastle(7400);
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
                  buildStairs(6700, 'purple_block'); this.flags.create(7200, GY - 80, 'flag'); buildCastle(7600);
               } else if (lvl === 4) {
                  // Level 4 - Pillar Platforming (tall columns with green tops, gaps between)
                  this.add.rectangle(5000, 240, 10000, 480, 0x5c94fc).setDepth(-10).setData('decoration', true);
                  // Clouds in background
                  [[200, 80], [600, 120], [1100, 60], [1800, 100], [2400, 70], [3100, 110], [3800, 60], [4500, 90], [5200, 70], [5900, 100]].forEach(([cx, cy]) => this.add.image(cx as number, cy as number, 'cloud').setScale(0.8).setDepth(-3).setData('decoration', true));

                  // Helper: build a pillar (green flat top with rounded left/right edges + orange column)
                  const addPillar = (px: number, topY: number, width: number) => {
                     // Walkable blocks - main width plus small extensions for rounded edges
                     for (let i = 0; i < width; i++) { const b = this.blocks.create(px + i * B, topY, 'green_block') as Phaser.Physics.Arcade.Sprite; b.setAlpha(0); }
                     // Small extra blocks on left and right edges (half-width) for the curved parts
                     const bL = this.blocks.create(px - B / 2, topY, 'green_block') as Phaser.Physics.Arcade.Sprite; bL.setAlpha(0); bL.setSize(16, 32);
                     const bR = this.blocks.create(px + (width - 1) * B + B / 2, topY, 'green_block') as Phaser.Physics.Arcade.Sprite; bR.setAlpha(0); bR.setSize(16, 32);
                     // Visual: flat green top with rounded ends
                     const centerX = px + (width - 1) * B / 2;
                     const topWidth = width * B + 12;
                     // Main green bar
                     this.add.rectangle(centerX, topY, topWidth, 20, 0x32cd32).setDepth(3).setData('decoration', true);
                     // Rounded left end
                     this.add.circle(px - B / 2 - 4, topY, 10, 0x32cd32).setDepth(3).setData('decoration', true);
                     // Rounded right end
                     this.add.circle(px + (width - 1) * B + B / 2 + 4, topY, 10, 0x32cd32).setDepth(3).setData('decoration', true);
                     // Lighter top highlight
                     this.add.rectangle(centerX, topY - 6, topWidth - 8, 6, 0x3cb03c).setDepth(4).setData('decoration', true);
                     // Orange/brown column below - starts right below the green (no gap)
                     for (let i = 0; i < width; i++) {
                        for (let row = 0; row <= Math.ceil((500 - topY) / B); row++) {
                           this.add.rectangle(px + i * B, topY + 10 + row * B, B, B, 0xc84c0c).setDepth(-1).setData('decoration', true);
                        }
                     }
                  };

                  // Pillar sequence - varying heights and widths with gaps
                  // First pillar is where players spawn - make it at y=390 so players at y=360 land on it
                  addPillar(80, 390, 4);       // Starting pillar (low, wide) - spawn point
                  addPillar(320, 340, 3);      // Medium height
                  addPillar(530, 290, 2);      // Tall, narrow
                  addPillar(720, 360, 3);      // Medium-low
                  addPillar(960, 240, 3);      // Very tall
                  addPillar(1200, 320, 2);     // Medium-tall
                  addPillar(1420, 380, 3);     // Low
                  addPillar(1650, 270, 2);     // Tall
                  addPillar(1870, 340, 3);     // Medium
                  addPillar(2120, 220, 2);     // Very tall
                  addPillar(2340, 360, 3);     // Medium-low
                  addPillar(2580, 290, 2);     // Tall
                  addPillar(2800, 380, 3);     // Low
                  addPillar(3040, 260, 2);     // Tall
                  addPillar(3260, 330, 3);     // Medium
                  addPillar(3500, 230, 2);     // Very tall
                  addPillar(3720, 370, 3);     // Medium-low
                  addPillar(3960, 300, 2);     // Tall
                  addPillar(4180, 380, 3);     // Low
                  addPillar(4420, 250, 2);     // Very tall
                  addPillar(4640, 340, 3);     // Medium
                  addPillar(4880, 280, 2);     // Tall
                  addPillar(5100, 380, 3);     // Low
                  addPillar(5340, 310, 2);     // Medium-tall
                  addPillar(5560, 360, 3);     // Medium-low

                  // ? blocks above some pillars
                  [400, 1000, 1700, 2400, 3100, 3800, 4500, 5200].forEach(bx => { const qb = this.qBlocks.create(bx, 160, 'qblock'); qb.setData('active', true); });

                  // Enemies on top of pillars (spawn just above the pillar surface)
                  [[320, 340], [720, 360], [1200, 320], [1870, 340], [2340, 360], [2800, 380], [3260, 330], [3720, 370], [4180, 380], [4640, 340], [5100, 380]].forEach(([ex, ey], i) => i % 3 === 0 ? addKoopa(ex as number, (ey as number) - B) : addGoomba(ex as number, (ey as number) - B));

                  // Coins placed above each pillar (2 rows matching pillar width)
                  const pillarData: [number, number, number][] = [[80,390,4],[320,340,3],[530,290,2],[720,360,3],[960,240,3],[1200,320,2],[1420,380,3],[1650,270,2],[1870,340,3],[2120,220,2],[2340,360,3],[2580,290,2],[2800,380,3],[3040,260,2],[3260,330,3],[3500,230,2],[3720,370,3],[3960,300,2],[4180,380,3],[4420,250,2],[4640,340,3],[4880,280,2],[5100,380,3],[5340,310,2],[5560,360,3]];
                  pillarData.forEach(([px, topY, width]) => {
                     for (let row = 0; row < 2; row++) {
                        for (let i = 0; i < width; i++) {
                           const cy = topY - (2 + row) * B;
                           const coin = this.coins.create(px + i * B, cy, 'coin') as Phaser.Physics.Arcade.Sprite;
                           (coin.body as any).allowGravity = false;
                           this.tweens.add({ targets: coin, y: cy - 6, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
                        }
                     }
                  });

                  // End pillar with flag ON the surface
                  addPillar(5800, 340, 5);
                  this.flags.create(5900, 340 - 80, 'flag');

                  // Spawn both players from the sky so they land on the first pillar
                  // First pillar is at x=80, topY=390, width=4 blocks
                  if (this.p1 && this.p2) {
                     this.p1.setPosition(150, 100); this.p1.setVelocity(0, 0);
                     this.p2.setPosition(100, 100); this.p2.setVelocity(0, 0);
                  }

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

                  // Ground - floor sections (~1000px each) with WIDE lava pits between them
                  // Floor 1: x=0 to x=1000
                  for (let x = 0; x < 1000; x += B) { this.blocks.create(x + B / 2, GY, 'lava_block'); this.blocks.create(x + B / 2, GY2, 'lava_block'); }
                  // Lava pit 1: x=1000 to x=1600 (600px wide)
                  for (let x = 1000; x < 1600; x += B) { const lavaObs = this.obstacles.create(x + B / 2, GY + 8, 'lava') as Phaser.Physics.Arcade.Sprite; lavaObs.setSize(32, 16); lavaObs.setData('isLava', true); }
                  // Floor 2: x=1600 to x=2600
                  for (let x = 1600; x < 2600; x += B) { this.blocks.create(x + B / 2, GY, 'lava_block'); this.blocks.create(x + B / 2, GY2, 'lava_block'); }
                  // Lava pit 2: x=2600 to x=3300 (700px wide)
                  for (let x = 2600; x < 3300; x += B) { const lavaObs = this.obstacles.create(x + B / 2, GY + 8, 'lava') as Phaser.Physics.Arcade.Sprite; lavaObs.setSize(32, 16); lavaObs.setData('isLava', true); }
                  // Floor 3: x=3300 to x=4400 (leads to boss corridor)
                  for (let x = 3300; x < 4400; x += B) { this.blocks.create(x + B / 2, GY, 'lava_block'); this.blocks.create(x + B / 2, GY2, 'lava_block'); }

                  // Stairs on edges of lava pits
                  for (let step = 0; step < 3; step++) this.blocks.create(970 + step * B, GY - (step + 1) * B, 'lava_block');
                  for (let step = 0; step < 3; step++) this.blocks.create(1600 + step * B, GY - (3 - step) * B, 'lava_block');
                  for (let step = 0; step < 3; step++) this.blocks.create(2570 + step * B, GY - (step + 1) * B, 'lava_block');
                  for (let step = 0; step < 3; step++) this.blocks.create(3300 + step * B, GY - (3 - step) * B, 'lava_block');

                  // Small moving bridges over lava pits (player moves with them)
                  addMovPlat(1300, GY - 2 * B, 50, 80);
                  addMovPlat(2950, GY - 2 * B, -45, 100);

                  // Wall puzzles - vertical walls you have to jump over
                  for (let row = 0; row < 4; row++) this.blocks.create(500, GY - row * B, 'lava_block');
                  for (let row = 0; row < 5; row++) this.blocks.create(2000, GY - row * B, 'lava_block');
                  for (let row = 0; row < 3; row++) this.blocks.create(3600, GY - row * B, 'lava_block');
                  // Overhead blocks (tight squeeze sections)
                  for (let i = 0; i < 3; i++) this.blocks.create(1800 + i * B, GY - 3 * B, 'lava_block');
                  for (let i = 0; i < 3; i++) this.blocks.create(3800 + i * B, GY - 3 * B, 'lava_block');

                  // Fireballs shooting up from lava pits
                  [1200, 1400, 2800, 3100].forEach(s => {
                     this.time.addEvent({ delay: 2200 + Phaser.Math.Between(0, 800), loop: true, callback: () => {
                        if (this.gameOver || this.gameWon) return;
                        const fb = this.fireballs.create(s, GY + 10, 'fireball') as Phaser.Physics.Arcade.Sprite;
                        (fb.body as any).allowGravity = false;
                        fb.setVelocityY(-350);
                        this.time.delayedCall(2000, () => { if (fb && fb.active) fb.destroy(); });
                     }});
                  });

                  // Enemies
                  [300, 700, 1800, 2200, 3500, 4000].forEach((ex, i) => i % 2 === 0 ? addGoomba(ex) : addKoopa(ex));

                  // Fire bars
                  const addFireBar = (cx: number, cy: number, length: number, speed: number) => {
                     this.add.image(cx, cy, 'firebar_center').setDepth(4).setData('decoration', true);
                     for (let i = 1; i <= length; i++) {
                        const ball = this.add.image(cx, cy - i * 16, 'firebar_ball').setDepth(4);
                        ball.setData('centerX', cx); ball.setData('centerY', cy);
                        ball.setData('radius', i * 16); ball.setData('speed', speed);
                        ball.setData('angle', 0); ball.setData('firebar', true);
                     }
                  };
                  addFireBar(500, GY - 4 * B, 4, 2.5);
                  addFireBar(2000, GY - 5 * B, 4, -3);
                  addFireBar(3600, GY - 3 * B, 3, 2);

                  // ? blocks
                  [350, 1800, 2100, 3500, 4100].forEach(bx => { const qb = this.qBlocks.create(bx, GY - 5 * B, 'qblock'); qb.setData('active', true); });

                  // Coins
                  [[200, GY - 3 * B], [264, GY - 3 * B], [800, GY - 4 * B], [864, GY - 4 * B], [1700, GY - 3 * B], [1764, GY - 3 * B], [2200, GY - 4 * B], [2264, GY - 4 * B], [3500, GY - 3 * B], [3564, GY - 3 * B]].forEach(([cx, cy]) => { const coin = this.coins.create(cx as number, cy as number, 'coin') as Phaser.Physics.Arcade.Sprite; (coin.body as any).allowGravity = false; this.tweens.add({ targets: coin, y: (cy as number) - 6, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }); });

                  // Corridor before boss arena (auto-scroll section with 3 guaranteed 1-up ? blocks)
                  for (let x = 4400; x < 4900; x += B) { this.blocks.create(x + B / 2, GY, 'lava_block'); this.blocks.create(x + B / 2, GY2, 'lava_block'); }
                  // 3 ? blocks that always give green 1-up mushrooms
                  [4500, 4650, 4800].forEach(bx => { const qb = this.qBlocks.create(bx, GY - 4 * B, 'qblock'); qb.setData('active', true); qb.setData('force1Up', true); });

                  // === BOWSER BOSS ARENA (starts at x=4900, smaller arena) ===
                  // Boss arena floor
                  for (let x = 4900; x < 5700; x += B) { this.blocks.create(x + B / 2, GY, 'lava_block'); this.blocks.create(x + B / 2, GY2, 'lava_block'); }
                  // Arena walls (left and right)
                  for (let row = 0; row < 10; row++) { this.blocks.create(4900, GY - row * B, 'lava_block'); this.blocks.create(5700, GY - row * B, 'lava_block'); }

                  // Bowser boss - starts idle, waiting
                  const bowser = this.enemies.create(5400, GY - 66, 'bowser') as Phaser.Physics.Arcade.Sprite;
                  (bowser.body as any).allowGravity = true;
                  bowser.setData('isBoss', true); bowser.setData('bossHP', 20); bowser.setData('dir', 0);
                  bowser.setVelocityX(0); // Stays still until activated
                  bowser.setScale(1.8); bowser.setBodySize(50, 56);
                  bowser.setCollideWorldBounds(false);
                  bowser.setData('activated', false);

                  // Bowser stomping/shaking animation
                  this.tweens.add({ targets: bowser, angle: -3, duration: 150, yoyo: true, repeat: -1 });
                  this.tweens.add({ targets: bowser, scaleY: 1.75, duration: 200, yoyo: true, repeat: -1, delay: 100 });

                  // Bowser collides with arena walls
                  this.physics.add.collider(bowser, this.blocks);

                  // Boss health bar (hidden until Bowser is on screen)
                  const bossBarBg = this.add.rectangle(400, 460, 304, 20, 0x333333).setScrollFactor(0).setDepth(998).setAlpha(0);
                  const bossBarFill = this.add.rectangle(400, 460, 300, 16, 0xff0000).setScrollFactor(0).setDepth(999).setAlpha(0);
                  const bossBarText = this.add.text(400, 460, 'BOWSER', { fontSize: '12px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5).setScrollFactor(0).setDepth(999).setAlpha(0);
                  bowser.setData('barFill', bossBarFill); bowser.setData('barBg', bossBarBg); bowser.setData('barText', bossBarText); bowser.setData('barShown', false);

                  // Bowser activation functions (only start after camera reaches him)
                  const activateBowser = () => {
                     if (bowser.getData('activated')) return;
                     bowser.setData('activated', true);
                     bowser.setVelocityX(-100); (bowser.body as any).setBounceX(1);

                     // Bowser jumps at random intervals
                     const bowserJump = () => {
                        if (!bowser.active || this.gameOver || this.gameWon) return;
                        bowser.setVelocityY(-550);
                        this.time.delayedCall(Phaser.Math.Between(2500, 4500), bowserJump);
                     };
                     this.time.delayedCall(1500, bowserJump);

                     // Bowser breathes fire every 2 seconds
                     const bowserFire = () => {
                        if (!bowser.active || this.gameOver || this.gameWon) return;
                        const d1 = Math.abs(this.p1.x - bowser.x);
                        const d2 = Math.abs(this.p2.x - bowser.x);
                        const target = d1 < d2 ? this.p1 : this.p2;
                        const fireLeft = target.x < bowser.x;
                        bowser.setFlipX(!fireLeft);
                        const offsetX = fireLeft ? -50 : 50;
                        const velX = fireLeft ? -180 : 180;
                        const fb = this.fireballs.create(bowser.x + offsetX, bowser.y + 10, 'fire_breath') as Phaser.Physics.Arcade.Sprite;
                        (fb.body as any).allowGravity = false;
                        fb.setVelocityX(velX);
                        if (!fireLeft) fb.setFlipX(true);
                        try { this.sound.play('bowserfire', { volume: sfxVolumeRef.current * 0.8 }); } catch (e) {}
                        this.time.delayedCall(4000, () => { if (fb && fb.active) fb.destroy(); });
                        this.time.delayedCall(2000, bowserFire);
                     };
                     this.time.delayedCall(2000, bowserFire);

                     // Bowser changes direction randomly
                     this.time.addEvent({ delay: 2000, loop: true, callback: () => {
                        if (!bowser.active || this.gameOver || this.gameWon) return;
                        if (Math.random() < 0.4) {
                           const newSpeed = Phaser.Math.Between(60, 140) * (Math.random() < 0.5 ? -1 : 1);
                           bowser.setVelocityX(newSpeed);
                        }
                     }});
                  };
                  bowser.setData('activateFn', activateBowser);

                  // Camera auto-scroll trigger: when player crosses x=4600, camera auto-scrolls to arena
                  bowser.setData('cameraTriggered', false);

                  // No flag in level 5 - defeating Bowser ends the game
               }
               this.startBGM();
               // Start level timer (2 minutes, then -1 HP every 30s)
               this.levelTimer = 120;
               if (this.timerEvent) this.timerEvent.destroy();
               this.timerEvent = this.time.addEvent({ delay: 1000, loop: true, callback: () => {
                  if (this.gameOver || this.gameWon || this.countingDown) return;
                  this.levelTimer--;
                  if (this.levelTimer < 0 && this.levelTimer % 30 === 0) {
                     this.takeDamage(this.myPlayer);
                  }
               }});
            }

            showComingSoon(lvl: number) {
               this.add.rectangle(400, 240, 800, 480, 0x1a1a2e).setScrollFactor(0).setDepth(-10).setData('decoration', true);
               this.add.text(400, 200, `LEVEL ${lvl}\nCOMING SOON!`, { fontSize: "40px", color: "#ffd700", fontStyle: "bold", align: "center", stroke: "#000", strokeThickness: 4 }).setOrigin(0.5).setScrollFactor(0).setDepth(10).setData('decoration', true);
               this.add.text(400, 300, "Create new levels in the Level Editor!", { fontSize: "18px", color: "#ffffff", align: "center", fontStyle: "bold" }).setOrigin(0.5).setScrollFactor(0).setDepth(10).setData('decoration', true);
               if (this.p1 && this.p2) {
                  this.p1.setPosition(300, 240);
                  this.p2.setPosition(500, 240);
                  (this.p1.body as any).allowGravity = false;
                  (this.p2.body as any).allowGravity = false;
                  this.p1.setVelocity(0, 0);
                  this.p2.setVelocity(0, 0);
               }
               if (this.currentBgm) { this.currentBgm.stop(); this.currentBgm.destroy(); this.currentBgm = null; }
            }

            generateCustomLevel(levelData: LevelData) {
               // Clear existing level objects (same pattern as generateLevel)
               this.blocks.clear(true, true); this.obstacles.clear(true, true); this.enemies.clear(true, true); this.qBlocks.clear(true, true); this.flags.clear(true, true); this.fireballs.clear(true, true); this.movingPlatforms.clear(true, true); this.mushrooms?.clear(true, true); this.piranhas?.clear(true, true); this.coins?.clear(true, true);
               this.children.list.filter((c: any) => c.getData && c.getData('decoration')).forEach((c: any) => c.destroy());

               if (this.p1 && this.p2) {
                  this.p1.setAlpha(1); this.p2.setAlpha(1);
                  this.p1.setDepth(10); this.p2.setDepth(10);
                  this.p1.setScale(this.p1.getData('isBig') ? 1.4 : 1);
                  this.p2.setScale(this.p2.getData('isBig') ? 1.4 : 1);
                  if (this.p1.body) (this.p1.body as any).enable = true;
                  if (this.p2.body) (this.p2.body as any).enable = true;
                  (this.p1.body as any).allowGravity = true;
                  (this.p2.body as any).allowGravity = true;
               }

               const B = 32;
               const GY = 440;
               const eSpeed = 55 + (this.level || 6) * 12;

               // Background
               this.add.rectangle(5000, 240, 10000, 480, 0x5c94fc).setDepth(-10).setData('decoration', true);

               // Helper functions (same as built-in levels)
               const addPipe = (px: number, segs: number, piranha = false, purple = false) => {
                  const bodyTex = purple ? 'purple_pipe_body' : 'pipe_body';
                  const capTex = purple ? 'purple_pipe_cap' : 'pipe_cap';
                  for (let s = 0; s < segs - 1; s++) (this.blocks.create(px, GY - B * (s + 1), bodyTex) as Phaser.Physics.Arcade.Sprite).setDepth(2);
                  (this.blocks.create(px, GY - B * segs + 7, capTex) as Phaser.Physics.Arcade.Sprite).setDepth(2);
                  if (piranha) {
                     const topY = GY - B * segs - 20; const hiddenY = GY - B * (segs - 1) + 4;
                     const pl = this.piranhas.create(px, hiddenY, 'piranha') as Phaser.Physics.Arcade.Sprite;
                     (pl.body as any).allowGravity = false; pl.setDepth(1);
                     this.tweens.add({ targets: pl, y: topY, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: Phaser.Math.Between(0, 900) });
                  }
               };
               const addGoomba = (ex: number, ey: number) => { const en = this.enemies.create(ex, ey, 'enemy') as Phaser.Physics.Arcade.Sprite; (en.body as any).allowGravity = true; en.setVelocityX(-eSpeed); en.setData('dir', -eSpeed); (en.body as any).setBounceX(1); };
               const addKoopa = (ex: number, ey: number) => { const kp = this.enemies.create(ex, ey, 'koopa') as Phaser.Physics.Arcade.Sprite; (kp.body as any).allowGravity = true; kp.setVelocityX(-eSpeed * 0.8); kp.setData('dir', -eSpeed * 0.8); (kp.body as any).setBounceX(1); };
               const addMovPlat = (px: number, py: number, spd: number, range = 90) => { const pl = this.movingPlatforms.create(px, py, 'movingPlat') as Phaser.Physics.Arcade.Sprite; pl.setData('originX', px); pl.setData('speed', spd); pl.setData('range', range); (pl.body as any).allowGravity = false; (pl.body as any).immovable = true; };
               const addHammerBro = (hx: number, hy: number) => {
                  const hb = this.enemies.create(hx, hy, 'hammer_bro') as Phaser.Physics.Arcade.Sprite;
                  (hb.body as any).allowGravity = true;
                  hb.setVelocityX(40); hb.setData('dir', 40); (hb.body as any).setBounceX(1);
                  this.time.addEvent({ delay: 2000 + Phaser.Math.Between(0, 800), loop: true, callback: () => { if (!hb.active || this.gameOver) return; hb.setVelocityY(-350); }});
                  this.time.addEvent({ delay: 1500 + Phaser.Math.Between(0, 600), loop: true, callback: () => {
                     if (!hb.active || this.gameOver || this.gameWon) return;
                     const hammer = this.enemies.create(hb.x, hb.y - 16, 'hammer') as Phaser.Physics.Arcade.Sprite;
                     (hammer.body as any).allowGravity = true; hammer.setVelocityX(hb.flipX ? 120 : -120); hammer.setVelocityY(-300);
                     this.tweens.add({ targets: hammer, angle: 360, duration: 400, repeat: -1 });
                     this.time.delayedCall(3000, () => { if (hammer && hammer.active) hammer.destroy(); });
                  }});
               };
               const buildCastle = (cx: number) => {
                  this.castleX = cx;
                  const doorBg = this.add.rectangle(cx + 80, GY - 48, 32, 64, 0x000000).setDepth(1);
                  doorBg.setData('decoration', true);
                  for (let col = 0; col < 5; col++) {
                     for (let row = 0; row < 4; row++) {
                        if (col === 2 && row < 3) continue;
                        const wall = this.blocks.create(cx + col * B + B / 2, GY - row * B, 'castle_wall') as Phaser.Physics.Arcade.Sprite;
                        wall.setDepth(12);
                     }
                  }
                  for (let row = 4; row < 7; row++) {
                     const wallL = this.blocks.create(cx + B / 2, GY - row * B, 'castle_wall') as Phaser.Physics.Arcade.Sprite;
                     const wallR = this.blocks.create(cx + 4 * B + B / 2, GY - row * B, 'castle_wall') as Phaser.Physics.Arcade.Sprite;
                     wallL.setDepth(12); wallR.setDepth(12);
                  }
               };

               // Process each object from levelData
               for (const obj of levelData.objects) {
                  // Convert editor grid position to game pixel position
                  // Editor canvas is 440px visible (rows 0-13), game is 480px
                  // Add 40px offset so editor bottom aligns with game ground area
                  const x = obj.col * B + B / 2;
                  const y = obj.row * B + B / 2 + 40;
                  const objWidth = obj.properties?.width ?? 1;
                  const objHeight = obj.properties?.height ?? 1;

                  switch (obj.type) {
                     case 'ground_block': {
                        if (objWidth > 1 || objHeight > 1) {
                           for (let dc = 0; dc < objWidth; dc++) {
                              for (let dr = 0; dr < objHeight; dr++) {
                                 this.blocks.create(x + dc * B, y + dr * B, 'block');
                              }
                           }
                        } else {
                           this.blocks.create(x, y, 'block');
                        }
                        break;
                     }
                     case 'purple_block': {
                        if (objWidth > 1 || objHeight > 1) {
                           for (let dc = 0; dc < objWidth; dc++) {
                              for (let dr = 0; dr < objHeight; dr++) {
                                 this.blocks.create(x + dc * B, y + dr * B, 'purple_block');
                              }
                           }
                        } else {
                           this.blocks.create(x, y, 'purple_block');
                        }
                        break;
                     }
                     case 'castle_wall': {
                        if (objWidth > 1 || objHeight > 1) {
                           for (let dc = 0; dc < objWidth; dc++) {
                              for (let dr = 0; dr < objHeight; dr++) {
                                 (this.blocks.create(x + dc * B, y + dr * B, 'castle_wall') as Phaser.Physics.Arcade.Sprite).setDepth(12);
                              }
                           }
                        } else {
                           (this.blocks.create(x, y, 'castle_wall') as Phaser.Physics.Arcade.Sprite).setDepth(12);
                        }
                        break;
                     }
                     case 'stair_block': {
                        if (objWidth > 1 || objHeight > 1) {
                           for (let dc = 0; dc < objWidth; dc++) {
                              for (let dr = 0; dr < objHeight; dr++) {
                                 this.blocks.create(x + dc * B, y + dr * B, 'block');
                              }
                           }
                        } else {
                           this.blocks.create(x, y, 'block');
                        }
                        break;
                     }
                     case 'green_pipe_2':
                     case 'green_pipe_3':
                     case 'green_pipe_4': {
                        const segs = obj.properties?.height || obj.properties?.pipeHeight || parseInt(obj.type.slice(-1));
                        const piranha = obj.properties?.hasPiranha || false;
                        const capTex = 'pipe_cap';
                        const bodyTex = 'pipe_body';
                        // Place cap at top, body segments immediately below (no gap)
                        (this.blocks.create(x, y, capTex) as Phaser.Physics.Arcade.Sprite).setDepth(2);
                        for (let s = 1; s < segs; s++) {
                           (this.blocks.create(x, y + 9 + (s - 1) * B + B / 2, bodyTex) as Phaser.Physics.Arcade.Sprite).setDepth(2);
                        }
                        if (piranha) {
                           const topY = y - 20;
                           const hiddenY = y + 4;
                           const pl = this.piranhas.create(x, hiddenY, 'piranha') as Phaser.Physics.Arcade.Sprite;
                           (pl.body as any).allowGravity = false; pl.setDepth(1);
                           this.tweens.add({ targets: pl, y: topY, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: Phaser.Math.Between(0, 900) });
                        }
                        break;
                     }
                     case 'purple_pipe_2':
                     case 'purple_pipe_3':
                     case 'purple_pipe_4': {
                        const segs = obj.properties?.height || obj.properties?.pipeHeight || parseInt(obj.type.slice(-1));
                        const piranha = obj.properties?.hasPiranha || false;
                        const capTex2 = 'purple_pipe_cap';
                        const bodyTex2 = 'purple_pipe_body';
                        (this.blocks.create(x, y, capTex2) as Phaser.Physics.Arcade.Sprite).setDepth(2);
                        for (let s = 1; s < segs; s++) {
                           (this.blocks.create(x, y + 9 + (s - 1) * B + B / 2, bodyTex2) as Phaser.Physics.Arcade.Sprite).setDepth(2);
                        }
                        if (piranha) {
                           const topY = y - 20;
                           const hiddenY = y + 4;
                           const pl = this.piranhas.create(x, hiddenY, 'piranha') as Phaser.Physics.Arcade.Sprite;
                           (pl.body as any).allowGravity = false; pl.setDepth(1);
                           this.tweens.add({ targets: pl, y: topY, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: Phaser.Math.Between(0, 900) });
                        }
                        break;
                     }
                     case 'goomba':
                        addGoomba(x, y);
                        break;
                     case 'koopa':
                        addKoopa(x, y);
                        break;
                     case 'hammer_brother':
                        addHammerBro(x, y);
                        break;
                     case 'piranha_plant': {
                        const pl = this.piranhas.create(x, y, 'piranha') as Phaser.Physics.Arcade.Sprite;
                        (pl.body as any).allowGravity = false; pl.setDepth(1);
                        this.tweens.add({ targets: pl, y: y - 40, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: Phaser.Math.Between(0, 900) });
                        break;
                     }
                     case 'coin': {
                        const coin = this.coins.create(x, y, 'coin') as Phaser.Physics.Arcade.Sprite;
                        (coin.body as any).allowGravity = false;
                        this.tweens.add({ targets: coin, y: y - 6, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
                        break;
                     }
                     case 'question_block': {
                        if (objWidth > 1 || objHeight > 1) {
                           for (let dc = 0; dc < objWidth; dc++) {
                              for (let dr = 0; dr < objHeight; dr++) {
                                 const qb = this.qBlocks.create(x + dc * B, y + dr * B, 'qblock');
                                 qb.setData('active', true);
                              }
                           }
                        } else {
                           const qb = this.qBlocks.create(x, y, 'qblock');
                           qb.setData('active', true);
                        }
                        break;
                     }
                     case 'mushroom_block': {
                        if (objWidth > 1 || objHeight > 1) {
                           for (let dc = 0; dc < objWidth; dc++) {
                              for (let dr = 0; dr < objHeight; dr++) {
                                 this.blocks.create(x + dc * B, y + dr * B, 'block');
                              }
                           }
                        } else {
                           this.blocks.create(x, y, 'block');
                        }
                        break;
                     }
                     case 'moving_platform': {
                        const speed = (obj.properties?.speed || 2) * 30;
                        const range = (obj.properties?.movementRange || 4) * B;
                        const platWidth = obj.properties?.width || 1;
                        const platHeight = obj.properties?.height || 1;
                        if (platWidth > 1 || platHeight > 1) {
                           const totalW = platWidth * B;
                           const totalH = platHeight > 1 ? platHeight * B : 16;
                           const pl = this.movingPlatforms.create(x + (platWidth - 1) * B / 2, y + (platHeight - 1) * B / 2, 'movingPlat') as Phaser.Physics.Arcade.Sprite;
                           pl.setDisplaySize(totalW, totalH);
                           (pl.body as any).setSize(totalW, totalH);
                           pl.setData('originX', x + (platWidth - 1) * B / 2);
                           pl.setData('speed', speed);
                           pl.setData('range', range);
                           (pl.body as any).allowGravity = false;
                           (pl.body as any).immovable = true;
                        } else {
                           addMovPlat(x, y, speed, range);
                        }
                        break;
                     }
                     case 'power_mushroom': {
                        const mush = this.mushrooms.create(x, y, 'power_mushroom') as Phaser.Physics.Arcade.Sprite;
                        (mush.body as any).allowGravity = false;
                        mush.setData('type', 'power');
                        break;
                     }
                     case 'poison_mushroom': {
                        const pmush = this.enemies.create(x, y, 'poison_mushroom') as Phaser.Physics.Arcade.Sprite;
                        (pmush.body as any).allowGravity = true;
                        pmush.setVelocityX(-40);
                        pmush.setData('dir', -40);
                        (pmush.body as any).setBounceX(1);
                        break;
                     }
                     case 'invincibility_star': {
                        const star = this.coins.create(x, y, 'invincibility_star') as Phaser.Physics.Arcade.Sprite;
                        (star.body as any).allowGravity = false;
                        star.setData('type', 'star');
                        this.tweens.add({ targets: star, y: y - 8, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
                        break;
                     }
                     case 'fire_flower': {
                        const flower = this.coins.create(x, y, 'fire_flower') as Phaser.Physics.Arcade.Sprite;
                        (flower.body as any).allowGravity = false;
                        flower.setData('type', 'fire_flower');
                        break;
                     }
                     case 'koopa_shell': {
                        const shell = this.enemies.create(x, y, 'koopa_shell') as Phaser.Physics.Arcade.Sprite;
                        (shell.body as any).allowGravity = true;
                        shell.setVelocityX(-200);
                        shell.setData('dir', -200);
                        (shell.body as any).setBounceX(1);
                        break;
                     }
                     case 'bullet_bill_cannon': {
                        this.blocks.create(x, y, 'cannon');
                        const cannonY = y;
                        this.time.addEvent({ delay: 2500 + Phaser.Math.Between(0, 1000), loop: true, callback: () => {
                           if (this.gameOver || this.gameWon || this.countingDown) return;
                           const bullet = this.enemies.create(x - 20, cannonY - 20, 'bullet_bill') as Phaser.Physics.Arcade.Sprite;
                           (bullet.body as any).allowGravity = false;
                           bullet.setVelocityX(-180);
                           bullet.setData('dir', -180);
                           this.time.delayedCall(5000, () => { if (bullet && bullet.active) bullet.destroy(); });
                        }});
                        break;
                     }
                     case 'fire_bar': {
                        // Rotating fire bar - place center block and animate fireballs
                        this.blocks.create(x, y, 'firebar_center');
                        const numBalls = 5;
                        const barBalls: Phaser.GameObjects.Image[] = [];
                        for (let i = 1; i <= numBalls; i++) {
                           const ball = this.add.image(x + i * 14, y, 'firebar_ball').setDepth(5).setData('decoration', true);
                           barBalls.push(ball);
                        }
                        // Create a tween to rotate the balls
                        let angle = 0;
                        this.time.addEvent({ delay: 30, loop: true, callback: () => {
                           if (this.gameOver || this.gameWon) return;
                           angle += 0.04;
                           barBalls.forEach((ball, i) => {
                              const dist = (i + 1) * 14;
                              ball.setPosition(x + Math.cos(angle) * dist, y + Math.sin(angle) * dist);
                           });
                        }});
                        // Add collision via an enemy sprite that follows the end ball
                        const fireHitbox = this.enemies.create(x, y, 'firebar_ball') as Phaser.Physics.Arcade.Sprite;
                        (fireHitbox.body as any).allowGravity = false;
                        fireHitbox.setAlpha(0);
                        this.time.addEvent({ delay: 30, loop: true, callback: () => {
                           if (barBalls.length > 0) {
                              const lastBall = barBalls[barBalls.length - 1];
                              fireHitbox.setPosition(lastBall.x, lastBall.y);
                           }
                        }});
                        break;
                     }
                     case 'lakitu': {
                        const lak = this.enemies.create(x, y, 'lakitu') as Phaser.Physics.Arcade.Sprite;
                        (lak.body as any).allowGravity = false;
                        lak.setVelocityX(30);
                        lak.setData('dir', 30);
                        // Float and periodically drop spinies (goombas as stand-in)
                        this.tweens.add({ targets: lak, y: y - 20, duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
                        this.time.addEvent({ delay: 3000 + Phaser.Math.Between(0, 1000), loop: true, callback: () => {
                           if (!lak.active || this.gameOver || this.gameWon) return;
                           const spiny = this.enemies.create(lak.x, lak.y + 16, 'enemy') as Phaser.Physics.Arcade.Sprite;
                           (spiny.body as any).allowGravity = true;
                           spiny.setVelocityX(Phaser.Math.Between(-60, 60));
                        }});
                        break;
                     }
                     case 'chain_chomp': {
                        const chomp = this.enemies.create(x, y, 'chain_chomp') as Phaser.Physics.Arcade.Sprite;
                        (chomp.body as any).allowGravity = false;
                        chomp.setData('originX', x);
                        chomp.setData('originY', y);
                        // Lunge behavior
                        this.time.addEvent({ delay: 1500 + Phaser.Math.Between(0, 500), loop: true, callback: () => {
                           if (!chomp.active || this.gameOver || this.gameWon) return;
                           // Lunge toward closest player direction
                           const targetX = (this.p1 && this.p1.active) ? this.p1.x : x;
                           const dir = targetX > x ? 1 : -1;
                           this.tweens.add({ targets: chomp, x: x + dir * 64, duration: 300, yoyo: true, ease: 'Quad.easeOut' });
                        }});
                        break;
                     }
                     case 'ice_block': {
                        if (objWidth > 1 || objHeight > 1) {
                           for (let dc = 0; dc < objWidth; dc++) {
                              for (let dr = 0; dr < objHeight; dr++) {
                                 const iceB = this.blocks.create(x + dc * B, y + dr * B, 'ice_block') as Phaser.Physics.Arcade.Sprite;
                                 iceB.setData('slippery', true);
                              }
                           }
                        } else {
                           const iceB = this.blocks.create(x, y, 'ice_block') as Phaser.Physics.Arcade.Sprite;
                           iceB.setData('slippery', true);
                        }
                        break;
                     }
                     case 'bounce_block': {
                        if (objWidth > 1 || objHeight > 1) {
                           for (let dc = 0; dc < objWidth; dc++) {
                              for (let dr = 0; dr < objHeight; dr++) {
                                 const bounceB = this.blocks.create(x + dc * B, y + dr * B, 'bounce_block') as Phaser.Physics.Arcade.Sprite;
                                 bounceB.setData('bouncy', true);
                              }
                           }
                        } else {
                           const bounceB = this.blocks.create(x, y, 'bounce_block') as Phaser.Physics.Arcade.Sprite;
                           bounceB.setData('bouncy', true);
                        }
                        break;
                     }
                     case 'breakable_block': {
                        if (objWidth > 1 || objHeight > 1) {
                           for (let dc = 0; dc < objWidth; dc++) {
                              for (let dr = 0; dr < objHeight; dr++) {
                                 const breakB = this.blocks.create(x + dc * B, y + dr * B, 'breakable_block') as Phaser.Physics.Arcade.Sprite;
                                 breakB.setData('breakable', true);
                              }
                           }
                        } else {
                           const breakB = this.blocks.create(x, y, 'breakable_block') as Phaser.Physics.Arcade.Sprite;
                           breakB.setData('breakable', true);
                        }
                        break;
                     }
                     case 'flag_pole':
                        this.flags.create(x, y, 'flag');
                        break;
                     case 'castle':
                        buildCastle(x - B * 2);
                        break;
                     case 'bush':
                        this.add.image(x, y, 'hill').setScale(0.8).setDepth(-3).setData('decoration', true);
                        break;
                     case 'cloud':
                        this.add.image(x, y, 'cloud').setScale(0.8).setDepth(-5).setData('decoration', true);
                        break;
                     case 'hill':
                        this.add.image(x, y, 'hill').setScale(1.2).setDepth(-3).setData('decoration', true);
                        break;
                     default:
                        console.warn(`[generateCustomLevel] Unrecognized object type: "${(obj as any).type}" at col=${obj.col}, row=${obj.row}. Skipping.`);
                        break;
                  }
               }

               // Spawn players at standard positions
               if (this.p1 && this.p2) {
                  this.p1.setPosition(150, 360); this.p1.setVelocity(0, 0);
                  this.p2.setPosition(80, 360); this.p2.setVelocity(0, 0);
               }

               // Start level timer
               this.levelTimer = 120;
               if (this.timerEvent) this.timerEvent.destroy();
               this.timerEvent = this.time.addEvent({ delay: 1000, loop: true, callback: () => {
                  if (this.gameOver || this.gameWon || this.countingDown) return;
                  this.levelTimer--;
                  if (this.levelTimer < 0 && this.levelTimer % 30 === 0) {
                     this.takeDamage(this.myPlayer);
                  }
               }});
            }

            musicPowerUp() { this.playPowerUpSound(); }
            playBrickSound() {
                if (!this.audioCtx || sfxVolumeRef.current <= 0) return;
                const vol = sfxVolumeRef.current;
                const now = this.audioCtx.currentTime;
                const osc1 = this.audioCtx.createOscillator();
                const gain1 = this.audioCtx.createGain();
                osc1.type = 'square';
                osc1.frequency.setValueAtTime(220, now);
                osc1.frequency.exponentialRampToValueAtTime(80, now + 0.08);
                gain1.gain.setValueAtTime(0.35 * vol, now);
                gain1.gain.exponentialRampToValueAtTime(0.00001, now + 0.12);
                osc1.connect(gain1); gain1.connect(this.audioCtx.destination);
                osc1.start(now); osc1.stop(now + 0.12);

                const osc2 = this.audioCtx.createOscillator();
                const gain2 = this.audioCtx.createGain();
                osc2.type = 'sawtooth';
                osc2.frequency.setValueAtTime(600, now);
                osc2.frequency.exponentialRampToValueAtTime(200, now + 0.07);
                gain2.gain.setValueAtTime(0.2 * vol, now);
                gain2.gain.exponentialRampToValueAtTime(0.00001, now + 0.07);
                osc2.connect(gain2); gain2.connect(this.audioCtx.destination);
                osc2.start(now); osc2.stop(now + 0.07);
             }

             playBrickBreakSound() {
                if (!this.audioCtx || sfxVolumeRef.current <= 0) return;
                const vol = sfxVolumeRef.current;
                const now = this.audioCtx.currentTime;
                const osc1 = this.audioCtx.createOscillator();
                const gain1 = this.audioCtx.createGain();
                osc1.type = 'square';
                osc1.frequency.setValueAtTime(300, now);
                osc1.frequency.exponentialRampToValueAtTime(50, now + 0.1);
                gain1.gain.setValueAtTime(0.5 * vol, now);
                gain1.gain.exponentialRampToValueAtTime(0.00001, now + 0.15);
                osc1.connect(gain1); gain1.connect(this.audioCtx.destination);
                osc1.start(now); osc1.stop(now + 0.15);

                const osc2 = this.audioCtx.createOscillator();
                const gain2 = this.audioCtx.createGain();
                osc2.type = 'sawtooth';
                osc2.frequency.setValueAtTime(900, now);
                osc2.frequency.exponentialRampToValueAtTime(150, now + 0.08);
                gain2.gain.setValueAtTime(0.35 * vol, now);
                gain2.gain.exponentialRampToValueAtTime(0.00001, now + 0.08);
                osc2.connect(gain2); gain2.connect(this.audioCtx.destination);
                osc2.start(now); osc2.stop(now + 0.08);

                const osc3 = this.audioCtx.createOscillator();
                const gain3 = this.audioCtx.createGain();
                osc3.type = 'sawtooth';
                osc3.frequency.setValueAtTime(500, now + 0.04);
                osc3.frequency.exponentialRampToValueAtTime(100, now + 0.12);
                gain3.gain.setValueAtTime(0.25 * vol, now + 0.04);
                gain3.gain.exponentialRampToValueAtTime(0.00001, now + 0.12);
                osc3.connect(gain3); gain3.connect(this.audioCtx.destination);
                osc3.start(now + 0.04); osc3.stop(now + 0.12);
             }
            hitBlock(player: any, block: any) { if (!player.body.touching.up || !block.body?.touching.down || block.y >= 430) return; const now = Date.now(); if (block.getData('lastBump') && now - block.getData('lastBump') < 300) return; block.setData('lastBump', now); if (player.getData('isBig')) { this.playBrickBreakSound(); this.addScore(200); const bx = block.x; const by = block.y; const debrisColors = [0xc84c0c, 0xfc9838, 0x7c3800]; for (let i = 0; i < 4; i++) { const chunk = this.add.rectangle(bx + (i % 2 === 0 ? -8 : 8), by + (i < 2 ? -4 : 4), 10, 10, debrisColors[i % debrisColors.length]); const vx = (i % 2 === 0 ? -1 : 1) * Phaser.Math.Between(80, 160); const vy = i < 2 ? -Phaser.Math.Between(200, 340) : -Phaser.Math.Between(80, 180); this.tweens.add({ targets: chunk, x: chunk.x + vx * 0.6, y: chunk.y + vy * 0.5, angle: Phaser.Math.Between(-180, 180), alpha: 0, duration: 380, ease: 'Quad.easeIn', onComplete: () => chunk.destroy() }); } block.destroy(); } else { this.playBrickSound(); const origY = block.y; this.tweens.add({ targets: block, y: origY - 8, duration: 60, yoyo: true, ease: 'Quad.easeOut', onComplete: () => { block.y = origY; block.refreshBody(); } }); } }
            hitQBlock(player: any, block: any) { if (player.body.touching.up && block.body?.touching.down && block.getData('active')) { block.setData('active', false); block.setTexture('qblock_empty'); this.playPowerUpSound(); const is1Up = block.getData('force1Up'); if (is1Up) { const mush = this.mushrooms.create(block.x, block.y - 28, 'mushroom_1up') as Phaser.Physics.Arcade.Sprite; mush.setData('is1Up', true); mush.setVelocityX(80); mush.setBounceX(1); mush.setCollideWorldBounds(true); return; } const roll = Math.random(); let tex: string; let itemType: string; if (roll < 0.35) { tex = 'power_mushroom'; itemType = 'power'; } else if (roll < 0.55) { tex = 'invincibility_star'; itemType = 'star'; } else if (roll < 0.75) { tex = 'fire_flower'; itemType = 'fire_flower'; } else { tex = 'mushroom'; itemType = 'power'; } const item = this.mushrooms.create(block.x, block.y - 28, tex) as Phaser.Physics.Arcade.Sprite; item.setData('itemType', itemType); item.setVelocityX(itemType === 'star' ? 120 : 80); item.setBounceX(1); item.setCollideWorldBounds(true); if (itemType === 'star') { item.setBounceY(0.8); } } }
            collectMushroom(player: any, mush: any) { if (!mush.active) return; const itemType = mush.getData('itemType') || (mush.getData('is1Up') ? '1up' : 'power'); mush.destroy(); this.playPowerUpSound(); this.addScore(1000); if (itemType === '1up') { if (this.hearts < 20) { this.hearts++; this.show1Up(); } this.tweens.add({ targets: player, alpha: 0.3, yoyo: true, repeat: 3, duration: 80, onComplete: () => player.setAlpha(1) }); } else if (itemType === 'poison') { if (player === this.myPlayer) this.takeDamage(player); } else if (itemType === 'star') { this.activateStarPower(player); } else if (itemType === 'fire_flower') { player.setData('isBig', true); this.isBig = true; player.y -= 10; player.setScale(1.4); this.givefirePower(player); } else { player.setData('isBig', true); this.isBig = true; player.y -= 10; player.setScale(1.4); this.tweens.add({ targets: player, alpha: 0.3, yoyo: true, repeat: 3, duration: 80, onComplete: () => player.setAlpha(1) }); } }
            activateStarPower(player: any) { player.setData('starPower', true); const colors = [0xff0000, 0xffff00, 0x00ff00, 0x00ffff, 0xff00ff, 0xffffff]; let colorIdx = 0; const glitterEvent = this.time.addEvent({ delay: 80, loop: true, callback: () => { if (!player.active) return; player.setTint(colors[colorIdx % colors.length]); colorIdx++; } }); player.setData('glitterEvent', glitterEvent); this.time.delayedCall(30000, () => { player.setData('starPower', false); player.clearTint(); if (glitterEvent) glitterEvent.destroy(); }); }

            givefirePower(player: any) {
               // Only grant the fire button to the local player who collected it
               if (player === this.myPlayer) {
                  this.hasFire = true;
                  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('marioFirePowerOn'));
               }
               // Switch the player sprite to the fire outfit
               const pr = (player === this.p1) ? 'p1' : 'p2';
               player.setData('fireOutfit', true);
               const flash = this.add.graphics().setDepth(20);
               flash.fillStyle(0xffffff, 0.6); flash.fillCircle(player.x, player.y, 30);
               this.tweens.add({ targets: flash, alpha: 0, duration: 400, onComplete: () => flash.destroy() });
            }

            shootFireball() {
               if (!this.hasFire || this.gameOver || this.gameWon || this.countingDown) return;
               const now = Date.now();
               if (now - this.lastFireTime < 400) return; // cooldown
               this.lastFireTime = now;
               const dir = this.myPlayer.flipX ? -1 : 1;
               const fb = this.playerFireballs.create(this.myPlayer.x + dir * 16, this.myPlayer.y, 'player_fireball') as Phaser.Physics.Arcade.Sprite;
               (fb.body as any).allowGravity = true;
               fb.setVelocityX(dir * 400);
               fb.setVelocityY(120);
               (fb.body as any).setBounceY(0.8);
               fb.setData('owner', role);
               try { this.sound.play('jump', { volume: sfxVolumeRef.current * 0.4 }); } catch (e) {}
               // Destroy after 2.5 seconds
               this.time.delayedCall(2500, () => { if (fb && fb.active) fb.destroy(); });
               // Spinning visual
               this.tweens.add({ targets: fb, angle: 360, duration: 300, repeat: -1 });
            }

            fireballHitEnemy(fireball: any, enemy: any) {
               if (!fireball.active || !enemy.active) return;
               if (enemy.getData('isBoss')) {
                  // Damage boss
                  let hp = enemy.getData('bossHP') - 1; enemy.setData('bossHP', hp);
                  enemy.setAlpha(0.5); this.time.delayedCall(150, () => { if (enemy.active) enemy.setAlpha(1); });
                  const barFill = enemy.getData('barFill'); if (barFill) barFill.width = Math.max(0, (hp / 20) * 300);
                  fireball.destroy();
                  this.addScore(500);
                  if (hp <= 0) {
                     const barBg = enemy.getData('barBg'); const barText = enemy.getData('barText');
                     if (barFill) barFill.destroy(); if (barBg) barBg.destroy(); if (barText) barText.destroy();
                     enemy.destroy();
                     if (this.level === 5) { this.playKilledBrowserSound(); } else { this.playVictorySound(); }
                     this.gameWon = true; this.showHugAnimation();
                  }
                  return;
               }
               // Regular enemy: destroy it with a little flip effect
               fireball.destroy();
               this.playStompSound();
               this.addScore(1000);
               enemy.setVelocityY(-300);
               (enemy.body as any).checkCollision.none = true;
               enemy.setFlipY(true);
               this.tweens.add({ targets: enemy, alpha: 0, angle: 180, duration: 500, onComplete: () => enemy.destroy() });
            }
            collectCoin(player: any, coin: any) { if (!coin.active) return; coin.destroy(); this.playCoinSound(); this.coinCount++; this.addScore(300); if (this.coinCount >= 100) { this.coinCount = 0; if (this.hearts < 20) { this.hearts++; this.show1Up(); } } }
             addScore(pts: number) { const oldScore = this.score; this.score += pts; if (Math.floor(this.score / 50000) > Math.floor(oldScore / 50000)) { if (this.hearts < 20) { this.hearts++; this.show1Up(); } } }
             show1Up() { this.playPowerUpSound(); const txt = this.add.text(400, 200, '1UP', { fontSize: '48px', color: '#00ff00', stroke: '#000', strokeThickness: 4, fontStyle: 'bold' }).setOrigin(0.5).setScrollFactor(0).setDepth(500); this.tweens.add({ targets: txt, y: 150, alpha: 0, duration: 1200, onComplete: () => txt.destroy() }); }
             hitEnemy(player: any, enemy: any) { if (player.getData('starPower')) { enemy.destroy(); this.playStompSound(); this.addScore(1000); return; } if (player.body.touching.down && enemy.body.touching.up) { if (enemy.getData('isBoss')) { let hp = enemy.getData('bossHP') - 1; enemy.setData('bossHP', hp); this.playStompSound(); player.setVelocityY(-500); enemy.setAlpha(0.5); this.time.delayedCall(200, () => { if (enemy.active) enemy.setAlpha(1); }); this.addScore(1000); const barFill = enemy.getData('barFill'); if (barFill) { barFill.width = Math.max(0, (hp / 20) * 300); } if (hp <= 0) { const barBg = enemy.getData('barBg'); const barText = enemy.getData('barText'); if (barFill) barFill.destroy(); if (barBg) barBg.destroy(); if (barText) barText.destroy(); enemy.destroy(); if (this.level === 5) { this.playKilledBrowserSound(); } else { this.playVictorySound(); } this.gameWon = true; this.showHugAnimation(); } } else { enemy.destroy(); player.setVelocityY(-400); this.playStompSound(); this.addScore(1000); } } else if (player.body.touching.up && enemy.body.touching.down) { if (player === this.myPlayer) this.takeDamage(player); } else { if (enemy.getData('isBoss') && player.body.velocity.y < 0) return; if (player === this.myPlayer) this.takeDamage(player); } }

            showHugAnimation() {
               // Both players run toward each other
               this.p1.setVelocity(0, 0); this.p2.setVelocity(0, 0);
               // Face each other
               this.p1.setFlipX(false); this.p2.setFlipX(true);
               // Play run animation
               this.p1.play('p1_run', true); this.p2.play('p2_run', true);
               const meetX = (this.p1.x + this.p2.x) / 2;
               const floorY = this.p1.y;
               // Run toward each other
               this.tweens.add({ targets: this.p1, x: meetX - 5, duration: 1500, ease: 'Linear' });
               this.tweens.add({ targets: this.p2, x: meetX + 5, duration: 1500, ease: 'Linear', onComplete: () => {
                  // Stop running, face each other
                  this.p1.anims.stop(); this.p2.anims.stop();
                  this.p1.setFlipX(true); this.p2.setFlipX(false);
                  this.p1.setTexture('p1_run1'); this.p2.setTexture('p2_run1');
                  // Small jump together (fall on floor moment)
                  this.tweens.add({ targets: [this.p1, this.p2], y: floorY - 30, duration: 200, yoyo: true, ease: 'Quad.easeOut', onComplete: () => {
                     // Hearts floating up
                     this.time.addEvent({ delay: 300, repeat: 10, callback: () => {
                        const hx = meetX + Phaser.Math.Between(-30, 30);
                        const heart = this.add.text(hx, floorY - 20, '❤️', { fontSize: '24px' }).setDepth(100);
                        this.tweens.add({ targets: heart, y: floorY - 100, alpha: 0, duration: 1500, onComplete: () => heart.destroy() });
                     }});
                     // Trigger custom save game event
                     window.dispatchEvent(new CustomEvent('marioGameWon', {
                        detail: {
                           score: this.score,
                           hearts: this.hearts,
                           coinCount: this.coinCount
                        }
                     }));
                     // After celebration moment, show birthday
                     this.time.delayedCall(2500, () => this.showBirthdayCelebration());
                  }});
               }});
            }

            showBirthdayCelebration() {
               // Stop BGM
               if (this.currentBgm) {
                  this.currentBgm.stop();
                  this.currentBgm.destroy();
                  this.currentBgm = null;
               }

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
            touchFlag(player: any, flag: any) {
               const playerRole = (player === this.p1) ? 'p1' : 'p2';
               if (playerRole !== role) return;
               if (this.finishedSet.has(playerRole)) return;
               if (this.playingCustomFromLibrary) {
                  // Custom level played from library: show victory and return to menu
                  this.playVictorySound();
                  this.gameWon = true;
                  this.add.text(400, 200, '🎉 LEVEL COMPLETE! 🎉', { fontSize: '36px', color: '#ffd700', stroke: '#000', strokeThickness: 4, fontStyle: 'bold', align: 'center' }).setOrigin(0.5).setScrollFactor(0).setDepth(200);
                  this.time.delayedCall(3000, () => { socket.emit('customLevelVictory'); onExit?.(); });
                  return;
               }
               socket.emit('flagTouched', playerRole);
               this.playVictorySound();
            }
            createJoystick() {}
            takeDamage(player: any) { if (player.getData('starPower')) return; if (player.alpha !== 1 || this.gameOver || this.gameWon) return; this.playHurtSound(); if (player.getData('fireOutfit')) { player.setData('fireOutfit', false); if (player === this.myPlayer) { this.hasFire = false; if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('marioFirePowerOff')); } player.setAlpha(0.5); this.tweens.add({ targets: player, alpha: 0, yoyo: true, repeat: 5, duration: 100, onComplete: () => player.setAlpha(1) }); return; } if (player.getData('isBig')) { player.setData('isBig', false); this.isBig = false; player.setScale(1); player.setAlpha(0.5); this.tweens.add({ targets: player, alpha: 0, yoyo: true, repeat: 5, duration: 100, onComplete: () => player.setAlpha(1) }); return; } this.hearts--; if (this.hearts <= 0) { this.playGameOverSound(); this.gameOver = true; socket.emit('gameOver'); this.deathAnimation(player); } else { player.setAlpha(0.5); this.tweens.add({ targets: player, alpha: 0, yoyo: true, repeat: 5, duration: 100, onComplete: () => player.setAlpha(1) }); player.setVelocityY(-350); } }

            deathAnimation(player: any) {
               player.setVelocity(0, 0); (player.body as any).allowGravity = false;
               player.setCollideWorldBounds(false); (player.body as any).enable = false;
               player.setDepth(100); player.setAlpha(1); player.setFlipX(false);
               // Switch to death frame (X pose - arms up, legs spread)
               const pRole = player === this.p1 ? 'p1' : 'p2';
               player.setTexture(`${pRole}_death`);
               player.anims.stop();
               // Enlarge briefly
               this.tweens.add({ targets: player, scaleX: 2, scaleY: 2, duration: 300, onComplete: () => {
                  // Jump up then fall down below screen
                  this.tweens.add({ targets: player, y: player.y - 120, duration: 400, ease: 'Quad.easeOut', onComplete: () => {
                     this.tweens.add({ targets: player, y: 700, duration: 900, ease: 'Quad.easeIn' });
                  }});
               }});
               // Show GAME OVER in center of screen after a delay
               this.time.delayedCall(1500, () => {
                  const goText = this.add.text(400, 240, 'GAME OVER', { fontSize: '64px', color: '#fff', stroke: '#000', strokeThickness: 6, fontStyle: 'bold' }).setOrigin(0.5).setScrollFactor(0).setDepth(200).setAlpha(0);
                  this.tweens.add({ targets: goText, alpha: 1, duration: 500 });
               });
            }

            update() {
               if (this.gameOver) { this.uiText.setText(''); return; }
               if (this.waitingForOther && !this.countingDown) { this.uiText.setText(this.finishedSet.has('p1') && this.finishedSet.has('p2') ? 'Both done! Starting...' : `Waiting for ${this.finishedSet.has('p1') ? 'P2' : 'P1'}...`); return; }
               if (this.countingDown) return;

               this.movingPlatforms.getChildren().forEach((p: any) => {
                  const originX = p.getData('originX'); const range = p.getData('range'); let speed = p.getData('speed');
                  if (p.x < originX - range && speed < 0) { speed = Math.abs(speed); p.setData('speed', speed); }
                  else if (p.x > originX + range && speed > 0) { speed = -Math.abs(speed); p.setData('speed', speed); }
                  (p.body as any).setVelocityX(speed);
                  // Carry players standing on this platform
                  [this.p1, this.p2].forEach(plr => {
                     if (plr.body.touching.down) {
                        const pBounds = p.getBounds();
                        const plrBottom = plr.y + plr.body.height / 2;
                        const platTop = pBounds.y;
                        if (Math.abs(plrBottom - platTop) < 10 && plr.x > pBounds.x && plr.x < pBounds.x + pBounds.width) {
                           plr.x += speed / 60;
                        }
                     }
                  });
               });

               this.clouds.getChildren().forEach((c: any) => { c.x -= c.getData('speed') * 0.02; if (c.x < -200) c.x = 10000; });
               this.enemies.getChildren().forEach((e: any) => {
                  if (!e.body || e.getData('isBoss')) return;
                  // Reverse if stopped (hit a wall)
                  if (e.body.velocity.x === 0 && e.body.touching.down) { const d = (e.getData('dir') || 60) * -1; e.setVelocityX(d); e.setData('dir', d); }
                  // Edge detection: if on ground, check if there's floor ahead
                  if (e.body.touching.down) {
                     const dir = e.body.velocity.x > 0 ? 1 : -1;
                     const checkX = e.x + dir * 20;
                     const checkY = e.y + 20;
                     const tileBelow = this.blocks.getChildren().some((b: any) => Math.abs(b.x - checkX) < 20 && Math.abs(b.y - checkY) < 20);
                     if (!tileBelow) { const d = (e.getData('dir') || 60) * -1; e.setVelocityX(d); e.setData('dir', d); }
                  }
               });

               // Rotate fire bars
               this.children.list.forEach((child: any) => {
                  if (child.getData && child.getData('firebar')) {
                     const cx = child.getData('centerX'); const cy = child.getData('centerY');
                     const radius = child.getData('radius'); const speed = child.getData('speed');
                     let angle = child.getData('angle') + speed * 0.02;
                     child.setData('angle', angle);
                     child.x = cx + Math.cos(angle) * radius;
                     child.y = cy + Math.sin(angle) * radius;
                  }
               });
               // Check fire bar collision with players (tight hitbox - must touch the ball)
               this.children.list.forEach((child: any) => {
                  if (child.getData && child.getData('firebar')) {
                     const dist1 = Phaser.Math.Distance.Between(this.p1.x, this.p1.y, child.x, child.y);
                     const dist2 = Phaser.Math.Distance.Between(this.p2.x, this.p2.y, child.x, child.y);
                     if (dist1 < 10) this.takeDamage(this.p1);
                     if (dist2 < 10) this.takeDamage(this.p2);
                  }
               });

               const isLeft = this.cursors.left.isDown || this.keyA.isDown || this.joyKeys.left;
               const isRight = this.cursors.right.isDown || this.keyD.isDown || this.joyKeys.right;
               const isJumpHeld = this.cursors.up.isDown || this.keyW.isDown || this.cursors.space.isDown || this.joyKeys.jump;
               const isJumpJustDown = isJumpHeld && !this.prevJump; this.prevJump = isJumpHeld;
               const isCrouch = this.cursors.down.isDown || this.keyS.isDown || this.joyKeys.down;
               // Fire input (F key or fire button) — only works when fire power is active
               const isFireHeld = (this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.F)?.isDown) || this.joyKeys.fire;
               const isFireJustDown = isFireHeld && !this.prevFire; this.prevFire = isFireHeld;
               if (isFireJustDown) this.shootFireball();
               const onGround = this.myPlayer.body.touching.down;
               let animState = 'run1';
               const skin = this.hasFire ? 'fire_' : '';

               if (isCrouch && onGround) { this.myPlayer.setVelocityX(0); this.myPlayer.setBodySize(18, 16); this.myPlayer.setOffset(4, 18); animState = 'crouch'; this.myPlayer.anims.stop(); }
               else {
                  this.myPlayer.setBodySize(18, 28); this.myPlayer.setOffset(4, 6);
                  if (isLeft) { this.myPlayer.setVelocityX(-250); this.myPlayer.setFlipX(true); if (onGround) { animState = 'run'; this.myPlayer.play(`${role}_${skin}run`, true); } }
                  else if (isRight) { this.myPlayer.setVelocityX(250); this.myPlayer.setFlipX(false); if (onGround) { animState = 'run'; this.myPlayer.play(`${role}_${skin}run`, true); } }
                  else { this.myPlayer.setVelocityX(0); animState = 'run1'; this.myPlayer.anims.stop(); }
                  if (isJumpJustDown && onGround) { this.myPlayer.setVelocityY(-750); this.playJumpSound(); }
                  if (!isJumpHeld && this.myPlayer.body.velocity.y < -200) this.myPlayer.setVelocityY(this.myPlayer.body.velocity.y * 0.8);
                  if (!onGround) { animState = 'jump'; this.myPlayer.anims.stop(); }
               }
               if (animState !== 'run') this.myPlayer.setTexture(`${role}_${skin}${animState}`);

               const targetX = Math.max(Math.min(this.p1.x, this.p2.x) + 300, this.cameras.main.scrollX + 400);
               // Don't override camera during boss auto-scroll
               let autoScrolling = false;
               this.enemies.getChildren().forEach((e: any) => { if (e.getData && e.getData('isBoss') && e.getData('autoScrollActive')) autoScrolling = true; if (e.getData && e.getData('isBoss') && e.getData('arenaLocked')) autoScrolling = true; });
               if (!autoScrolling) this.cameraCenter.x = Phaser.Math.Clamp(targetX, 400, 9600);
               if (this.myPlayer.x < this.cameras.main.scrollX + 10) this.myPlayer.x = this.cameras.main.scrollX + 10;

               // Instant death if player falls into a pit (below ground level GY=440)
               if (this.myPlayer.y >= 455 && !this.gameOver) {
                  // Check if there's ground below the player — if not, it's a pit
                  const playerX = this.myPlayer.x;
                  const hasGround = this.blocks.getChildren().some((b: any) => Math.abs(b.x - playerX) < 20 && b.y >= 430 && b.y <= 480);
                  if (!hasGround) {
                     this.hearts = 0; this.gameOver = true; socket.emit('gameOver');
                     this.myPlayer.y = 300;
                     this.playGameOverSound();
                     this.deathAnimation(this.myPlayer);
                  }
               }

               // Show Bowser health bar when he's visible on screen
               this.enemies.getChildren().forEach((e: any) => {
                  if (e.getData && e.getData('isBoss')) {
                     const camLeft = this.cameras.main.scrollX;
                     const camRight = camLeft + 800;
                     // Camera auto-scroll: once player crosses x=4400, camera slowly moves right
                     if (!e.getData('cameraTriggered') && this.myPlayer.x > 4400 && this.level === 5 && !this.gameOver && !this.gameWon) {
                        e.setData('cameraTriggered', true);
                        e.setData('autoScrollActive', true);
                         
                        // Stop current level 5 BGM and play browsercontact track
                        if (this.currentBgm) {
                           this.currentBgm.stop();
                           this.currentBgm.destroy();
                           this.currentBgm = null;
                        }
                        try {
                           this.currentBgm = this.sound.add('browsercontact', { loop: true, volume: 0.55 });
                           this.currentBgm.play();
                        } catch (err) {
                           console.error('Error playing browsercontact BGM:', err);
                        }
                     }
                     // Auto-scroll the camera slowly to the right
                     if (e.getData('autoScrollActive') && !this.gameOver && !this.gameWon) {
                        this.cameraCenter.x += 1.2; // slow scroll speed
                        // Player can't go behind the left edge of camera
                        if (this.myPlayer.x < this.cameras.main.scrollX + 20) this.myPlayer.x = this.cameras.main.scrollX + 20;
                        // Stop auto-scroll when camera reaches the arena
                        if (this.cameraCenter.x >= 5300) {
                           e.setData('autoScrollActive', false);
                           e.setData('arenaLocked', true);
                        }
                     }
                     // Show health bar when Bowser is on screen
                     if (!e.getData('barShown') && e.x > camLeft && e.x < camRight) {
                        e.setData('barShown', true);
                        const bf = e.getData('barFill'); const bb = e.getData('barBg'); const bt = e.getData('barText');
                        if (bf) this.tweens.add({ targets: bf, alpha: 1, duration: 500 });
                        if (bb) this.tweens.add({ targets: bb, alpha: 1, duration: 500 });
                        if (bt) this.tweens.add({ targets: bt, alpha: 1, duration: 500 });
                        // Activate Bowser when visible
                        const activateFn = e.getData('activateFn');
                        if (activateFn) activateFn();
                     }
                     // Confine player to arena once locked in
                     if (e.getData('arenaLocked') && !this.gameOver && !this.gameWon) {
                        if (this.myPlayer.x < 4932) this.myPlayer.x = 4932;
                        if (this.myPlayer.x > 5668) this.myPlayer.x = 5668;
                     }
                  }
               });

               socket.emit('updateState', { role, x: this.myPlayer.x, y: this.myPlayer.y, anim: animState, flipX: this.myPlayer.flipX, scale: this.myPlayer.scale, fire: this.hasFire });
               const timerDisplay = this.levelTimer >= 0 ? `⏱${Math.floor(this.levelTimer / 60)}:${(this.levelTimer % 60).toString().padStart(2, '0')}` : `⏱0:00`;
               const heartsDisplay = `❤️×${this.hearts}`;
               this.uiText.setText(`LEVEL ${this.level}  🪙×${this.coinCount}  ${heartsDisplay}  ${this.score}pts  ${timerDisplay}`);
            }
         }

         const config: Phaser.Types.Core.GameConfig = { type: Phaser.AUTO, scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 800, height: 480 }, parent: gameRef.current!, physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 1600 }, debug: false } }, scene: [MainScene], backgroundColor: '#5c94fc' };
         game = new Phaser.Game(config);
      });

      return () => {
         isDestroyed = true; if (game) game.destroy(true); if (socket) socket.disconnect();
         document.removeEventListener('selectstart', preventSelect);
         document.removeEventListener('contextmenu', preventSelect);
         if (typeof window !== 'undefined') { const all = window.setInterval(() => {}, 9999); for (let i = 0; i <= all; i++) window.clearInterval(i); }
      };
   }, [role]);

   const press = useCallback((action: keyof typeof joyKeysRef.current, val: boolean) => { joyKeysRef.current[action] = val; }, []);
   const btnStyle = (color: string): React.CSSProperties => ({ width: 64, height: 64, borderRadius: '50%', background: color, border: '3px solid rgba(255,255,255,0.35)', color: '#fff', fontSize: 22, fontWeight: 'bold', cursor: 'pointer', userSelect: 'none', touchAction: 'none', WebkitTouchCallout: 'none', WebkitUserSelect: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.5)', flexShrink: 0 } as React.CSSProperties);

   // Track active touches per button for anti-ghosting drag support
   const activeActionsRef = useRef<Map<number, string>>(new Map());

   const handleTouchStart = useCallback((e: React.TouchEvent) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
         const touch = e.changedTouches[i];
         const el = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement | null;
         const action = el?.dataset?.action;
         if (action) {
            activeActionsRef.current.set(touch.identifier, action);
            joyKeysRef.current[action as keyof typeof joyKeysRef.current] = true;
         }
      }
   }, []);

   const handleTouchMove = useCallback((e: React.TouchEvent) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
         const touch = e.changedTouches[i];
         const el = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement | null;
         const newAction = el?.dataset?.action || '';
         const prevAction = activeActionsRef.current.get(touch.identifier) || '';
         // Only switch if we landed on a NEW button — if no button, keep the old one pressed
         if (newAction && newAction !== prevAction) {
            if (prevAction) joyKeysRef.current[prevAction as keyof typeof joyKeysRef.current] = false;
            joyKeysRef.current[newAction as keyof typeof joyKeysRef.current] = true;
            activeActionsRef.current.set(touch.identifier, newAction);
         }
      }
   }, []);

   const handleTouchEnd = useCallback((e: React.TouchEvent) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
         const touch = e.changedTouches[i];
         const prevAction = activeActionsRef.current.get(touch.identifier);
         if (prevAction) {
            joyKeysRef.current[prevAction as keyof typeof joyKeysRef.current] = false;
            activeActionsRef.current.delete(touch.identifier);
         }
      }
   }, []);

   const touchProps = { onTouchStart: handleTouchStart, onTouchMove: handleTouchMove, onTouchEnd: handleTouchEnd, onTouchCancel: handleTouchEnd };

   return (
      <div style={{ width: '100vw', height: '100dvh', background: '#111', position: 'relative', overflow: 'hidden', WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none', touchAction: 'none' } as React.CSSProperties}>
         <div ref={gameRef} style={{ width: '100%', height: '100%' }} />
         {/* D-Pad — hidden in editor mode */}
         {role !== 'editor' && <div {...touchProps} style={{ position: 'absolute', [btnPos === 'left' ? 'left' : 'right']: 30, bottom: 8, transform: 'translateY(-50%)', display: 'grid', gridTemplateColumns: 'repeat(3, 70px)', gridTemplateRows: 'repeat(2, 70px)', zIndex: 10 }}>
            <div /><button data-action="jump" style={btnStyle('rgba(60,60,200,0.82)')}>▲</button><div />
            <button data-action="left" style={btnStyle('rgba(60,60,200,0.82)')}>◀</button><button data-action="down" style={btnStyle('rgba(60,60,200,0.82)')}>▼</button><button data-action="right" style={btnStyle('rgba(60,60,200,0.82)')}>▶</button>
         </div>}
         {/* JUMP action button on opposite side — hidden in editor mode */}
         {role !== 'editor' && <div {...touchProps} style={{ position: 'absolute', [btnPos === 'left' ? 'right' : 'left']: 30, bottom: 8, transform: 'translateY(-50%)', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            {hasFirePower && <button data-action="fire" style={{ ...btnStyle('rgba(255,140,0,0.92)'), width: 64, height: 64, fontSize: 13 }}>FIRE</button>}
            <button data-action="jump" style={{ ...btnStyle('rgba(210,30,30,0.88)'), width: 72, height: 72, fontSize: 15 }}>JUMP</button>
         </div>}
         {/* Save Game Button popup on bottom right */}
         {showSaveBtn && (
            <button
               onClick={handleSaveGame}
               style={{
                  position: 'absolute',
                  right: 30,
                  bottom: 120, // Positioned above D-pad / JUMP button
                  padding: '12px 24px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #4caf50, #2e7d32)',
                  color: '#fff',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  border: '3px solid rgba(255,255,255,0.4)',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.6)',
                  cursor: 'pointer',
                  zIndex: 200,
                  fontFamily: 'monospace',
                  transition: 'all 0.2s'
               }}
            >
               💾 SAVE GAME
            </button>
         )}
      </div>
   );
}
