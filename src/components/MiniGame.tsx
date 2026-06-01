'use client'

import React, { useEffect, useRef, useCallback } from 'react';

export default function MiniGame() {
   const gameRef = useRef<HTMLDivElement>(null);
   const joyKeysRef = useRef({ left: false, right: false, jump: false });

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
            spawnDelay = 2000;
            joyKeys = joyKeysRef.current;
            prevJump = false;

            constructor() { super({ key: 'MiniScene' }); }

            create() {
               this.add.rectangle(400, 240, 800, 480, 0x5c94fc);
               // Ground
               this.blocks = this.physics.add.staticGroup();
               for (let x = 0; x < 800; x += 32) {
                  this.blocks.create(x + 16, 460, undefined).setSize(32, 32).setVisible(false);
                  this.add.rectangle(x + 16, 460, 32, 32, 0xc84c0c);
                  this.add.rectangle(x + 16, 476, 32, 16, 0x7c3800);
               }
               // Some platforms
               [[150, 340, 4], [500, 300, 3], [300, 220, 3], [600, 360, 3]].forEach(([px, py, len]) => {
                  for (let i = 0; i < (len as number); i++) {
                     this.blocks.create((px as number) + i * 32, py as number, undefined).setSize(32, 16).setVisible(false);
                     this.add.rectangle((px as number) + i * 32, py as number, 32, 16, 0x32cd32);
                  }
               });

               // Player
               const g = this.make.graphics({ x: 0, y: 0 }, false);
               g.fillStyle(0xd50000); g.fillRect(3, 0, 5, 2); g.fillRect(2, 2, 7, 1);
               g.fillStyle(0xffdab9); g.fillRect(3, 3, 6, 4);
               g.fillStyle(0x1e90ff); g.fillRect(3, 7, 6, 5);
               g.fillStyle(0x8b4513); g.fillRect(2, 12, 3, 2); g.fillRect(7, 12, 3, 2);
               g.generateTexture('mini_player', 12, 14); g.destroy();

               this.player = this.physics.add.sprite(400, 400, 'mini_player');
               this.player.setCollideWorldBounds(true);
               this.player.setScale(2.5);
               this.physics.add.collider(this.player, this.blocks);

               // Enemy texture
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

               this.enemies = this.physics.add.group();
               this.coins = this.physics.add.group();
               this.physics.add.collider(this.enemies, this.blocks);
               this.physics.add.collider(this.coins, this.blocks);

               this.physics.add.overlap(this.player, this.enemies, () => {
                  if (this.player.body.touching.down && (this.enemies as any).getChildren().some((e: any) => e.body.touching.up)) {
                     // Stomp
                     this.enemies.getChildren().forEach((e: any) => { if (e.body.touching.up) { e.destroy(); this.score += 1000; } });
                     this.player.setVelocityY(-400);
                  } else {
                     if (!this.gameOver) { this.gameOver = true; this.showGameOver(); }
                  }
               }, undefined, this);

               this.physics.add.overlap(this.player, this.coins, (_p: any, coin: any) => {
                  coin.destroy(); this.score += 300;
               }, undefined, this);

               this.cursors = this.input.keyboard!.createCursorKeys();
               this.uiText = this.add.text(10, 10, '', { fontSize: '20px', color: '#fff', stroke: '#000', strokeThickness: 3 }).setDepth(100);
               this.waveText = this.add.text(400, 240, '', { fontSize: '48px', color: '#ffd700', stroke: '#000', strokeThickness: 4, fontStyle: 'bold' }).setOrigin(0.5).setDepth(100).setAlpha(0);

               this.startWave();
            }

            startWave() {
               // Show wave text
               this.waveText.setText(`WAVE ${this.wave}`).setAlpha(1);
               this.tweens.add({ targets: this.waveText, alpha: 0, duration: 1500, delay: 1000 });

               // Spawn enemies in waves
               const enemyCount = 3 + this.wave * 2;
               let spawned = 0;
               this.spawnDelay = Math.max(600, 2000 - this.wave * 200);

               const spawnEvent = this.time.addEvent({ delay: this.spawnDelay, repeat: enemyCount - 1, callback: () => {
                  if (this.gameOver) return;
                  const ex = Phaser.Math.Between(50, 750);
                  const enemy = this.enemies.create(ex, -20, 'mini_enemy') as Phaser.Physics.Arcade.Sprite;
                  enemy.setScale(2); enemy.setBounceX(1); enemy.setCollideWorldBounds(true);
                  enemy.setVelocityX(Phaser.Math.Between(-100, 100) * (1 + this.wave * 0.2));
                  spawned++;

                  // Also spawn coins sometimes
                  if (Math.random() < 0.4) {
                     const cx = Phaser.Math.Between(50, 750);
                     const coin = this.coins.create(cx, -20, 'mini_coin') as Phaser.Physics.Arcade.Sprite;
                     coin.setScale(2); coin.setBounceX(1); coin.setCollideWorldBounds(true);
                  }
               }});

               // Check when wave is done (all enemies killed)
               this.time.addEvent({ delay: 1000, loop: true, callback: () => {
                  if (this.gameOver) return;
                  if (spawned >= enemyCount && this.enemies.countActive() === 0) {
                     this.wave++;
                     this.startWave();
                  }
               }});
            }

            showGameOver() {
               this.add.rectangle(400, 240, 400, 200, 0x000000, 0.8).setDepth(200);
               this.add.text(400, 200, 'GAME OVER', { fontSize: '40px', color: '#ff0000', stroke: '#000', strokeThickness: 4, fontStyle: 'bold' }).setOrigin(0.5).setDepth(201);
               this.add.text(400, 260, `SCORE: ${this.score}`, { fontSize: '24px', color: '#ffd700', stroke: '#000', strokeThickness: 2 }).setOrigin(0.5).setDepth(201);
               this.add.text(400, 300, `WAVE: ${this.wave}`, { fontSize: '20px', color: '#fff', stroke: '#000', strokeThickness: 2 }).setOrigin(0.5).setDepth(201);
            }

            update() {
               if (this.gameOver) return;

               const isLeft = this.cursors.left.isDown || this.joyKeys.left;
               const isRight = this.cursors.right.isDown || this.joyKeys.right;
               const isJumpHeld = this.cursors.up.isDown || this.cursors.space.isDown || this.joyKeys.jump;
               const isJumpJustDown = isJumpHeld && !this.prevJump; this.prevJump = isJumpHeld;

               if (isLeft) this.player.setVelocityX(-200);
               else if (isRight) this.player.setVelocityX(200);
               else this.player.setVelocityX(0);

               if (isJumpJustDown && this.player.body.touching.down) this.player.setVelocityY(-600);

               this.uiText.setText(`SCORE: ${this.score}  |  WAVE: ${this.wave}`);

               // Remove enemies that fall off screen
               this.enemies.getChildren().forEach((e: any) => { if (e.y > 500) e.destroy(); });
            }
         }

         const config: Phaser.Types.Core.GameConfig = {
            type: Phaser.AUTO,
            scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 800, height: 480 },
            parent: gameRef.current!,
            physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 1200 }, debug: false } },
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
   const handleTouchMove = useCallback((e: React.TouchEvent) => {
      e.preventDefault();
      // Keep current buttons pressed
   }, []);
   const handleTouchEnd = useCallback((e: React.TouchEvent) => {
      e.preventDefault();
      joyKeysRef.current.left = false; joyKeysRef.current.right = false; joyKeysRef.current.jump = false;
   }, []);
   const touchProps = { onTouchStart: handleTouchStart, onTouchMove: handleTouchMove, onTouchEnd: handleTouchEnd, onTouchCancel: handleTouchEnd };

   const btnStyle: React.CSSProperties = { width: 56, height: 56, borderRadius: '50%', background: 'rgba(60,60,200,0.82)', border: '3px solid rgba(255,255,255,0.35)', color: '#fff', fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', touchAction: 'none', userSelect: 'none' };

   return (
      <div style={{ width: '100vw', height: '100dvh', background: '#111', position: 'relative', overflow: 'hidden', touchAction: 'none' }}>
         <div ref={gameRef} style={{ width: '100%', height: '100%' }} />
         <div {...touchProps} style={{ position: 'absolute', left: 20, bottom: 20, display: 'flex', gap: 10, zIndex: 10 }}>
            <button data-action="left" style={btnStyle}>◀</button>
            <button data-action="right" style={btnStyle}>▶</button>
         </div>
         <div {...touchProps} style={{ position: 'absolute', right: 20, bottom: 20, zIndex: 10 }}>
            <button data-action="jump" style={{ ...btnStyle, width: 64, height: 64, background: 'rgba(210,30,30,0.88)', fontSize: 14 }}>JUMP</button>
         </div>
      </div>
   );
}
