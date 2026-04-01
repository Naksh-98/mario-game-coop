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
        obstacles!: Phaser.Physics.Arcade.StaticGroup;
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
        bgmOsc!: OscillatorNode | null;
        bgmInterval!: number;
        
        joyKeys = { left: false, right: false, down: false, jump: false };
        
        hearts = 3;
        gameOver = false;
        
        constructor() {
          super({ key: 'MainScene' });
        }

        drawPlayer(key: string, shirtCol: number, frameType: 'run1' | 'run2' | 'jump' | 'crouch') {
          const skin = 0xffdab9;
          const overalls = 0x1e90ff;
          const hat = shirtCol;
          const shoes = 0x8b4513;
          
          const g = this.make.graphics({ x: 0, y: 0 }, false);
          const p = 3; 
          
          if (frameType === 'crouch') {
             // Squashed down
             g.fillStyle(hat); g.fillRect(3*p, 6*p, 6*p, 2*p);
             g.fillStyle(skin); g.fillRect(3*p, 8*p, 6*p, 3*p);
             g.fillStyle(shirtCol); g.fillRect(2*p, 11*p, 8*p, 3*p);
             g.fillStyle(overalls); g.fillRect(3*p, 14*p, 6*p, 2*p);
             g.fillStyle(shoes); g.fillRect(1*p, 15*p, 4*p, 2*p); g.fillRect(7*p, 15*p, 4*p, 2*p);
             g.generateTexture(key, 13*p, 17*p);
             g.destroy();
             return;
          }

          // Hat
          g.fillStyle(hat); g.fillRect(3*p, 0*p, 5*p, 2*p); g.fillRect(2*p, 2*p, 7*p, 1*p);
          // Face
          g.fillStyle(skin); g.fillRect(3*p, 3*p, 6*p, 4*p);
          // Eye
          g.fillStyle(0x000000); g.fillRect(7*p, 4*p, 1*p, 1*p); g.fillRect(7*p, 6*p, 2*p, 1*p); 
          // Shirt
          g.fillStyle(shirtCol); g.fillRect(3*p, 7*p, 6*p, 3*p);
          // Overalls
          g.fillStyle(overalls);
          g.fillRect(4*p, 9*p, 4*p, 4*p); g.fillRect(3*p, 10*p, 1*p, 3*p); g.fillRect(8*p, 10*p, 1*p, 3*p);
          
          // Arms
          g.fillStyle(shirtCol);
          if (frameType === 'jump') {
              g.fillRect(1*p, 4*p, 2*p, 4*p); g.fillRect(9*p, 6*p, 2*p, 3*p);
              g.fillStyle(skin); g.fillRect(1*p, 2*p, 2*p, 2*p); g.fillRect(9*p, 9*p, 2*p, 2*p);
          } else if (frameType === 'run1') {
              g.fillRect(2*p, 8*p, 2*p, 3*p); g.fillRect(8*p, 8*p, 3*p, 2*p);
              g.fillStyle(skin); g.fillRect(2*p, 11*p, 2*p, 2*p); g.fillRect(11*p, 8*p, 2*p, 2*p);
          } else {
              g.fillRect(1*p, 8*p, 3*p, 2*p); g.fillRect(9*p, 8*p, 2*p, 3*p);
              g.fillStyle(skin); g.fillRect(0*p, 8*p, 2*p, 2*p); g.fillRect(9*p, 11*p, 2*p, 2*p);
          }

          // Legs / Shoes
          g.fillStyle(overalls);
          if (frameType === 'jump') {
              g.fillRect(2*p, 13*p, 3*p, 2*p); g.fillRect(7*p, 12*p, 3*p, 2*p);
              g.fillStyle(shoes); g.fillRect(1*p, 15*p, 3*p, 2*p); g.fillRect(8*p, 13*p, 3*p, 2*p);
          } else if (frameType === 'run1') {
              g.fillRect(3*p, 13*p, 2*p, 2*p); g.fillRect(7*p, 13*p, 3*p, 2*p);
              g.fillStyle(shoes); g.fillRect(2*p, 15*p, 3*p, 2*p); g.fillRect(7*p, 15*p, 4*p, 2*p);
          } else { 
              g.fillRect(2*p, 12*p, 4*p, 2*p); g.fillRect(7*p, 13*p, 2*p, 2*p);
              g.fillStyle(shoes); g.fillRect(1*p, 13*p, 3*p, 2*p); g.fillRect(7*p, 15*p, 3*p, 2*p);
          }

          g.generateTexture(key, 13*p, 17*p);
          g.destroy();
        }

        playAudio(freq: number, type: OscillatorType, dur: number) {
          if (!this.audioCtx) return;
          const osc = this.audioCtx.createOscillator();
          const gain = this.audioCtx.createGain();
          osc.type = type;
          osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
          osc.connect(gain);
          gain.connect(this.audioCtx.destination);
          osc.start();
          gain.gain.exponentialRampToValueAtTime(0.00001, this.audioCtx.currentTime + dur);
          osc.stop(this.audioCtx.currentTime + dur);
        }

        create() {
          // Initialize Audio
          this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          
          this.physics.world.setBounds(0, 0, 8000, 480);
          this.cameraCenter = this.add.rectangle(400, 240, 10, 10, 0, 0);
          this.cameras.main.startFollow(this.cameraCenter, false, 0.1, 0.1);
          this.cameras.main.setBounds(0, 0, 8000, 480);

          // Generate Assets
          this.drawPlayer('p1_run1', 0xd50000, 'run1');
          this.drawPlayer('p1_run2', 0xd50000, 'run2');
          this.drawPlayer('p1_jump', 0xd50000, 'jump');
          this.drawPlayer('p1_crouch', 0xd50000, 'crouch');
          this.anims.create({ key: 'p1_run', frames: [ { key: 'p1_run1' }, { key: 'p1_run2' } ], frameRate: 10, repeat: -1 });

          this.drawPlayer('p2_run1', 0x00c853, 'run1');
          this.drawPlayer('p2_run2', 0x00c853, 'run2');
          this.drawPlayer('p2_jump', 0x00c853, 'jump');
          this.drawPlayer('p2_crouch', 0x00c853, 'crouch');
          this.anims.create({ key: 'p2_run', frames: [ { key: 'p2_run1' }, { key: 'p2_run2' } ], frameRate: 10, repeat: -1 });

          // Block & Obstacle Textures
          const gB = this.make.graphics({ x: 0, y: 0 }, false);
          gB.fillStyle(0xd2691e, 1);
          gB.fillRect(0,0,32,32); gB.lineStyle(2, 0x000, 1); gB.strokeRect(0,0,32,32);
          gB.generateTexture('block', 32, 32);

          const gS = this.make.graphics({ x: 0, y: 0 }, false);
          gS.fillStyle(0xdddddd, 1);
          gS.fillTriangle(16, 0, 0, 32, 32, 32); gS.strokeTriangle(16, 0, 0, 32, 32, 32);
          gS.generateTexture('spike', 32, 32);

          // Level Generation
          this.add.rectangle(4000, 240, 8000, 480, 0x5dade2); // Sky
          this.blocks = this.physics.add.staticGroup();
          this.obstacles = this.physics.add.staticGroup();
          
          for(let i=0; i<8000; i+=32) {
             this.blocks.create(i+16, 440, 'block');
             this.blocks.create(i+16, 472, 'block');
          }

          // Build a basic level
          const levelMap = [
             {x: 600, y: 408, type: 'block'}, {x: 632, y: 408, type: 'block'},
             {x: 1000, y: 408, type: 'spike'}, 
             {x: 1500, y: 340, type: 'block'}, {x: 1532, y: 340, type: 'block'},
             {x: 1532, y: 300, type: 'block'},
             {x: 2000, y: 408, type: 'spike'}, {x: 2032, y: 408, type: 'spike'},
             {x: 2500, y: 408, type: 'block'}, {x: 2500, y: 376, type: 'block'},
          ];
          for(let i=0; i<30; i++) {
             levelMap.push({ x: 3000 + i*150, y: 408, type: Math.random() > 0.5 ? 'spike' : 'block' });
             if (Math.random() > 0.7) levelMap.push({ x: 3000 + i*150, y: 320, type: 'block' });
          }
          
          for(let item of levelMap) {
             if (item.type === 'block') this.blocks.create(item.x, item.y, 'block');
             if (item.type === 'spike') this.obstacles.create(item.x, item.y, 'spike');
          }

          // Players
          this.p1 = this.physics.add.sprite(150, 360, 'p1_run1');
          this.p2 = this.physics.add.sprite(80, 360, 'p2_run1');
          this.p1.setBodySize(20, 36); this.p1.setOffset(8, 15);
          this.p2.setBodySize(20, 36); this.p2.setOffset(8, 15);
          this.p1.setCollideWorldBounds(true);
          this.p2.setCollideWorldBounds(true);

          this.physics.add.collider(this.p1, this.blocks);
          this.physics.add.collider(this.p2, this.blocks);
          
          this.physics.add.overlap(this.p1, this.obstacles, () => this.takeDamage(this.p1), undefined, this);
          this.physics.add.overlap(this.p2, this.obstacles, () => this.takeDamage(this.p2), undefined, this);

          this.myPlayer = role === 'p1' ? this.p1 : this.p2;
          this.otherPlayer = role === 'p1' ? this.p2 : this.p1;

          // Keys
          this.cursors = this.input.keyboard!.createCursorKeys();
          this.keyW = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W);
          this.keyA = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A);
          this.keyS = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S);
          this.keyD = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D);

          // On-Screen Joystick
          this.createJoystick();

          this.uiText = this.add.text(20, 20, '', { fontSize: '24px', color: '#fff', stroke: '#000', strokeThickness: 4 }).setScrollFactor(0);

          socket.emit('join', role);

          socket.on('stateUpdate', (st: any) => {
             const opRole = role === 'p1' ? 'p2' : 'p1';
             if (st[opRole]) {
                 this.otherPlayer.setX(st[opRole].x);
                 this.otherPlayer.setY(st[opRole].y);
                 this.otherPlayer.setFlipX(st[opRole].flipX);
                 // handle remote anim
                 if (st[opRole].anim === 'run') {
                    if (!this.otherPlayer.anims.isPlaying) this.otherPlayer.play(`${opRole}_run`);
                 } else {
                    this.otherPlayer.anims.stop();
                    this.otherPlayer.setTexture(`${opRole}_${st[opRole].anim}`);
                 }
             }
          });

          // Hacky "Mario" background music
          let notes = [261.63, 261.63, 261.63, 261.63, 207.65, 233.08];
          let noteIdx = 0;
          this.bgmInterval = window.setInterval(() => { // Keep interval out of Phaser time to avoid pause issues
             if(this.gameOver) return;
             // playAudio(notes[noteIdx % notes.length], 'square', 0.1);
             // noteIdx++;
          }, 300) as unknown as number; // Optional BG music beep loop
        }

        createJoystick() {
          this.input.addPointer(3); // Allow multi-touch up to 4 touches

          const createBtn = (x:number, y:number, txt:string, action:string) => {
             const btn = this.add.circle(x, y, 45, 0xffffff, 0.4).setScrollFactor(0).setInteractive();
             this.add.text(x, y, txt, { fontSize: '26px', color:'#000', fontStyle:'bold' }).setOrigin(0.5).setScrollFactor(0);
             
             btn.on('pointerdown', () => (this.joyKeys as any)[action] = true);
             btn.on('pointerup', () => (this.joyKeys as any)[action] = false);
             btn.on('pointerout', () => (this.joyKeys as any)[action] = false);
             btn.on('pointerover', (pointer: Phaser.Input.Pointer) => {
                 if (pointer.isDown) (this.joyKeys as any)[action] = true;
             });
          };
          
          const cx = 130;
          const cy = 370;
          const off = 80; // Distance from center
          
          createBtn(cx - off, cy, '◀', 'left');
          createBtn(cx + off, cy, '▶', 'right');
          createBtn(cx, cy - off, '▲', 'jump');
          createBtn(cx, cy + off, '▼', 'down');
          
          createBtn(700, 390, 'JUMP', 'jump'); // Action Button right side
        }

        takeDamage(player: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody) {
          if (player.alpha !== 1 || this.gameOver) return;
          this.playAudio(100, 'sawtooth', 0.3);
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
          if (this.gameOver) {
             this.uiText.setText('GAME OVER!');
             return;
          }

          // My Input logic
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
                 // Reset joy jump to prevent bounce
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

          // Camera constraints: only move forward if both characters are ready
          // The screen binds to Math.min(p1, p2) + some distance
          const leftMost = Math.min(this.p1.x, this.p2.x);
          const rightMost = Math.max(this.p1.x, this.p2.x);
          
          // Camera bounds
          const currentCamLeft = this.cameras.main.scrollX;
          // Target x is midpoint, but only advance if leftMost allows it
          const targetX = Math.max(leftMost + 300, currentCamLeft + 400); 
          
          this.cameraCenter.x = Phaser.Math.Clamp(targetX, 400, 7600);
          
          // Prevent players going way past camera bounds
          const camLeftX = this.cameras.main.scrollX;
          if (this.myPlayer.x < camLeftX + 10) {
             this.myPlayer.x = camLeftX + 10;
          }

          // Broadcast state
          socket.emit('updateState', {
             role,
             x: this.myPlayer.x,
             y: this.myPlayer.y,
             anim: animState,
             flipX: this.myPlayer.flipX
          });

          this.uiText.setText(`Role: ${role.toUpperCase()}  Hearts: ${'❤️'.repeat(this.hearts)}`);
        }
      }

      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH,
            width: 800,
            height: 480,
        },
        parent: gameRef.current!,
        physics: {
          default: 'arcade',
          arcade: { gravity: { x: 0, y: 1600 }, debug: false },
        },
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
    <div style={{ width: '100%', height: '100%', maxWidth: '1200px', margin: '0 auto', boxShadow: 'inset 0 0 20px rgba(0,0,0,1)' }}>
       <div ref={gameRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
