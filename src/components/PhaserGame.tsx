'use client'

import React, { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

export default function PhaserGame({ role }: { role: 'p1' | 'p2' }) {
  const gameRef = useRef<HTMLDivElement>(null);

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
        
        joyKeys = { left: false, right: false, down: false, jump: false };
        
        hearts = 3;
        gameOver = false;
        gameWon = false;
        level = 1;
        isBig = false;
        
        constructor() {
          super({ key: 'MainScene' });
        }

        drawPlayer(key: string, shirtCol: number, frameType: 'run1' | 'run2' | 'jump' | 'crouch') {
          const skin = 0xffdab9; const overalls = 0x1e90ff; const hat = shirtCol; const shoes = 0x8b4513; 
          const g = this.make.graphics({ x: 0, y: 0 }, false); const p = 3; 
          
          if (frameType === 'crouch') {
             g.fillStyle(hat); g.fillRect(3*p, 6*p, 6*p, 2*p); g.fillStyle(skin); g.fillRect(3*p, 8*p, 6*p, 3*p);
             g.fillStyle(shirtCol); g.fillRect(2*p, 11*p, 8*p, 3*p); g.fillStyle(overalls); g.fillRect(3*p, 14*p, 6*p, 2*p);
             g.fillStyle(shoes); g.fillRect(1*p, 15*p, 4*p, 2*p); g.fillRect(7*p, 15*p, 4*p, 2*p);
             g.generateTexture(key, 13*p, 17*p); g.destroy(); return;
          }

          g.fillStyle(hat); g.fillRect(3*p, 0*p, 5*p, 2*p); g.fillRect(2*p, 2*p, 7*p, 1*p);
          g.fillStyle(skin); g.fillRect(3*p, 3*p, 6*p, 4*p);
          g.fillStyle(0x000000); g.fillRect(7*p, 4*p, 1*p, 1*p); g.fillRect(7*p, 6*p, 2*p, 1*p); 
          g.fillStyle(shirtCol); g.fillRect(3*p, 7*p, 6*p, 3*p);
          g.fillStyle(overalls); g.fillRect(4*p, 9*p, 4*p, 4*p); g.fillRect(3*p, 10*p, 1*p, 3*p); g.fillRect(8*p, 10*p, 1*p, 3*p);
          
          g.fillStyle(shirtCol);
          if (frameType === 'jump') { g.fillRect(1*p, 4*p, 2*p, 4*p); g.fillRect(9*p, 6*p, 2*p, 3*p); g.fillStyle(skin); g.fillRect(1*p, 2*p, 2*p, 2*p); g.fillRect(9*p, 9*p, 2*p, 2*p); } 
          else if (frameType === 'run1') { g.fillRect(2*p, 8*p, 2*p, 3*p); g.fillRect(8*p, 8*p, 3*p, 2*p); g.fillStyle(skin); g.fillRect(2*p, 11*p, 2*p, 2*p); g.fillRect(11*p, 8*p, 2*p, 2*p); } 
          else { g.fillRect(1*p, 8*p, 3*p, 2*p); g.fillRect(9*p, 8*p, 2*p, 3*p); g.fillStyle(skin); g.fillRect(0*p, 8*p, 2*p, 2*p); g.fillRect(9*p, 11*p, 2*p, 2*p); }

          g.fillStyle(overalls);
          if (frameType === 'jump') { g.fillRect(2*p, 13*p, 3*p, 2*p); g.fillRect(7*p, 12*p, 3*p, 2*p); g.fillStyle(shoes); g.fillRect(1*p, 15*p, 3*p, 2*p); g.fillRect(8*p, 13*p, 3*p, 2*p); } 
          else if (frameType === 'run1') { g.fillRect(3*p, 13*p, 2*p, 2*p); g.fillRect(7*p, 13*p, 3*p, 2*p); g.fillStyle(shoes); g.fillRect(2*p, 15*p, 3*p, 2*p); g.fillRect(7*p, 15*p, 4*p, 2*p); } 
          else { g.fillRect(2*p, 12*p, 4*p, 2*p); g.fillRect(7*p, 13*p, 2*p, 2*p); g.fillStyle(shoes); g.fillRect(1*p, 13*p, 3*p, 2*p); g.fillRect(7*p, 15*p, 3*p, 2*p); }

          g.generateTexture(key, 13*p, 17*p); g.destroy();
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
          // Enemies
          const ge = this.make.graphics({ x: 0, y: 0 }, false);
          ge.fillStyle(0x8b4513, 1); ge.fillTriangle(0, 32, 16, 0, 32, 32);
          ge.fillStyle(0x000, 1); ge.fillRect(8, 20, 6, 6); ge.fillRect(18, 20, 6, 6);
          ge.generateTexture('enemy', 32, 32); ge.destroy();

          // QBlock
          const gq = this.make.graphics({ x: 0, y: 0 }, false);
          gq.fillStyle(0xffd700, 1); gq.fillRect(0,0,32,32); gq.lineStyle(2, 0x000, 1); gq.strokeRect(0,0,32,32);
          gq.fillStyle(0x000, 1); gq.fillRect(12, 6, 8, 4); gq.fillRect(20, 10, 4, 8); gq.fillRect(12, 18, 8, 4); gq.fillRect(14, 24, 4, 4);
          gq.generateTexture('qblock', 32, 32); gq.clear();
          gq.fillStyle(0x8b4513, 1); gq.fillRect(0,0,32,32); gq.lineStyle(2, 0x000, 1); gq.strokeRect(0,0,32,32);
          gq.generateTexture('qblock_empty', 32, 32); gq.destroy();

          const gB = this.make.graphics({ x: 0, y: 0 }, false);
          gB.fillStyle(0xd2691e, 1); gB.fillRect(0,0,32,32); gB.lineStyle(2, 0x000, 1); gB.strokeRect(0,0,32,32);
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
          this.anims.create({ key: 'p1_run', frames: [ { key: 'p1_run1' }, { key: 'p1_run2' } ], frameRate: 10, repeat: -1 });
          this.anims.create({ key: 'p2_run', frames: [ { key: 'p2_run1' }, { key: 'p2_run2' } ], frameRate: 10, repeat: -1 });
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
          this.flags = this.physics.add.staticGroup();

          this.p1 = this.physics.add.sprite(150, 360, 'p1_run1');
          this.p2 = this.physics.add.sprite(80, 360, 'p2_run1');
          this.p1.setBodySize(20, 36); this.p1.setOffset(8, 15);
          this.p2.setBodySize(20, 36); this.p2.setOffset(8, 15);
          this.p1.setCollideWorldBounds(true); this.p2.setCollideWorldBounds(true);

          this.physics.add.collider(this.p1, this.blocks); this.physics.add.collider(this.p2, this.blocks);
          this.physics.add.collider(this.enemies, this.blocks);
          
          this.physics.add.collider(this.p1, this.qBlocks, this.hitQBlock as any, undefined, this);
          this.physics.add.collider(this.p2, this.qBlocks, this.hitQBlock as any, undefined, this);

          this.physics.add.overlap(this.p1, this.enemies, this.hitEnemy as any, undefined, this);
          this.physics.add.overlap(this.p2, this.enemies, this.hitEnemy as any, undefined, this);

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

          socket.on('loadLevel', (lvl: number) => {
              this.level = lvl;
              this.gameWon = false;
              this.generateLevel(this.level);
          });

          const m1 = [ 440,0,440,523, 659,0,587,0, 523,0,392,0, 440,0,523,0 ];
          const m2 = [ 440,0,440,523, 659,0,784,0, 659,0,523,0, 440,0,0,0 ];
          const m3 = [ 659,0,587,0, 523,0,493,0, 440,0,392,0, 330,0,392,0 ];
          const m4 = [ 440,0,523,0, 659,0,784,0, 880,0,0,0, 880,0,880,0 ];
          const fullMelody = [...m1, ...m2, ...m1, ...m4, ...m3, ...m2, ...m1, ...m4];
          
          const b1 = [ 110,110,110,110, 130.8,130.8,130.8,130.8, 98,98,98,98, 146.8,146.8,146.8,146.8 ];
          const b2 = [ 110,110,0,110, 130.8,130.8,0,130.8, 164.8,164.8,0,164.8, 146.8,146.8,146.8,146.8 ];
          const fullBass = [...b1, ...b2, ...b1, ...b2, ...b1, ...b2, ...b1, ...b2];

          let noteIdx = 0;
          this.bgmInterval = window.setInterval(() => {
             if(this.gameOver || this.gameWon) return;
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

           for(let i=0; i<8000; i+=32) {
             this.blocks.create(i+16, 440, 'block');
             this.blocks.create(i+16, 472, 'block');
           }
           
           class SeededRandom {
              seed: number;
              constructor(s: number) { this.seed = s; }
              next() { this.seed = (this.seed * 9301 + 49297) % 233280; return this.seed / 233280; }
           }
           const rng = new SeededRandom(lvl * 12345); // deterministic seed based on level

           const density = Math.min(0.6, 0.1 + (lvl * 0.08)); 
           
           for(let i=1; i<45; i++) {
              let baseX = 400 + (i * 150);
              const rand1 = rng.next();
              if (rand1 < density * 0.4) {
                 this.obstacles.create(baseX, 408, 'spike');
              } else if (rand1 < density * 1.5) {
                 const en = this.enemies.create(baseX, 408, 'enemy');
                 (en.body as Phaser.Physics.Arcade.Body).allowGravity = true;
                 en.setVelocityX(rng.next() > 0.5 ? 60 : -60);
                 (en.body as Phaser.Physics.Arcade.Body).setBounceX(1);
              }
              
              if (rng.next() > 0.6) {
                 if (rng.next() > 0.7) {
                    const qb = this.qBlocks.create(baseX, 320, 'qblock');
                    qb.setData('active', true);
                 } else {
                    this.blocks.create(baseX, 320, 'block');
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
           if (this.gameWon) return; 
           this.gameWon = true; 
           this.playAudio(659, 'square', 0.2); setTimeout(() => this.playAudio(784, 'square', 0.4), 200);
           
           if (player === this.myPlayer) {
              socket.emit('nextLevel', this.level + 1);
           }
        }

        createJoystick() {
          this.input.addPointer(3); 
          const createBtn = (x:number, y:number, txt:string, action:string) => {
             const btn = this.add.circle(x, y, 40, 0xffffff, 0.4).setScrollFactor(0).setInteractive();
             this.add.text(x, y, txt, { fontSize: '24px', color:'#000', fontStyle:'bold' }).setOrigin(0.5).setScrollFactor(0);
             btn.on('pointerdown', () => (this.joyKeys as any)[action] = true); btn.on('pointerup', () => (this.joyKeys as any)[action] = false);
             btn.on('pointerout', () => (this.joyKeys as any)[action] = false);
             btn.on('pointerover', (p:Phaser.Input.Pointer) => { if (p.isDown) (this.joyKeys as any)[action] = true; });
          };
          const cx = 110; const cy = 370; const off = 65; 
          createBtn(cx - off, cy, '◀', 'left'); createBtn(cx + off, cy, '▶', 'right');
          createBtn(cx, cy - off, '▲', 'jump'); createBtn(cx, cy + off, '▼', 'down');
          createBtn(730, 400, 'JUMP', 'jump'); 
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
          if (this.gameWon) { this.uiText.setText('LEVEL CLEARED! LOADING NEXT...'); return; }

          this.enemies.getChildren().forEach((e: any) => {
             if (e.body.velocity.x === 0) e.setVelocityX(Math.random() > 0.5 ? 60 : -60);
          });

          const isLeft = this.cursors.left.isDown || this.keyA.isDown || this.joyKeys.left;
          const isRight = this.cursors.right.isDown || this.keyD.isDown || this.joyKeys.right;
          const isJump = Phaser.Input.Keyboard.JustDown(this.cursors.up) || Phaser.Input.Keyboard.JustDown(this.keyW) || Phaser.Input.Keyboard.JustDown(this.cursors.space) || this.joyKeys.jump;
          const isCrouch = this.cursors.down.isDown || this.keyS.isDown || this.joyKeys.down;
          const onGround = this.myPlayer.body.touching.down;

          let animState = 'run1';

          if (isCrouch && onGround) {
             this.myPlayer.setVelocityX(0);
             this.myPlayer.setBodySize(20, 18);
             this.myPlayer.setOffset(8, 33);
             animState = 'crouch';
             this.myPlayer.anims.stop();
          } else {
             this.myPlayer.setBodySize(20, 36);
             this.myPlayer.setOffset(8, 15);

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

  return (
    <div style={{ width: '100%', height: '100dvh', background: '#333', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0px' }}>
      <div 
        ref={gameRef} 
        style={{ width: '100%', height: '100%', maxWidth: '1200px', maxHeight: '100dvh', boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5)' }} 
      />
    </div>
  );
}
