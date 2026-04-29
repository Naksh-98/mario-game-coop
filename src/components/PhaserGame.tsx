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
            mushrooms!: Phaser.Physics.Arcade.Group;
            piranhas!: Phaser.Physics.Arcade.Group;
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
            prevJump = false;

            hearts = 3;
            gameOver = false;
            gameWon = false;
            waitingForOther = false; // this player finished, waiting for partner
            countingDown = false;
            level = 1; // TEMP: start on underground level for testing
            isBig = false;
            countdownText!: Phaser.GameObjects.Text;
            finishedSet: Set<string> = new Set();

            constructor() {
               super({ key: 'MainScene' });
            }

            drawPlayer(key: string, shirtCol: number, frameType: 'run1' | 'run2' | 'jump' | 'crouch') {
               const skin = 0xffdab9; const overalls = 0x1e90ff; const hat = shirtCol; const shoes = 0x8b4513;
               const g = this.make.graphics({ x: 0, y: 0 }, false); const p = 2; // extra small pixel size

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

               // Crown
               g.fillStyle(crown); g.fillRect(5 * p, 0 * p, 3 * p, 1 * p); g.fillRect(4 * p, 1 * p, 5 * p, 1 * p);
               g.fillStyle(jewel); g.fillRect(6 * p, 1 * p, 1 * p, 1 * p);

               // Hair
               g.fillStyle(hair);
               g.fillRect(3 * p, 2 * p, 7 * p, 7 * p); // head
               g.fillRect(2 * p, 4 * p, 1 * p, 9 * p); // left side
               g.fillRect(10 * p, 4 * p, 1 * p, 9 * p); // right side
               g.fillRect(1 * p, 6 * p, 1 * p, 5 * p); // extra volume
               g.fillRect(11 * p, 6 * p, 1 * p, 5 * p);

               // Face
               g.fillStyle(skin); g.fillRect(4 * p, 3 * p, 5 * p, 5 * p);
               g.fillStyle(0x000000); g.fillRect(7 * p, 4 * p, 1 * p, 1 * p); // eye
               g.fillStyle(0xff69b4); g.fillRect(8 * p, 6 * p, 1 * p, 1 * p); // blush

               // Torso & Brooch
               g.fillStyle(dress); g.fillRect(4 * p, 8 * p, 5 * p, 3 * p);
               g.fillStyle(jewel); g.fillCircle(6.5 * p, 9.5 * p, 0.5 * p);

               // Legs/Shoes & Dress movement
               if (frameType === 'run1') {
                  // Dress shorter
                  g.fillStyle(dress); g.fillRect(3 * p, 11 * p, 7 * p, 3 * p);
                  g.fillStyle(trim); g.fillRect(3 * p, 13 * p, 7 * p, 1 * p);
                  // Legs
                  g.fillStyle(legs); g.fillRect(4 * p, 14 * p, 2 * p, 2 * p); g.fillRect(7 * p, 14 * p, 2 * p, 1 * p);
                  g.fillStyle(shoes); g.fillRect(3 * p, 16 * p, 3 * p, 1 * p); g.fillRect(7 * p, 15 * p, 3 * p, 1 * p);
                  // Arms
                  g.fillStyle(dress); g.fillRect(2 * p, 8 * p, 2 * p, 3 * p); g.fillRect(9 * p, 9 * p, 2 * p, 3 * p);
               } else if (frameType === 'run2') {
                  // Dress shorter
                  g.fillStyle(dress); g.fillRect(3 * p, 11 * p, 7 * p, 3 * p);
                  g.fillStyle(trim); g.fillRect(3 * p, 13 * p, 7 * p, 1 * p);
                  // Legs
                  g.fillStyle(legs); g.fillRect(4 * p, 14 * p, 2 * p, 1 * p); g.fillRect(7 * p, 14 * p, 2 * p, 2 * p);
                  g.fillStyle(shoes); g.fillRect(3 * p, 15 * p, 3 * p, 1 * p); g.fillRect(7 * p, 16 * p, 3 * p, 1 * p);
                  // Arms
                  g.fillStyle(dress); g.fillRect(1 * p, 9 * p, 2 * p, 3 * p); g.fillRect(8 * p, 8 * p, 2 * p, 3 * p);
               } else if (frameType === 'jump') {
                  g.fillStyle(dress); g.fillRect(2 * p, 10 * p, 9 * p, 4 * p);
                  g.fillStyle(trim); g.fillRect(2 * p, 14 * p, 9 * p, 1 * p);
                  // Legs/Stockings visible during jump
                  g.fillStyle(legs); g.fillRect(4 * p, 15 * p, 2 * p, 2 * p); g.fillRect(7 * p, 15 * p, 2 * p, 1 * p);
                  g.fillStyle(shoes); g.fillRect(4 * p, 16 * p, 2 * p, 1 * p); g.fillRect(7 * p, 16 * p, 2 * p, 1 * p);
                  // Arms up
                  g.fillStyle(dress); g.fillRect(1 * p, 5 * p, 2 * p, 3 * p); g.fillRect(10 * p, 5 * p, 2 * p, 3 * p);
                  g.fillStyle(skin); g.fillRect(1 * p, 3 * p, 2 * p, 2 * p); g.fillRect(10 * p, 3 * p, 2 * p, 2 * p);
               } else {
                  // Idle: Long dress hides legs
                  g.fillStyle(dress); g.fillRect(2 * p, 11 * p, 9 * p, 4 * p);
                  g.fillStyle(trim); g.fillRect(2 * p, 15 * p, 9 * p, 2 * p);
                  g.fillStyle(dress); g.fillRect(2 * p, 8 * p, 2 * p, 3 * p); g.fillRect(9 * p, 8 * p, 2 * p, 3 * p);
               }

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

               // Q-Block — NES Mario yellow with ? mark
               const gq = this.make.graphics({ x: 0, y: 0 }, false);
               gq.fillStyle(0xf8b800, 1); gq.fillRect(0, 0, 32, 32); // yellow fill
               gq.fillStyle(0xfc6400, 1); // orange outline/shadow
               gq.fillRect(0, 0, 32, 3); gq.fillRect(0, 0, 3, 32); // top & left border
               gq.fillStyle(0x7c4c00, 1); // dark brown shadow
               gq.fillRect(29, 0, 3, 32); gq.fillRect(0, 29, 32, 3); // right & bottom border
               gq.fillStyle(0xffffff, 1); // white ? mark
               gq.fillRect(13, 5, 6, 3); gq.fillRect(19, 8, 3, 4);
               gq.fillRect(16, 12, 3, 3); gq.fillRect(16, 19, 3, 3); gq.fillRect(16, 23, 3, 3);
               gq.generateTexture('qblock', 32, 32); gq.clear();
               gq.fillStyle(0x7c5800, 1); gq.fillRect(0, 0, 32, 32);
               gq.fillStyle(0x9b7000, 1); gq.fillRect(2, 2, 28, 28);
               gq.generateTexture('qblock_empty', 32, 32); gq.destroy();

               // Ground/brick block — NES Mario brick colors
               const gB = this.make.graphics({ x: 0, y: 0 }, false);
               gB.fillStyle(0xc84c0c, 1); gB.fillRect(0, 0, 32, 32); // base orange-brown
               gB.fillStyle(0xfc9838, 1); gB.fillRect(1, 1, 14, 6); gB.fillRect(17, 1, 14, 6); // top brick rows
               gB.fillRect(1, 17, 6, 6); gB.fillRect(9, 17, 14, 6); gB.fillRect(25, 17, 6, 6);
               gB.fillStyle(0x7c3800, 1); // dark mortar
               gB.fillRect(0, 8, 32, 2); gB.fillRect(0, 24, 32, 2); // horizontal mortar
               gB.fillRect(15, 0, 2, 8); gB.fillRect(7, 16, 2, 8); gB.fillRect(23, 16, 2, 8); // vertical mortar
               gB.generateTexture('block', 32, 32); gB.destroy();

               const gS = this.make.graphics({ x: 0, y: 0 }, false);
               gS.fillStyle(0xdddddd, 1); gS.fillTriangle(16, 0, 0, 32, 32, 32); gS.strokeTriangle(16, 0, 0, 32, 32, 32);
               gS.generateTexture('spike', 32, 32); gS.destroy();

               const gFlag = this.make.graphics({ x: 0, y: 0 }, false);
               gFlag.fillStyle(0xffffff, 1); gFlag.fillRect(0, 0, 4, 160);
               gFlag.fillStyle(0x00cc00, 1); gFlag.fillRect(4, 0, 28, 20);
               gFlag.generateTexture('flag', 32, 160); gFlag.destroy();

               // Pipe body
               const gPB = this.make.graphics({ x: 0, y: 0 }, false);
               gPB.fillStyle(0x196419, 1); gPB.fillRect(0, 0, 32, 32);
               gPB.fillStyle(0x22a022, 1); gPB.fillRect(5, 0, 10, 32);
               gPB.fillStyle(0x0d3d0d, 1); gPB.fillRect(0, 0, 3, 32); gPB.fillRect(29, 0, 3, 32);
               gPB.generateTexture('pipe_body', 32, 32); gPB.destroy();

               // Pipe cap (40px wide)
               const gPC = this.make.graphics({ x: 0, y: 0 }, false);
               gPC.fillStyle(0x196419, 1); gPC.fillRect(0, 0, 40, 18);
               gPC.fillStyle(0x22a022, 1); gPC.fillRect(6, 2, 12, 14);
               gPC.fillStyle(0x0d3d0d, 1); gPC.fillRect(0, 0, 3, 18); gPC.fillRect(37, 0, 3, 18);
               gPC.lineStyle(2, 0x0d3d0d, 1); gPC.strokeRect(0, 0, 40, 18);
               gPC.generateTexture('pipe_cap', 40, 18); gPC.destroy();

               // Green hill
               const gHill = this.make.graphics({ x: 0, y: 0 }, false);
               gHill.fillStyle(0x3c8c3c, 1); gHill.fillEllipse(56, 44, 96, 64);
               gHill.fillStyle(0x52a852, 1); gHill.fillEllipse(44, 36, 56, 32);
               gHill.generateTexture('hill', 112, 64); gHill.destroy();

               // Castle wall brick
               const gCW = this.make.graphics({ x: 0, y: 0 }, false);
               gCW.fillStyle(0x9b5e30, 1); gCW.fillRect(0, 0, 32, 32);
               gCW.fillStyle(0x7a4520, 1);
               gCW.fillRect(0, 0, 14, 14); gCW.fillRect(18, 16, 14, 14);
               gCW.fillStyle(0x5a3010, 1);
               gCW.fillRect(0, 14, 32, 3); gCW.fillRect(14, 0, 4, 14); gCW.fillRect(0, 29, 32, 3); gCW.fillRect(14, 16, 4, 14);
               gCW.generateTexture('castle_wall', 32, 32); gCW.destroy();

               this.drawPlayer('p1_run1', 0xd50000, 'run1'); this.drawPlayer('p1_run2', 0xd50000, 'run2'); this.drawPlayer('p1_jump', 0xd50000, 'jump'); this.drawPlayer('p1_crouch', 0xd50000, 'crouch');
               this.drawPrincess('p2_run1', 'run1'); this.drawPrincess('p2_run2', 'run2'); this.drawPrincess('p2_jump', 'jump'); this.drawPrincess('p2_crouch', 'crouch');
               this.anims.create({ key: 'p1_run', frames: [{ key: 'p1_run1' }, { key: 'p1_run2' }], frameRate: 10, repeat: -1 });
               this.anims.create({ key: 'p2_run', frames: [{ key: 'p2_run1' }, { key: 'p2_run2' }], frameRate: 10, repeat: -1 });

               // Mushroom texture (classic red cap + white dots + beige stem)
               const gM = this.make.graphics({ x: 0, y: 0 }, false);
               // Stem
               gM.fillStyle(0xffdab9, 1); gM.fillRect(6, 16, 12, 10);
               gM.fillStyle(0xeec090, 1); gM.fillRect(6, 22, 12, 4);
               // Cap
               gM.fillStyle(0xcc0000, 1); gM.fillEllipse(12, 12, 24, 18);
               gM.fillRect(4, 12, 16, 8);
               // White dots
               gM.fillStyle(0xffffff, 1);
               gM.fillCircle(7, 10, 3); gM.fillCircle(17, 8, 3); gM.fillCircle(13, 14, 2);
               // Eyes
               gM.fillStyle(0xffdab9, 1); gM.fillRect(6, 17, 4, 4); gM.fillRect(14, 17, 4, 4);
               gM.fillStyle(0x000000, 1); gM.fillRect(7, 18, 2, 2); gM.fillRect(15, 18, 2, 2);
               gM.generateTexture('mushroom', 24, 26); gM.destroy();

               // Piranha Plant texture (24x32) — red chomping head + green stem
               const gPP = this.make.graphics({ x: 0, y: 0 }, false);
               // Stem
               gPP.fillStyle(0x228b22, 1); gPP.fillRect(9, 16, 6, 16);
               // Head base
               gPP.fillStyle(0xcc0000, 1); gPP.fillEllipse(12, 12, 24, 22);
               // White lip / teeth band
               gPP.fillStyle(0xffffff, 1); gPP.fillRect(2, 12, 20, 5);
               // Teeth (red gaps)
               gPP.fillStyle(0xcc0000, 1);
               gPP.fillRect(5, 12, 3, 4); gPP.fillRect(11, 12, 3, 4); gPP.fillRect(17, 12, 3, 4);
               // Eyes
               gPP.fillStyle(0xffffff, 1); gPP.fillCircle(7, 7, 4); gPP.fillCircle(17, 7, 4);
               gPP.fillStyle(0x000000, 1); gPP.fillCircle(8, 7, 2); gPP.fillCircle(18, 7, 2);
               // Spots on head
               gPP.fillStyle(0xff6666, 1); gPP.fillCircle(5, 4, 2); gPP.fillCircle(19, 4, 2);
               gPP.generateTexture('piranha', 24, 32); gPP.destroy();

               // Koopa Troopa texture (32x32) — green shell + yellow head
               const gK = this.make.graphics({ x: 0, y: 0 }, false);
               // Shell body
               gK.fillStyle(0x228b22, 1); gK.fillEllipse(16, 18, 26, 22);
               // Shell highlight
               gK.fillStyle(0x32cd32, 1); gK.fillEllipse(14, 15, 16, 12);
               // Shell lines
               gK.lineStyle(1, 0x145214, 1);
               gK.strokeEllipse(16, 18, 26, 22);
               gK.lineBetween(16, 7, 16, 29); gK.lineBetween(5, 12, 27, 24);
               // Head
               gK.fillStyle(0xfff44f, 1); gK.fillEllipse(16, 5, 14, 12);
               // Eyes
               gK.fillStyle(0xffffff, 1); gK.fillCircle(13, 4, 2); gK.fillCircle(19, 4, 2);
               gK.fillStyle(0x000000, 1); gK.fillCircle(13, 4, 1); gK.fillCircle(19, 4, 1);
               // Feet
               gK.fillStyle(0xfff44f, 1); gK.fillEllipse(9, 29, 10, 6); gK.fillEllipse(23, 29, 10, 6);
               gK.generateTexture('koopa', 32, 32); gK.destroy();
            }

            create() {
               this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
               this.physics.world.setBounds(0, 0, 10000, 480);
               this.cameraCenter = this.add.rectangle(400, 240, 10, 10, 0, 0);
               this.cameras.main.startFollow(this.cameraCenter, false, 0.1, 0.1);
               this.cameras.main.setBounds(0, 0, 10000, 480);

               this.add.rectangle(5000, 240, 10000, 480, 0x5c94fc).setDepth(-10); // NES Mario sky blue

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

               // Spawn clouds spread across the world at random y in the sky
               this.clouds = this.add.group();
               const cloudSpeeds = [20, 30, 15, 25, 18, 35, 22];
               for (let ci = 0; ci < 40; ci++) {
                  const cx = Phaser.Math.Between(0, 9800);
                  const cy = Phaser.Math.Between(40, 200);
                  const sc = Phaser.Math.FloatBetween(0.6, 1.4);
                  const cloud = this.add.image(cx, cy, 'cloud').setScrollFactor(0.2).setScale(sc).setDepth(-5).setAlpha(Phaser.Math.FloatBetween(0.7, 1));
                  cloud.setData('speed', cloudSpeeds[ci % cloudSpeeds.length]);
                  cloud.setData('baseX', cx);
                  this.clouds.add(cloud);
               }

               this.p1 = this.physics.add.sprite(150, 360, 'p1_run1');
               this.p2 = this.physics.add.sprite(80, 360, 'p2_run1');
               // Body size scaled +4 to match p=2 sprite (26x34 px)
               this.p1.setBodySize(18, 28); this.p1.setOffset(4, 6);
               this.p2.setBodySize(18, 28); this.p2.setOffset(4, 6);
               this.p1.setCollideWorldBounds(true); this.p2.setCollideWorldBounds(true);

               this.physics.add.collider(this.p1, this.blocks, this.hitBlock as any, undefined, this);
               this.physics.add.collider(this.p2, this.blocks, this.hitBlock as any, undefined, this);
               this.physics.add.collider(this.enemies, this.blocks);
               this.physics.add.collider(this.p1, this.movingPlatforms); this.physics.add.collider(this.p2, this.movingPlatforms);

               this.physics.add.collider(this.p1, this.qBlocks, this.hitQBlock as any, undefined, this);
               this.physics.add.collider(this.p2, this.qBlocks, this.hitQBlock as any, undefined, this);

               // Mushrooms slide on blocks and ground, collected on player touch
               this.physics.add.collider(this.mushrooms, this.blocks);
               this.physics.add.overlap(this.p1, this.mushrooms, this.collectMushroom as any, undefined, this);
               this.physics.add.overlap(this.p2, this.mushrooms, this.collectMushroom as any, undefined, this);
               // Piranha plants damage on touch
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

               socket.on('init', (data: any) => {
                  if (data.currentLevel) {
                     this.level = data.currentLevel;
                     this.generateLevel(this.level);
                  }
                  if (data.state) {
                     const opRole = role === 'p1' ? 'p2' : 'p1';
                     if (data.state[opRole]) {
                        this.otherPlayer.setX(data.state[opRole].x);
                        this.otherPlayer.setY(data.state[opRole].y);
                     }
                  }
               });

               socket.on('stateUpdate', (st: any) => {
                  if (this.countingDown) return;
                  const opRole = role === 'p1' ? 'p2' : 'p1';
                  if (st[opRole]) {
                     this.otherPlayer.setX(st[opRole].x);
                     this.otherPlayer.setY(st[opRole].y);
                     this.otherPlayer.setFlipX(st[opRole].flipX);
                     this.otherPlayer.setScale(st[opRole].scale || 1);

                     if (st[opRole].anim === 'crouch') {
                        this.otherPlayer.setBodySize(18, 16);
                        this.otherPlayer.setOffset(4, 18);
                     } else {
                        this.otherPlayer.setBodySize(18, 28);
                        this.otherPlayer.setOffset(4, 6);
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
                        this.tweens.add({
                           targets: this.countdownText, alpha: 0, duration: 400, onComplete: () => {
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
                              // reset camera to start of new level
                              this.cameraCenter.setPosition(400, 240);
                              this.cameras.main.scrollX = 0;
                           }
                        });
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

               socket.on('gameOver', () => {
                  // Partner died — game over for everyone
                  this.gameOver = true;
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
               this.mushrooms?.clear(true, true);
               this.piranhas?.clear(true, true);
               this.children.list.filter((c: any) => c.getData && c.getData('decoration')).forEach((c: any) => c.destroy());

               const B = 32; const GY = 440; const GY2 = 472;
               const eSpeed = 55 + lvl * 12;

               const addPipe = (px: number, segs: number, piranha = false) => {
                  for (let s = 0; s < segs - 1; s++) this.blocks.create(px, GY - B * (s + 1), 'pipe_body');
                  this.blocks.create(px, GY - B * segs + 7, 'pipe_cap');
                  if (piranha) {
                     const topY = GY - B * segs - 20;
                     const hiddenY = GY - B * (segs - 1) + 4;
                     const pl = this.piranhas.create(px, hiddenY, 'piranha') as Phaser.Physics.Arcade.Sprite;
                     (pl.body as any).allowGravity = false; pl.setDepth(1);
                     this.tweens.add({ targets: pl, y: topY, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: Phaser.Math.Between(0, 900) });
                  }
               };
               const addGoomba = (ex: number, ey = GY - B) => {
                  const en = this.enemies.create(ex, ey, 'enemy') as Phaser.Physics.Arcade.Sprite;
                  (en.body as any).allowGravity = true; en.setVelocityX(-eSpeed); en.setData('dir', -eSpeed); (en.body as any).setBounceX(1);
               };
               const addKoopa = (ex: number, ey = GY - B) => {
                  const kp = this.enemies.create(ex, ey, 'koopa') as Phaser.Physics.Arcade.Sprite;
                  (kp.body as any).allowGravity = true; kp.setVelocityX(-eSpeed * 0.8); kp.setData('dir', -eSpeed * 0.8); (kp.body as any).setBounceX(1);
               };
               const addMovPlat = (px: number, py: number, spd: number, range = 90) => {
                  const pl = this.movingPlatforms.create(px, py, 'movingPlat') as Phaser.Physics.Arcade.Sprite;
                  pl.setData('originX', px); pl.setData('speed', spd); pl.setData('range', range);
                  (pl.body as any).allowGravity = false; (pl.body as any).immovable = true;
               };
               const buildCastle = (cx: number) => {
                  for (let col = 0; col < 5; col++) for (let row = 0; row < 4; row++) this.blocks.create(cx + col * B + B / 2, GY - row * B, 'castle_wall');
                  for (let row = 4; row < 7; row++) { this.blocks.create(cx + B / 2, GY - row * B, 'castle_wall'); this.blocks.create(cx + 4 * B + B / 2, GY - row * B, 'castle_wall'); }
               };
               const buildStairs = (startX: number, tex = 'block') => {
                  for (let step = 0; step < 8; step++) { const sx = startX + step * B; for (let row = 0; row <= step; row++) this.blocks.create(sx + B / 2, GY - row * B, tex); }
               };

               if (lvl === 1) {
                  // LEVEL 1 — OVERWORLD 1-1
                  this.add.rectangle(5000, 240, 10000, 480, 0x5c94fc).setDepth(-10).setData('decoration', true);
                  [[180, 1], [500, 1.4], [1900, 1], [3600, 1.2], [5600, 0.9]].forEach(([hx, sc]) =>
                     this.add.image(hx as number, GY - 22, 'hill').setScale(sc as number).setDepth(-3).setData('decoration', true));
                  for (let x = 0; x < 8500; x += B) { this.blocks.create(x + B / 2, GY, 'block'); this.blocks.create(x + B / 2, GY2, 'block'); }
                  addPipe(480, 2); addPipe(1260, 3); addPipe(2300, 2);
                  const BH = GY - 4 * B; const BH2 = GY - 5 * B;
                  [736, 800, 864, 928].forEach((bx, i) => {
                     if (i === 1 || i === 2) { const qb = this.qBlocks.create(bx, BH, 'qblock'); qb.setData('active', true); }
                     else this.blocks.create(bx, BH, 'block');
                  });
                  [1600, 1664, 1728].forEach(bx => { const qb = this.qBlocks.create(bx, BH2, 'qblock'); qb.setData('active', true); });
                  this.blocks.create(1792, BH2, 'block');
                  [2976, 3040, 3104, 3168].forEach((bx, i) => {
                     if (i % 2 === 0) this.blocks.create(bx, BH2, 'block');
                     else { const qb = this.qBlocks.create(bx, BH2, 'qblock'); qb.setData('active', true); }
                  });
                  addMovPlat(2600, 340, 60); addMovPlat(4400, 300, -60);
                  [900, 1500, 2150, 3700, 4600, 5300].forEach(ex => addGoomba(ex));
                  buildStairs(6464); this.flags.create(6960, GY - 192, 'flag'); buildCastle(7400);

               } else if (lvl === 2) {
                  // LEVEL 2 — UNDERGROUND 4-2 with Piranha Plants
                  this.add.rectangle(5000, 240, 10000, 480, 0x000018).setDepth(-10).setData('decoration', true);
                  for (let x = 0; x < 8500; x += B) { this.blocks.create(x + B / 2, 16, 'block'); this.blocks.create(x + B / 2, 48, 'block'); }
                  const pit2: [number, number][] = [[2600, 2600 + B * 4]];
                  for (let x = 0; x < 8500; x += B) {
                     if (!pit2.some(([s, e]) => x >= s && x < e)) { this.blocks.create(x + B / 2, GY, 'block'); this.blocks.create(x + B / 2, GY2, 'block'); }
                  }
                  addPipe(380, 3, true); addPipe(760, 2, true); addPipe(1380, 4, true);
                  addPipe(2000, 3, false); addPipe(3200, 3, true); addPipe(4100, 4, true);
                  addPipe(5000, 3, true); addPipe(5800, 2, true);
                  [[640, GY - 3 * B, 4], [1100, GY - 5 * B, 3], [1900, GY - 4 * B, 4],
                  [3000, GY - 4 * B, 3], [3700, GY - 6 * B, 4], [4600, GY - 3 * B, 3]].forEach(([bx, by, len]) => {
                     for (let i = 0; i < (len as number); i++) this.blocks.create((bx as number) + i * B, by as number, 'block');
                  });
                  [900, 1200, 2900, 4000].forEach(bx => { const qb = this.qBlocks.create(bx, GY - 5 * B, 'qblock'); qb.setData('active', true); });
                  addMovPlat(2900, 310, 70, 100); addMovPlat(4900, 330, -70, 100);
                  [650, 1150, 1950, 3100, 3750, 4300, 5200, 5850].forEach((ex, i) => i % 2 === 0 ? addGoomba(ex) : addKoopa(ex));
                  buildStairs(6464, 'castle_wall'); this.flags.create(6960, GY - 192, 'flag'); buildCastle(7400);

               } else {
                  // LEVEL 3+ — CASTLE / HARD
                  this.add.rectangle(5000, 240, 10000, 480, 0x1a0800).setDepth(-10).setData('decoration', true);
                  const pits: [number, number][] = [[1700, 1700 + B * 3], [3400, 3400 + B * 4], [5100, 5100 + B * 3]];
                  for (let x = 0; x < 8500; x += B) {
                     if (!pits.some(([s, e]) => x >= s && x < e)) { this.blocks.create(x + B / 2, GY, 'castle_wall'); this.blocks.create(x + B / 2, GY2, 'castle_wall'); }
                  }
                  addPipe(480, 3, true); addPipe(1260, 4, true); addPipe(2300, 3, true); addPipe(4000, 4, true); addPipe(5500, 3, true);
                  const BH3 = GY - 4 * B; const BH4 = GY - 6 * B;
                  [736, 800, 864, 928].forEach((bx, i) => {
                     if (i % 2 === 0) { const qb = this.qBlocks.create(bx, BH3, 'qblock'); qb.setData('active', true); }
                     else this.blocks.create(bx, BH3, 'castle_wall');
                  });
                  [[1600, 4], [2976, 4]].forEach(([startX, len]) => {
                     for (let i = 0; i < (len as number); i++) this.blocks.create((startX as number) + i * B, BH4, 'castle_wall');
                  });
                  addMovPlat(2600, 330, 80, 110); addMovPlat(4400, 290, -80, 110); addMovPlat(5200, 350, 70, 90);
                  [900, 1200, 1500, 2150, 2900, 3700, 4200, 4700, 5300, 5900].forEach((ex, i) => i % 3 === 0 ? addKoopa(ex) : addGoomba(ex));
                  buildStairs(6464, 'castle_wall'); this.flags.create(6960, GY - 192, 'flag'); buildCastle(7400);
               }

               this.musicPowerUp();
            }

            musicPowerUp() {
               this.playAudio(300, 'sine', 0.1); setTimeout(() => this.playAudio(400, 'sine', 0.1), 100); setTimeout(() => this.playAudio(500, 'sine', 0.2), 200);
            }

            playBrickSound() {
               if (!this.audioCtx) return;
               // Classic Mario brick-crack: short low thud + noise burst
               const now = this.audioCtx.currentTime;
               // Thud: low-pitched square wave that drops sharply
               const osc1 = this.audioCtx.createOscillator();
               const gain1 = this.audioCtx.createGain();
               osc1.type = 'square';
               osc1.frequency.setValueAtTime(220, now);
               osc1.frequency.exponentialRampToValueAtTime(80, now + 0.08);
               gain1.gain.setValueAtTime(0.35, now);
               gain1.gain.exponentialRampToValueAtTime(0.00001, now + 0.12);
               osc1.connect(gain1); gain1.connect(this.audioCtx.destination);
               osc1.start(now); osc1.stop(now + 0.12);
               // Crack: short noise burst via sawtooth at high freq
               const osc2 = this.audioCtx.createOscillator();
               const gain2 = this.audioCtx.createGain();
               osc2.type = 'sawtooth';
               osc2.frequency.setValueAtTime(600, now);
               osc2.frequency.exponentialRampToValueAtTime(200, now + 0.07);
               gain2.gain.setValueAtTime(0.2, now);
               gain2.gain.exponentialRampToValueAtTime(0.00001, now + 0.07);
               osc2.connect(gain2); gain2.connect(this.audioCtx.destination);
               osc2.start(now); osc2.stop(now + 0.07);
            }

            playBrickBreakSound() {
               if (!this.audioCtx) return;
               const now = this.audioCtx.currentTime;
               // Deep explosive thud: square wave pitches down fast
               const osc1 = this.audioCtx.createOscillator();
               const gain1 = this.audioCtx.createGain();
               osc1.type = 'square';
               osc1.frequency.setValueAtTime(300, now);
               osc1.frequency.exponentialRampToValueAtTime(50, now + 0.1);
               gain1.gain.setValueAtTime(0.5, now);
               gain1.gain.exponentialRampToValueAtTime(0.00001, now + 0.15);
               osc1.connect(gain1); gain1.connect(this.audioCtx.destination);
               osc1.start(now); osc1.stop(now + 0.15);
               // High crack 1
               const osc2 = this.audioCtx.createOscillator();
               const gain2 = this.audioCtx.createGain();
               osc2.type = 'sawtooth';
               osc2.frequency.setValueAtTime(900, now);
               osc2.frequency.exponentialRampToValueAtTime(150, now + 0.08);
               gain2.gain.setValueAtTime(0.35, now);
               gain2.gain.exponentialRampToValueAtTime(0.00001, now + 0.08);
               osc2.connect(gain2); gain2.connect(this.audioCtx.destination);
               osc2.start(now); osc2.stop(now + 0.08);
               // Second crack offset for that crumbly debris feel
               const osc3 = this.audioCtx.createOscillator();
               const gain3 = this.audioCtx.createGain();
               osc3.type = 'sawtooth';
               osc3.frequency.setValueAtTime(500, now + 0.04);
               osc3.frequency.exponentialRampToValueAtTime(100, now + 0.12);
               gain3.gain.setValueAtTime(0.25, now + 0.04);
               gain3.gain.exponentialRampToValueAtTime(0.00001, now + 0.12);
               osc3.connect(gain3); gain3.connect(this.audioCtx.destination);
               osc3.start(now + 0.04); osc3.stop(now + 0.12);
            }

            hitBlock(player: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody, block: any) {
               // Only trigger when player hits block from below (head-butt)
               if (!player.body.touching.up || !block.body?.touching.down) return;
               // Only react to floating blocks, not ground tiles (GY=440)
               if (block.y >= 430) return;
               // Throttle: only bump/break each block once per 300ms
               const now = Date.now();
               if (block.getData('lastBump') && now - block.getData('lastBump') < 300) return;
               block.setData('lastBump', now);

               if (player.getData('isBig')) {
                  // === BIG PLAYER: BREAK THE BRICK ===
                  this.playBrickBreakSound();
                  const bx = block.x; const by = block.y;
                  // Spawn 4 debris chunks flying outward
                  const debrisColors = [0xc84c0c, 0xfc9838, 0x7c3800];
                  for (let i = 0; i < 4; i++) {
                     const chunk = this.add.rectangle(
                        bx + (i % 2 === 0 ? -8 : 8),
                        by + (i < 2 ? -4 : 4),
                        10, 10,
                        debrisColors[i % debrisColors.length]
                     );
                     const vx = (i % 2 === 0 ? -1 : 1) * Phaser.Math.Between(80, 160);
                     const vy = i < 2 ? -Phaser.Math.Between(200, 340) : -Phaser.Math.Between(80, 180);
                     this.tweens.add({
                        targets: chunk,
                        x: chunk.x + vx * 0.6,
                        y: chunk.y + vy * 0.5,
                        angle: Phaser.Math.Between(-180, 180),
                        alpha: 0,
                        duration: 380,
                        ease: 'Quad.easeIn',
                        onComplete: () => chunk.destroy()
                     });
                  }
                  block.destroy();
               } else {
                  // === SMALL PLAYER: just bump ===
                  this.playBrickSound();
                  const origY = block.y;
                  this.tweens.add({
                     targets: block,
                     y: origY - 8,
                     duration: 60,
                     yoyo: true,
                     ease: 'Quad.easeOut',
                     onComplete: () => { block.y = origY; block.refreshBody(); }
                  });
               }
            }

            hitQBlock(player: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody, block: Phaser.Physics.Arcade.Sprite) {
               if (player.body.touching.up && block.body?.touching.down && block.getData('active')) {
                  block.setData('active', false);
                  block.setTexture('qblock_empty');
                  this.musicPowerUp();

                  // Spawn mushroom just above the block, slides right
                  const mush = this.mushrooms.create(block.x, block.y - 28, 'mushroom') as Phaser.Physics.Arcade.Sprite;
                  (mush.body as Phaser.Physics.Arcade.Body).setVelocityX(80);
                  (mush.body as Phaser.Physics.Arcade.Body).setBounceX(1); // bounce off walls
                  (mush.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(true);
               }
            }

            collectMushroom(player: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody, mush: Phaser.Physics.Arcade.Sprite) {
               if (!mush.active) return;
               mush.destroy();
               // Power-up jingle
               this.musicPowerUp();
               this.hearts++;
               player.setData('isBig', true);
               this.isBig = true;
               player.setScale(1.4);
               // Flash the player briefly to show power-up
               this.tweens.add({ targets: player, alpha: 0.3, yoyo: true, repeat: 3, duration: 80, onComplete: () => player.setAlpha(1) });
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

               if (player.getData('isBig')) {
                  player.setData('isBig', false);
                  this.isBig = false;
                  player.setScale(1);
                  player.setAlpha(0.5);
                  this.tweens.add({ targets: player, alpha: 0, yoyo: true, repeat: 5, duration: 100, onComplete: () => player.setAlpha(1) });
                  return;
               }

               this.hearts--;
               if (this.hearts <= 0) {
                  this.gameOver = true;
                  socket.emit('gameOver'); // notify server → triggers game over for partner too
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

                  if (p.x < originX - range && speed < 0) {
                     speed = Math.abs(speed);
                     p.setData('speed', speed);
                  } else if (p.x > originX + range && speed > 0) {
                     speed = -Math.abs(speed);
                     p.setData('speed', speed);
                  }

                  (p.body as Phaser.Physics.Arcade.Body).setVelocityX(speed);
               });

               // Animate clouds (drift slowly, loop back)
               this.clouds.getChildren().forEach((c: any) => {
                  c.x -= c.getData('speed') * 0.02; // increased drift speed
                  if (c.x < -200) c.x = 10000; // Fixed typo: loop to end of level, not x=1000
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

               const isJumpHeld = this.cursors.up.isDown || this.keyW.isDown || this.cursors.space.isDown || this.joyKeys.jump;
               const isJumpJustDown = isJumpHeld && !this.prevJump;
               this.prevJump = isJumpHeld;

               const isCrouch = this.cursors.down.isDown || this.keyS.isDown || this.joyKeys.down;
               const onGround = this.myPlayer.body.touching.down;

               let animState = 'run1';

               if (isCrouch && onGround) {
                  this.myPlayer.setVelocityX(0);
                  this.myPlayer.setBodySize(18, 16); this.myPlayer.setOffset(4, 18);
                  animState = 'crouch';
                  this.myPlayer.anims.stop();
               } else {
                  this.myPlayer.setBodySize(18, 28); this.myPlayer.setOffset(4, 6);

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

                  if (isJumpJustDown && onGround) {
                     this.myPlayer.setVelocityY(-750);
                     this.playAudio(400, 'sine', 0.1);
                  }

                  // Short hop logic: rapidly slow down upward momentum if jump is released early
                  if (!isJumpHeld && this.myPlayer.body.velocity.y < -200) {
                     this.myPlayer.setVelocityY(this.myPlayer.body.velocity.y * 0.8);
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
            backgroundColor: '#5c94fc'
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
            gap: 0,
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
