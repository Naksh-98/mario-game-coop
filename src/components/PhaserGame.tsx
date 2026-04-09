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
            ground!: Phaser.GameObjects.Rectangle;
            blocks!: Phaser.Physics.Arcade.StaticGroup;
            qBlocks!: Phaser.Physics.Arcade.StaticGroup;
            obstacles!: Phaser.Physics.Arcade.StaticGroup;
            enemies!: Phaser.Physics.Arcade.Group;
            fireballs!: Phaser.Physics.Arcade.Group;
            movingPlatforms!: Phaser.Physics.Arcade.Group;
            clouds!: Phaser.GameObjects.Group;
            flags!: Phaser.Physics.Arcade.StaticGroup;
            cameraCenter!: Phaser.GameObjects.Rectangle;

            cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
            keyW!: Phaser.Input.Keyboard.Key;
            keyA!: Phaser.Input.Keyboard.Key;
            keyD!: Phaser.Input.Keyboard.Key;
            keyS!: Phaser.Input.Keyboard.Key;

            uiText!: Phaser.GameObjects.Text;
            myPlayer!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
            otherPlayer!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;

            audioCtx!: AudioContext;
            bgmInterval!: number;

            joyKeys = joyKeysRef.current;

            hearts = 3;
            gameOver = false;
            gameWon = false;
            waitingForOther = false; // this player finished, waiting for partner
            countingDown = false;
            level = 1;
            isBig = false;
            countdownText!: Phaser.GameObjects.Text;
            finishedSet: Set<string> = new Set();

            constructor() {
               super({ key: 'MainScene' });
            }

            drawPlayer(key: string, shirtCol: number, frameType: 'run1' | 'run2' | 'jump' | 'crouch') {
               const skin = 0xffdab9; const overalls = 0x1e90ff; const hat = shirtCol; const shoes = 0x8b4513;
               const g = this.make.graphics({ x: 0, y: 0 }, false); const p = 5; // bigger sprite

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

            playAudio(freq: number, type: OscillatorType, dur: number) {
               if (!this.audioCtx || freq === 0) return;
               const osc = this.audioCtx.createOscillator();
               const gain = this.audioCtx.createGain();
               osc.type = type; osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
               osc.connect(gain); gain.connect(this.audioCtx.destination);
               osc.start(); gain.gain.exponentialRampToValueAtTime(0.00001, this.audioCtx.currentTime + dur);
               osc.stop(this.audioCtx.currentTime + dur);
            }

            createTextures() {
               // Enemies (mushroom-style)
               const ge = this.make.graphics({ x: 0, y: 0 }, false);
               ge.fillStyle(0x8b4513, 1); ge.fillRect(4, 0, 24, 20); // body
               ge.fillStyle(0xcc2200, 1); ge.fillRect(0, 0, 32, 14); ge.fillRect(2, 14, 28, 6); // hat top
               ge.fillStyle(0xffdab9, 1); ge.fillRect(6, 20, 20, 12); // face
               ge.fillStyle(0x000, 1); ge.fillRect(9, 23, 5, 5); ge.fillRect(18, 23, 5, 5); // eyes
               ge.fillStyle(0xffffff, 1); ge.fillRect(10, 24, 3, 3); ge.fillRect(19, 24, 3, 3); // eye shine
               ge.fillStyle(0x8b4513, 1); ge.fillRect(2, 28, 10, 4); ge.fillRect(20, 28, 10, 4); // feet
               ge.generateTexture('enemy', 32, 32); ge.destroy();

               // Fireball
               const gF = this.make.graphics({ x: 0, y: 0 }, false);
               gF.fillStyle(0xff6600, 1); gF.fillCircle(10, 10, 10);
               gF.fillStyle(0xffff00, 1); gF.fillCircle(10, 10, 6);
               gF.fillStyle(0xffffff, 1); gF.fillCircle(8, 8, 3);
               gF.generateTexture('fireball', 20, 20); gF.destroy();

               // Moving platform
               const gP = this.make.graphics({ x: 0, y: 0 }, false);
               gP.fillStyle(0x228b22, 1); gP.fillRect(0, 0, 96, 16);
               gP.fillStyle(0x32cd32, 1); gP.fillRect(2, 2, 92, 6);
               gP.lineStyle(2, 0x145214, 1); gP.strokeRect(0, 0, 96, 16);
               gP.generateTexture('movingPlat', 96, 16); gP.destroy();

               // Cloud texture (fluffy pixel cloud)
               const gC = this.make.graphics({ x: 0, y: 0 }, false);
               gC.fillStyle(0xffffff, 0.9);
               gC.fillEllipse(60, 40, 80, 40);
               gC.fillEllipse(40, 48, 60, 36);
               gC.fillEllipse(85, 48, 55, 30);
               gC.fillEllipse(60, 55, 100, 28);
               gC.fillStyle(0xe8e8ff, 0.5);
               gC.fillEllipse(55, 35, 50, 20);
               gC.generateTexture('cloud', 120, 70); gC.destroy();

               // QBlock
               const gq = this.make.graphics({ x: 0, y: 0 }, false);
               gq.fillStyle(0xffd700, 1); gq.fillRect(0, 0, 32, 32); gq.lineStyle(2, 0x000, 1); gq.strokeRect(0, 0, 32, 32);
               gq.fillStyle(0x000, 1); gq.fillRect(12, 6, 8, 4); gq.fillRect(20, 10, 4, 8); gq.fillRect(12, 18, 8, 4); gq.fillRect(14, 24, 4, 4);
               gq.generateTexture('qblock', 32, 32); gq.clear();
               gq.fillStyle(0x8b4513, 1); gq.fillRect(0, 0, 32, 32); gq.lineStyle(2, 0x000, 1); gq.strokeRect(0, 0, 32, 32);
               gq.generateTexture('qblock_empty', 32, 32); gq.destroy();

               const gB = this.make.graphics({ x: 0, y: 0 }, false);
               gB.fillStyle(0xd2691e, 1); gB.fillRect(0, 0, 32, 32); gB.lineStyle(2, 0x000, 1); gB.strokeRect(0, 0, 32, 32);
               gB.generateTexture('block', 32, 32); gB.destroy();

               const gS = this.make.graphics({ x: 0, y: 0 }, false);
               gS.fillStyle(0xdddddd, 1); gS.fillTriangle(16, 0, 0, 32, 32, 32); gS.strokeTriangle(16, 0, 0, 32, 32, 32);
               gS.generateTexture('spike', 32, 32); gS.destroy();

               const gFlag = this.make.graphics({ x: 0, y: 0 }, false);
               gFlag.fillStyle(0xffffff, 1); gFlag.fillRect(0, 0, 4, 64);
               gFlag.fillStyle(0x00ff00, 1); gFlag.fillRect(4, 0, 32, 24);
               gFlag.generateTexture('flag', 36, 64); gFlag.destroy();

               this.drawPlayer('p1_run1', 0xd50000, 'run1'); this.drawPlayer('p1_run2', 0xd50000, 'run2'); this.drawPlayer('p1_jump', 0xd50000, 'jump'); this.drawPlayer('p1_crouch', 0xd50000, 'crouch');
               this.drawPlayer('p2_run1', 0x00c853, 'run1'); this.drawPlayer('p2_run2', 0x00c853, 'run2'); this.drawPlayer('p2_jump', 0x00c853, 'jump'); this.drawPlayer('p2_crouch', 0x00c853, 'crouch');
               this.anims.create({ key: 'p1_run', frames: [{ key: 'p1_run1' }, { key: 'p1_run2' }], frameRate: 10, repeat: -1 });
               this.anims.create({ key: 'p2_run', frames: [{ key: 'p2_run1' }, { key: 'p2_run2' }], frameRate: 10, repeat: -1 });
            }

            create() {
               this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
               this.physics.world.setBounds(0, 0, 10000, 480);
               this.cameraCenter = this.add.rectangle(400, 240, 10, 10, 0, 0);
               this.cameras.main.startFollow(this.cameraCenter, false, 0.1, 0.1);
               this.cameras.main.setBounds(0, 0, 10000, 480);

               this.add.rectangle(5000, 240, 10000, 480, 0x5dade2); // Sky

               this.createTextures();

               this.blocks = this.physics.add.staticGroup();
               this.qBlocks = this.physics.add.staticGroup();
               this.obstacles = this.physics.add.staticGroup();
               this.enemies = this.physics.add.group();
               this.fireballs = this.physics.add.group();
               this.movingPlatforms = this.physics.add.group({ immovable: true, allowGravity: false });
               this.flags = this.physics.add.staticGroup();

               // Spawn clouds spread across the world at random y in the sky
               this.clouds = this.add.group();
               const cloudSpeeds = [20, 30, 15, 25, 18, 35, 22];
               for (let ci = 0; ci < 40; ci++) {
                  const cx = Phaser.Math.Between(0, 9800);
                  const cy = Phaser.Math.Between(40, 200);
                  const sc = Phaser.Math.FloatBetween(0.6, 1.4);
                  const cloud = this.add.image(cx, cy, 'cloud').setScrollFactor(0.2).setScale(sc).setDepth(-1).setAlpha(Phaser.Math.FloatBetween(0.7, 1));
                  cloud.setData('speed', cloudSpeeds[ci % cloudSpeeds.length]);
                  cloud.setData('baseX', cx);
                  this.clouds.add(cloud);
               }

               this.p1 = this.physics.add.sprite(150, 360, 'p1_run1');
               this.p2 = this.physics.add.sprite(80, 360, 'p2_run1');
               // Body size scaled to match p=5 sprite (65×85 px)
               this.p1.setBodySize(34, 60); this.p1.setOffset(13, 25);
               this.p2.setBodySize(34, 60); this.p2.setOffset(13, 25);
               this.p1.setCollideWorldBounds(true); this.p2.setCollideWorldBounds(true);

               this.physics.add.collider(this.p1, this.blocks); this.physics.add.collider(this.p2, this.blocks);
               this.physics.add.collider(this.enemies, this.blocks);
               this.physics.add.collider(this.p1, this.movingPlatforms); this.physics.add.collider(this.p2, this.movingPlatforms);

               this.physics.add.collider(this.p1, this.qBlocks, this.hitQBlock as any, undefined, this);
               this.physics.add.collider(this.p2, this.qBlocks, this.hitQBlock as any, undefined, this);

               this.physics.add.overlap(this.p1, this.enemies, this.hitEnemy as any, undefined, this);
               this.physics.add.overlap(this.p2, this.enemies, this.hitEnemy as any, undefined, this);

               this.physics.add.overlap(this.p1, this.fireballs, () => this.takeDamage(this.p1), undefined, this);
               this.physics.add.overlap(this.p2, this.fireballs, () => this.takeDamage(this.p2), undefined, this);

               this.physics.add.overlap(this.p1, this.obstacles, () => this.takeDamage(this.p1), undefined, this);
               this.physics.add.overlap(this.p2, this.obstacles, () => this.takeDamage(this.p2), undefined, this);

               this.physics.add.overlap(this.p1, this.flags, this.touchFlag as any, undefined, this);
               this.physics.add.overlap(this.p2, this.flags, this.touchFlag as any, undefined, this);

               this.myPlayer = role === 'p1' ? this.p1 : this.p2;
               this.otherPlayer = role === 'p1' ? this.p2 : this.p1;

               this.cursors = this.input.keyboard!.createCursorKeys();
               this.keyW = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W);
               this.keyA = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A);
               this.keyS = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S);
               this.keyD = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D);

               this.createJoystick();

               this.uiText = this.add.text(20, 20, '', { fontSize: '24px', color: '#fff', stroke: '#000', strokeThickness: 4 }).setScrollFactor(0);

               // Big centred countdown / status text
               this.countdownText = this.add.text(400, 200, '', {
                  fontSize: '80px', color: '#ffe600', stroke: '#000', strokeThickness: 8, fontStyle: 'bold'
               }).setOrigin(0.5).setScrollFactor(0).setDepth(20).setAlpha(0);

               socket.emit('join', role);

               socket.on('stateUpdate', (st: any) => {
                  const opRole = role === 'p1' ? 'p2' : 'p1';
                  if (st[opRole]) {
                     this.otherPlayer.setX(st[opRole].x);
                     this.otherPlayer.setY(st[opRole].y);
                     this.otherPlayer.setFlipX(st[opRole].flipX);
                     this.otherPlayer.setScale(st[opRole].scale || 1);

                     if (st[opRole].anim === 'crouch') {
                        this.otherPlayer.setBodySize(20, 18);
                        this.otherPlayer.setOffset(8, 33);
                     } else {
                        this.otherPlayer.setBodySize(20, 36);
                        this.otherPlayer.setOffset(8, 15);
                     }

                     if (st[opRole].anim === 'run') {
                        if (!this.otherPlayer.anims.isPlaying) this.otherPlayer.play(`${opRole}_run`);
                     } else {
                        this.otherPlayer.anims.stop();
                        this.otherPlayer.setTexture(`${opRole}_${st[opRole].anim}`);
                     }
                  }
               });

               socket.on('playerFinished', (finRole: string) => {
                  this.finishedSet.add(finRole);
                  if (finRole === role) {
                     this.waitingForOther = true;
                     // play a small "I made it" jingle
                     this.playAudio(523, 'square', 0.15);
                     setTimeout(() => this.playAudio(659, 'square', 0.15), 150);
                     setTimeout(() => this.playAudio(784, 'square', 0.2), 300);
                  }
               });

               socket.on('startCountdown', (nextLvl: number) => {
                  this.countingDown = true;
                  this.gameWon = true; // freeze movement
                  let tick = 10;

                  // Adventurous countdown music notes (ascending trumpet-like)
                  const countNotes = [220, 247, 262, 294, 330, 349, 392, 440, 494, 523];

                  const doTick = () => {
                     if (tick <= 0) {
                        // Final fanfare
                        this.playAudio(784, 'square', 0.1);
                        setTimeout(() => this.playAudio(880, 'square', 0.1), 100);
                        setTimeout(() => this.playAudio(988, 'square', 0.1), 200);
                        setTimeout(() => this.playAudio(1047, 'square', 0.3), 300);
                        this.tweens.add({ targets: this.countdownText, alpha: 0, duration: 400, onComplete: () => {
                           this.countdownText.setAlpha(0);
                           this.countingDown = false;
                           this.waitingForOther = false;
                           this.finishedSet.clear();
                           this.level = nextLvl;
                           this.gameWon = false;
                           this.generateLevel(this.level);
                           // respawn players at start
                           this.p1.setPosition(150, 360); this.p1.setVelocity(0, 0);
                           this.p2.setPosition(80, 360); this.p2.setVelocity(0, 0);
                        }});
                        return;
                     }
                     // Play adventurous ascending note + drum hit
                     this.playAudio(countNotes[10 - tick], 'square', 0.18);
                     this.playAudio(80, 'sawtooth', 0.15); // kick drum thud
                     if (tick <= 3) this.playAudio(countNotes[10 - tick] * 2, 'sine', 0.1); // high accent on last 3

                     this.countdownText.setText(`${tick}`);
                     this.countdownText.setAlpha(1);
                     // Pulse animation
                     this.tweens.add({ targets: this.countdownText, scaleX: 1.4, scaleY: 1.4, duration: 200, yoyo: true });

                     tick--;
                     this.time.delayedCall(1000, doTick);
                  };

                  this.countdownText.setText('GO!');
                  this.countdownText.setAlpha(1);
                  // Show "BOTH MADE IT!" briefly first
                  this.countdownText.setText('BOTH MADE IT! \uD83C\uDF89');
                  this.time.delayedCall(1200, () => doTick());
               });

               socket.on('loadLevel', (lvl: number) => {
                  this.level = lvl;
                  this.gameWon = false;
                  this.generateLevel(this.level);
               });

               const m1 = [440, 0, 440, 523, 659, 0, 587, 0, 523, 0, 392, 0, 440, 0, 523, 0];
               const m2 = [440, 0, 440, 523, 659, 0, 784, 0, 659, 0, 523, 0, 440, 0, 0, 0];
               const m3 = [659, 0, 587, 0, 523, 0, 493, 0, 440, 0, 392, 0, 330, 0, 392, 0];
               const m4 = [440, 0, 523, 0, 659, 0, 784, 0, 880, 0, 0, 0, 880, 0, 880, 0];
               const fullMelody = [...m1, ...m2, ...m1, ...m4, ...m3, ...m2, ...m1, ...m4];

               const b1 = [110, 110, 110, 110, 130.8, 130.8, 130.8, 130.8, 98, 98, 98, 98, 146.8, 146.8, 146.8, 146.8];
               const b2 = [110, 110, 0, 110, 130.8, 130.8, 0, 130.8, 164.8, 164.8, 0, 164.8, 146.8, 146.8, 146.8, 146.8];
               const fullBass = [...b1, ...b2, ...b1, ...b2, ...b1, ...b2, ...b1, ...b2];

               let noteIdx = 0;
               this.bgmInterval = window.setInterval(() => {
                  if (this.gameOver || this.gameWon) return;
                  if (fullMelody[noteIdx % fullMelody.length] > 0) this.playAudio(fullMelody[noteIdx % fullMelody.length], 'square', 0.12);
                  if (fullBass[noteIdx % fullBass.length] > 0) this.playAudio(fullBass[noteIdx % fullBass.length], 'sawtooth', 0.22);

                  // Add a hi-hat style noise hit every 4 notes
                  if (noteIdx % 4 === 2) this.playAudio(8000, 'square', 0.03);

                  noteIdx++;
               }, 125) as unknown as number; // 125ms = 120BPM fast 16th notes 

               this.generateLevel(this.level);
            }

            generateLevel(lvl: number) {
               this.blocks.clear(true, true);
               this.obstacles.clear(true, true);
               this.enemies.clear(true, true);
               this.qBlocks.clear(true, true);
               this.flags.clear(true, true);
               this.fireballs.clear(true, true);
               this.movingPlatforms.clear(true, true);

               // Ground — leave gaps to create pits
               const pitPositions: number[] = [];
               for (let i = 0; i < 8000; i += 32) {
                  const inPit = pitPositions.some(px => i >= px && i < px + 128);
                  if (!inPit) {
                     this.blocks.create(i + 16, 440, 'block');
                     this.blocks.create(i + 16, 472, 'block');
                  }
               }

               class SeededRandom {
                  seed: number;
                  constructor(s: number) { this.seed = s; }
                  next() { this.seed = (this.seed * 9301 + 49297) % 233280; return this.seed / 233280; }
               }
               const rng = new SeededRandom(lvl * 12345);
               const density = Math.min(0.6, 0.1 + (lvl * 0.08));

               for (let i = 1; i < 45; i++) {
                  const baseX = 400 + (i * 150);
                  const rand1 = rng.next();

                  // Pit: skip ground tiles
                  if (rng.next() < density * 0.15 && baseX > 800) {
                     pitPositions.push(baseX - 64);
                  }

                  if (rand1 < density * 0.25) {
                     this.obstacles.create(baseX, 408, 'spike');
                  } else if (rand1 < density * 0.55) {
                     const en = this.enemies.create(baseX, 400, 'enemy') as Phaser.Physics.Arcade.Sprite;
                     (en.body as Phaser.Physics.Arcade.Body).allowGravity = true;
                     const dir = rng.next() > 0.5 ? 70 : -70;
                     en.setVelocityX(dir);
                     en.setData('dir', dir);
                     (en.body as Phaser.Physics.Arcade.Body).setBounceX(1);
                  } else if (rand1 < density * 0.75) {
                     // Fireball shooter: place a fireball that bounces
                     const fb = this.fireballs.create(baseX, 380, 'fireball') as Phaser.Physics.Arcade.Sprite;
                     (fb.body as Phaser.Physics.Arcade.Body).allowGravity = true;
                     fb.setVelocityX(rng.next() > 0.5 ? 120 : -120);
                     fb.setVelocityY(-300);
                     (fb.body as Phaser.Physics.Arcade.Body).setBounceX(1);
                     (fb.body as Phaser.Physics.Arcade.Body).setBounceY(0.7);
                  }

                  // Moving platforms
                  if (rng.next() > 0.65) {
                     const platY = 300 + (rng.next() > 0.5 ? 60 : 0);
                     const plat = this.movingPlatforms.create(baseX, platY, 'movingPlat') as Phaser.Physics.Arcade.Sprite;
                     plat.setData('originX', baseX);
                     plat.setData('speed', rng.next() > 0.5 ? 60 : -60);
                     plat.setData('range', 80 + rng.next() * 80);
                     (plat.body as Phaser.Physics.Arcade.Body).allowGravity = false;
                     (plat.body as Phaser.Physics.Arcade.Body).immovable = true;
                  } else if (rng.next() > 0.6) {
                     if (rng.next() > 0.7) {
                        const qb = this.qBlocks.create(baseX, 300, 'qblock');
                        qb.setData('active', true);
                     } else {
                        this.blocks.create(baseX, 300, 'block');
                     }
                  }
               }

               this.flags.create(7500, 368, 'flag');
               this.musicPowerUp();
            }

            musicPowerUp() {
               this.playAudio(300, 'sine', 0.1); setTimeout(() => this.playAudio(400, 'sine', 0.1), 100); setTimeout(() => this.playAudio(500, 'sine', 0.2), 200);
            }

            hitQBlock(player: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody, block: Phaser.Physics.Arcade.Sprite) {
               if (player.body.touching.up && block.body?.touching.down && block.getData('active')) {
                  block.setData('active', false);
                  block.setTexture('qblock_empty');
                  this.musicPowerUp();

                  this.hearts++;
                  this.isBig = true;
                  player.setScale(1.3);
               }
            }

            hitEnemy(player: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody, enemy: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody) {
               if (player.body.touching.down && enemy.body.touching.up) {
                  enemy.destroy();
                  player.setVelocityY(-400);
                  this.playAudio(440, 'sine', 0.1);
               } else {
                  if (player === this.myPlayer) this.takeDamage(player);
               }
            }

            touchFlag(player: any, flag: any) {
               const playerRole = (player === this.p1) ? 'p1' : 'p2';
               if (this.finishedSet.has(playerRole)) return; // already registered
               socket.emit('flagTouched', playerRole);
            }

            createJoystick() {
               // No-op: controls are now HTML buttons outside the canvas
            }

            takeDamage(player: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody) {
               if (player.alpha !== 1 || this.gameOver || this.gameWon) return;
               this.playAudio(100, 'sawtooth', 0.3);

               if (this.isBig) {
                  this.isBig = false;
                  player.setScale(1);
                  player.setAlpha(0.5);
                  this.tweens.add({ targets: player, alpha: 0, yoyo: true, repeat: 5, duration: 100, onComplete: () => player.setAlpha(1) });
                  return;
               }

               this.hearts--;
               if (this.hearts <= 0) {
                  this.gameOver = true;
               } else {
                  player.setAlpha(0.5);
                  this.tweens.add({ targets: player, alpha: 0, yoyo: true, repeat: 5, duration: 100, onComplete: () => player.setAlpha(1) });
                  player.setVelocityY(-350);
               }
            }

            update() {
               if (this.gameOver) { this.uiText.setText('GAME OVER!'); return; }

               // Show waiting banner if this player finished but partner hasn't
               if (this.waitingForOther && !this.countingDown) {
                  const waiting = this.finishedSet.has('p1') && this.finishedSet.has('p2')
                     ? 'Both done! Starting...'
                     : `Waiting for ${this.finishedSet.has('p1') ? 'P2' : 'P1'}...`;
                  this.uiText.setText(waiting);
                  return;
               }
               if (this.countingDown) return;

               // Animate moving platforms
               this.movingPlatforms.getChildren().forEach((p: any) => {
                  const originX = p.getData('originX');
                  const range = p.getData('range');
                  let speed = p.getData('speed');
                  if (Math.abs(p.x - originX) > range) {
                     speed = -speed;
                     p.setData('speed', speed);
                  }
                  (p.body as Phaser.Physics.Arcade.Body).setVelocityX(speed);
               });

               // Animate clouds (drift slowly, loop back)
               this.clouds.getChildren().forEach((c: any) => {
                  c.x -= c.getData('speed') * 0.005;
                  if (c.x < -100) c.x = 1000;
               });

               this.enemies.getChildren().forEach((e: any) => {
                  if (e.body && e.body.velocity.x === 0) {
                     const curDir = e.getData('dir') || 60;
                     const newDir = curDir > 0 ? -60 : 60;
                     e.setVelocityX(newDir);
                     e.setData('dir', newDir);
                  }
               });

               const isLeft = this.cursors.left.isDown || this.keyA.isDown || this.joyKeys.left;
               const isRight = this.cursors.right.isDown || this.keyD.isDown || this.joyKeys.right;
               const isJump = Phaser.Input.Keyboard.JustDown(this.cursors.up) || Phaser.Input.Keyboard.JustDown(this.keyW) || Phaser.Input.Keyboard.JustDown(this.cursors.space) || this.joyKeys.jump;
               const isCrouch = this.cursors.down.isDown || this.keyS.isDown || this.joyKeys.down;
               const onGround = this.myPlayer.body.touching.down;

               let animState = 'run1';

               if (isCrouch && onGround) {
                  this.myPlayer.setVelocityX(0);
                  this.myPlayer.setBodySize(34, 30); this.myPlayer.setOffset(13, 55);
                  animState = 'crouch';
                  this.myPlayer.anims.stop();
               } else {
                  this.myPlayer.setBodySize(34, 60); this.myPlayer.setOffset(13, 25);

                  if (isLeft) {
                     this.myPlayer.setVelocityX(-250);
                     this.myPlayer.setFlipX(true);
                     if (onGround) { animState = 'run'; this.myPlayer.play(`${role}_run`, true); }
                  } else if (isRight) {
                     this.myPlayer.setVelocityX(250);
                     this.myPlayer.setFlipX(false);
                     if (onGround) { animState = 'run'; this.myPlayer.play(`${role}_run`, true); }
                  } else {
                     this.myPlayer.setVelocityX(0);
                     animState = 'run1';
                     this.myPlayer.anims.stop();
                  }

                  if (isJump && onGround) {
                     this.myPlayer.setVelocityY(-650);
                     this.playAudio(400, 'sine', 0.1);
                     this.joyKeys.jump = false;
                  }

                  if (!onGround) {
                     animState = 'jump';
                     this.myPlayer.anims.stop();
                  }
               }

               if (animState !== 'run') {
                  this.myPlayer.setTexture(`${role}_${animState}`);
               }

               const leftMost = Math.min(this.p1.x, this.p2.x);

               const currentCamLeft = this.cameras.main.scrollX;
               const targetX = Math.max(leftMost + 300, currentCamLeft + 400);

               this.cameraCenter.x = Phaser.Math.Clamp(targetX, 400, 9600);

               const camLeftX = this.cameras.main.scrollX;
               if (this.myPlayer.x < camLeftX + 10) {
                  this.myPlayer.x = camLeftX + 10;
               }

               socket.emit('updateState', {
                  role,
                  x: this.myPlayer.x,
                  y: this.myPlayer.y,
                  anim: animState,
                  flipX: this.myPlayer.flipX,
                  scale: this.myPlayer.scale
               });

               this.uiText.setText(`LEVEL ${this.level} - Role: ${role.toUpperCase()}  Hearts: ${'❤️'.repeat(this.hearts)}`);
            }
         }

         const config: Phaser.Types.Core.GameConfig = {
            type: Phaser.AUTO,
            scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 800, height: 480 },
            parent: gameRef.current!,
            physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 1600 }, debug: false } },
            scene: [MainScene],
            backgroundColor: '#5dade2'
         };

         game = new Phaser.Game(config);
      });

      return () => {
         isDestroyed = true;
         if (game) { game.destroy(true); }
         if (socket) { socket.disconnect(); }
      };
   }, [role]);

   const press = useCallback((action: keyof typeof joyKeysRef.current, val: boolean) => {
      joyKeysRef.current[action] = val;
   }, []);

   const btnStyle = (color: string): React.CSSProperties => ({
      width: 64, height: 64,
      borderRadius: '50%',
      background: color,
      border: '3px solid rgba(255,255,255,0.35)',
      color: '#fff',
      fontSize: 22,
      fontWeight: 'bold',
      cursor: 'pointer',
      userSelect: 'none',
      WebkitUserSelect: 'none',
      touchAction: 'none',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
      flexShrink: 0,
   });

   const bind = (action: keyof typeof joyKeysRef.current) => ({
      onPointerDown: (e: React.PointerEvent) => { e.currentTarget.setPointerCapture(e.pointerId); press(action, true); },
      onPointerUp: () => press(action, false),
      onPointerLeave: () => press(action, false),
      onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
   });

   return (
      /* Outer wrapper: fills screen, black bg, positions everything */
      <div style={{ width: '100vw', height: '100dvh', background: '#111', position: 'relative', overflow: 'hidden' }}>
         {/* Game canvas fills the whole area — Phaser FIT scaler centres it with black bars */}
         <div
            ref={gameRef}
            style={{ width: '100%', height: '100%' }}
         />

         {/* D-pad — floating over LEFT black border, vertically centred */}
         <div style={{
            position: 'absolute',
            left: 30,
            // top: '50%',
            bottom: 8,
            transform: 'translateY(-50%)',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 70px)',
            gridTemplateRows: 'repeat(2, 70px)',
            gap: 10,
            zIndex: 10,
         }}>
            <div />
            <button style={btnStyle('rgba(60,60,200,0.82)')} {...bind('jump')}>▲</button>
            <div />
            <button style={btnStyle('rgba(60,60,200,0.82)')} {...bind('left')}>◀</button>
            <button style={btnStyle('rgba(60,60,200,0.82)')} {...bind('down')}>▼</button>
            <button style={btnStyle('rgba(60,60,200,0.82)')} {...bind('right')}>▶</button>
         </div>

         {/* JUMP — floating over RIGHT black border, vertically centred */}
         <button
            style={{
               ...btnStyle('rgba(210,30,30,0.88)'),
               position: 'absolute',
               right: 30,
               // top: '50%',
               bottom: 8,
               transform: 'translateY(-50%)',
               width: 72,
               height: 72,
               fontSize: 15,
               zIndex: 10,
            }}
            {...bind('jump')}
         >
            JUMP
         </button>
      </div>
   );
}
