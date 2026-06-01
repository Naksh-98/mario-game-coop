'use client'

import React, { useEffect, useRef, useCallback } from 'react';

export default function MiniGame({ musicVolume = 0.5, sfxVolume = 0.7, btnPos = 'left' }: { musicVolume?: number; sfxVolume?: number; btnPos?: 'left' | 'right' }) {
   const gameRef = useRef<HTMLDivElement>(null);
   const joyKeysRef = useRef({ left: false, right: false, jump: false });
   const musicVolumeRef = useRef(musicVolume);
   const sfxVolumeRef = useRef(sfxVolume);
   useEffect(() => { musicVolumeRef.current = musicVolume; }, [musicVolume]);
   useEffect(() => { sfxVolumeRef.current = sfxVolume; }, [sfxVolume]);

   useEffect(() => {
      if (typeof window === 'undefined') return;
      let isDestroyed = false;
      let game: any;

      import('phaser').then((ph) => {
         if (isDestroyed) return;
         const Phaser = ph.default || ph;

         class MiniScene extends Phaser.Scene {
            player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
            enemies!: Phaser.Physics.Arcade.Group;
            coins!: Phaser.Physics.Arcade.Group;
            blocks!: Phaser.Physics.Arcade.StaticGroup;
            cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
            uiText!: Phaser.GameObjects.Text;
            waveText!: Phaser.GameObjects.Text;
            score = 0;
            wave = 1;
            gameOver = false;
            waveInProgress = false; // flag to prevent double-triggering
            spawnDelay = 2000;
            joyKeys = joyKeysRef.current;
            prevJump = false;
            currentBgm: Phaser.Sound.BaseSound | null = null;

            preload() {
               this.load.audio('minigamemain', '/audio/minigamemain.mp3');
               this.load.audio('mariodeath', '/audio/mariodeath.mp3');
               this.load.audio('coin', '/audio/mario_coin_sound.mp3');
               this.load.audio('jump', '/audio/Super+Mario+-+Jump+(Sound+Effect).mp3');
            }

            // Exact same drawPlayer as PhaserGame (p=2, shirtCol driven)
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

            playCoinSound() {
               try { this.sound.play('coin', { volume: sfxVolumeRef.current }); } catch {}
            }
            playJumpSound() {
               try { this.sound.play('jump', { volume: sfxVolumeRef.current * 0.9 }); } catch {}
            }

            constructor() { super({ key: 'MiniScene' }); }

            create() {
               // Resume BGM on user interaction
                const resumeAudio = () => {
                   const snd = this.sound as any;
                   if (snd.context && snd.context.state === 'suspended') {
                      snd.context.resume().then(() => {
                         if (this.currentBgm && !this.currentBgm.isPlaying) this.currentBgm.play();
                      });
                   }
                };
               this.input.on('pointerdown', resumeAudio);
               this.input.keyboard?.on('keydown', resumeAudio);

               try {
                  this.currentBgm = this.sound.add('minigamemain', { loop: true, volume: musicVolumeRef.current });
                  this.currentBgm.play();
               } catch (e) { console.error('Error playing minigame BGM:', e); }

               // Sky background
               this.add.rectangle(400, 240, 800, 480, 0x5c94fc);

               // Ground only — no floating platforms
               this.blocks = this.physics.add.staticGroup();
               for (let x = 0; x < 800; x += 32) {
                  this.blocks.create(x + 16, 460, undefined).setSize(32, 32).setVisible(false);
                  this.add.rectangle(x + 16, 460, 32, 32, 0xc84c0c);
                  this.add.rectangle(x + 16, 476, 32, 16, 0x7c3800);
               }

               // Draw Mario frames — exact same as PhaserGame (Mario red hat)
               this.drawPlayer('mario_run1', 0xd50000, 'run1');
               this.drawPlayer('mario_run2', 0xd50000, 'run2');
               this.drawPlayer('mario_jump', 0xd50000, 'jump');

               // Walk animation — exact same frameRate as PhaserGame
               this.anims.create({ key: 'mario_run', frames: [{ key: 'mario_run1' }, { key: 'mario_run2' }], frameRate: 10, repeat: -1 });

               // Enemy texture (Goomba-style)
               const ge = this.make.graphics({ x: 0, y: 0 }, false);
               ge.fillStyle(0x8b4513); ge.fillRect(2, 0, 8, 6);
               ge.fillStyle(0xffdab9); ge.fillRect(2, 6, 8, 4);
               ge.fillStyle(0x000000); ge.fillRect(3, 7, 2, 2); ge.fillRect(7, 7, 2, 2);
               ge.fillStyle(0x8b4513); ge.fillRect(0, 10, 5, 2); ge.fillRect(7, 10, 5, 2);
               ge.generateTexture('mini_enemy', 12, 12); ge.destroy();

               // Coin texture
               const gc = this.make.graphics({ x: 0, y: 0 }, false);
               gc.fillStyle(0xffd700); gc.fillCircle(6, 6, 6);
               gc.fillStyle(0xffee00); gc.fillCircle(5, 5, 3);
               gc.generateTexture('mini_coin', 12, 12); gc.destroy();

               // Player — scale 1, same bodySize + offset as PhaserGame
               this.player = this.physics.add.sprite(400, 380, 'mario_run1');
               this.player.setScale(1);
               this.player.setBodySize(18, 28);
               this.player.setOffset(4, 6);
               this.player.setCollideWorldBounds(true);
               this.player.setDepth(10);
               this.physics.add.collider(this.player, this.blocks);

               this.enemies = this.physics.add.group();
               this.coins = this.physics.add.group();
               this.physics.add.collider(this.enemies, this.blocks);
               this.physics.add.collider(this.coins, this.blocks);

               this.physics.add.overlap(this.player, this.enemies, () => {
                  if (this.player.body.touching.down && (this.enemies as any).getChildren().some((e: any) => e.body.touching.up)) {
                     this.enemies.getChildren().forEach((e: any) => { if (e.body.touching.up) { e.destroy(); this.score += 1000; } });
                     this.player.setVelocityY(-450);
                  } else {
                     if (!this.gameOver) { this.gameOver = true; this.showGameOver(); }
                  }
               }, undefined, this);

               this.physics.add.overlap(this.player, this.coins, (_p: any, coin: any) => {
                  coin.destroy(); this.score += 300;
                  this.playCoinSound();
               }, undefined, this);

               this.cursors = this.input.keyboard!.createCursorKeys();
               this.uiText = this.add.text(10, 10, '', { fontSize: '22px', color: '#fff', stroke: '#000', strokeThickness: 3, fontFamily: 'monospace' }).setDepth(100);
               this.waveText = this.add.text(400, 220, '', { fontSize: '52px', color: '#ffd700', stroke: '#000', strokeThickness: 5, fontStyle: 'bold', fontFamily: 'monospace' }).setOrigin(0.5).setDepth(100).setAlpha(0);

               this.startWave();
            }

            startWave() {
               if (this.gameOver || this.waveInProgress) return;
               this.waveInProgress = true;

               this.waveText.setText(`WAVE ${this.wave}`).setAlpha(1);
               this.tweens.add({ targets: this.waveText, alpha: 0, duration: 1200, delay: 1200 });

               const enemyCount = 2 + this.wave * 2;
               let spawned = 0;
               let killed = 0;
               this.spawnDelay = Math.max(700, 2200 - this.wave * 150);

               const spawnNext = () => {
                  if (this.gameOver || spawned >= enemyCount) return;
                  const ex = Phaser.Math.Between(50, 750);
                  const enemy = this.enemies.create(ex, -20, 'mini_enemy') as Phaser.Physics.Arcade.Sprite;
                  enemy.setScale(2.2);
                  enemy.setBounceX(1);
                  enemy.setCollideWorldBounds(true);
                  enemy.setVelocityX(Phaser.Math.Between(60, 120) * (Math.random() < 0.5 ? -1 : 1) * (1 + this.wave * 0.15));
                  spawned++;

                  enemy.on('destroy', () => {
                     killed++;
                     if (!this.gameOver && spawned >= enemyCount && killed >= enemyCount) {
                        this.time.delayedCall(900, () => {
                           if (!this.gameOver) { this.wave++; this.waveInProgress = false; this.startWave(); }
                        });
                     }
                  });

                  if (Math.random() < 0.4) {
                     const cx = Phaser.Math.Between(50, 750);
                     const coin = this.coins.create(cx, -20, 'mini_coin') as Phaser.Physics.Arcade.Sprite;
                     coin.setScale(2); coin.setBounceX(1); coin.setCollideWorldBounds(true);
                  }

                  if (spawned < enemyCount) this.time.delayedCall(this.spawnDelay, spawnNext);
               };

               this.time.delayedCall(1400, spawnNext);
            }

            showGameOver() {
               if (this.currentBgm) { this.currentBgm.stop(); this.currentBgm.destroy(); this.currentBgm = null; }
               try { this.sound.play('mariodeath', { volume: sfxVolumeRef.current }); } catch (e) { console.error(e); }
               this.add.rectangle(400, 240, 440, 220, 0x000000, 0.85).setDepth(200);
               this.add.text(400, 180, 'GAME OVER', { fontSize: '44px', color: '#ff0000', stroke: '#000', strokeThickness: 5, fontStyle: 'bold', fontFamily: 'monospace' }).setOrigin(0.5).setDepth(201);
               this.add.text(400, 248, `SCORE: ${this.score}`, { fontSize: '26px', color: '#ffd700', stroke: '#000', strokeThickness: 2, fontFamily: 'monospace' }).setOrigin(0.5).setDepth(201);
               this.add.text(400, 295, `WAVE REACHED: ${this.wave}`, { fontSize: '20px', color: '#fff', stroke: '#000', strokeThickness: 2, fontFamily: 'monospace' }).setOrigin(0.5).setDepth(201);
            }

            update() {
               if (this.gameOver) return;

               const onGround = this.player.body.touching.down;
               const isLeft = this.cursors.left.isDown || this.joyKeys.left;
               const isRight = this.cursors.right.isDown || this.joyKeys.right;
               const isJumpHeld = this.cursors.up.isDown || this.cursors.space.isDown || this.joyKeys.jump;
               const isJumpJustDown = isJumpHeld && !this.prevJump; this.prevJump = isJumpHeld;
               let animState = 'run1';

               if (isLeft) { this.player.setVelocityX(-250); this.player.setFlipX(true); if (onGround) { animState = 'run'; this.player.play('mario_run', true); } }
               else if (isRight) { this.player.setVelocityX(250); this.player.setFlipX(false); if (onGround) { animState = 'run'; this.player.play('mario_run', true); } }
               else { this.player.setVelocityX(0); animState = 'run1'; this.player.anims.stop(); }

               if (isJumpJustDown && onGround) { this.player.setVelocityY(-750); this.playJumpSound(); }
               if (!isJumpHeld && this.player.body.velocity.y < -200) this.player.setVelocityY(this.player.body.velocity.y * 0.8);
               if (!onGround) { animState = 'jump'; this.player.anims.stop(); }

               if (animState !== 'run') this.player.setTexture(`mario_${animState}`);

               this.uiText.setText(`SCORE: ${this.score}  •  WAVE: ${this.wave}`);

               // Clean up enemies that fell off screen
               this.enemies.getChildren().forEach((e: any) => { if (e.y > 520) e.destroy(); });
            }

         }

         const config: Phaser.Types.Core.GameConfig = {
            type: Phaser.AUTO,
            scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 800, height: 480 },
            parent: gameRef.current!,
            physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 1400 }, debug: false } },
            scene: [MiniScene],
            backgroundColor: '#5c94fc'
         };
         game = new Phaser.Game(config);
      });

      return () => { isDestroyed = true; if (game) game.destroy(true); };
   }, []);

   const handleTouchStart = useCallback((e: React.TouchEvent) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
         const el = document.elementFromPoint(e.changedTouches[i].clientX, e.changedTouches[i].clientY) as HTMLElement | null;
         const action = el?.dataset?.action;
         if (action) joyKeysRef.current[action as keyof typeof joyKeysRef.current] = true;
      }
   }, []);
   const handleTouchMove = useCallback((e: React.TouchEvent) => { e.preventDefault(); }, []);
   const handleTouchEnd = useCallback((e: React.TouchEvent) => {
      e.preventDefault();
      joyKeysRef.current.left = false; joyKeysRef.current.right = false; joyKeysRef.current.jump = false;
   }, []);
   const touchProps = { onTouchStart: handleTouchStart, onTouchMove: handleTouchMove, onTouchEnd: handleTouchEnd, onTouchCancel: handleTouchEnd };

   const btnStyle: React.CSSProperties = { width: 56, height: 56, borderRadius: '50%', background: 'rgba(60,60,200,0.82)', border: '3px solid rgba(255,255,255,0.35)', color: '#fff', fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', touchAction: 'none', userSelect: 'none' };

   return (
      <div style={{ width: '100vw', height: '100dvh', background: '#111', position: 'relative', overflow: 'hidden', touchAction: 'none' }}>
         <div ref={gameRef} style={{ width: '100%', height: '100%' }} />
         {/* D-Pad on chosen side */}
         <div {...touchProps} style={{ position: 'absolute', [btnPos === 'left' ? 'left' : 'right']: 20, bottom: 20, display: 'flex', gap: 10, zIndex: 10 }}>
            <button data-action="left" style={btnStyle}>◀</button>
            <button data-action="right" style={btnStyle}>▶</button>
         </div>
         {/* JUMP on opposite side */}
         <div {...touchProps} style={{ position: 'absolute', [btnPos === 'left' ? 'right' : 'left']: 20, bottom: 20, zIndex: 10 }}>
            <button data-action="jump" style={{ ...btnStyle, width: 68, height: 68, background: 'rgba(210,30,30,0.88)', fontSize: 14, fontWeight: 'bold' }}>JUMP</button>
         </div>
      </div>
   );
}
