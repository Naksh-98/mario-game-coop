
const fs = require('fs');
const path = 'c:/Fun/mario-game-coop/src/components/PhaserGame.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Restore advanced playAudio and all SFX methods
const oldPlayAudio = `            playAudio(freq: number, type: OscillatorType, dur: number) {
               if (!this.audioCtx || freq === 0) return;
               const osc = this.audioCtx.createOscillator();
               const gain = this.audioCtx.createGain();
               osc.type = type; osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
               osc.connect(gain); gain.connect(this.audioCtx.destination);
               osc.start(); gain.gain.exponentialRampToValueAtTime(0.00001, this.audioCtx.currentTime + dur);
               osc.stop(this.audioCtx.currentTime + dur);
            }`;

const restoredAudioMethods = `            playAudio(freq: number, type: OscillatorType, dur: number, ramp = true) {
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
               } else {
                  const m1 = [311, 293, 311, 293, 311, 0, 261, 0, 311, 293, 311, 293, 311, 0, 349, 0];
                  const m2 = [311, 293, 311, 293, 311, 0, 392, 0, 311, 293, 311, 293, 311, 0, 261, 0];
                  const melody = [...m1, ...m2, ...m1, ...m2];
                  const b1 = [130, 130, 130, 130, 130, 130, 130, 130, 130, 130, 130, 130, 130, 130, 130, 130];
                  const b2 = [103, 103, 103, 103, 103, 103, 103, 103, 116, 116, 116, 116, 116, 116, 116, 116];
                  const bass = [...b1, ...b2, ...b1, ...b2];
                  return { melody, bass, tempo: 100, mType: 'square' as OscillatorType, bType: 'sawtooth' as OscillatorType };
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
            }`;

content = content.replace(oldPlayAudio, restoredAudioMethods);

// 2. Restore Player Depth
const playerDepthSearch = "this.p1.setCollideWorldBounds(true); this.p2.setCollideWorldBounds(true);";
const playerDepthReplacement = "this.p1.setCollideWorldBounds(true); this.p2.setCollideWorldBounds(true);\n               this.p1.setDepth(10); this.p2.setDepth(10);";
content = content.replace(playerDepthSearch, playerDepthReplacement);

// 3. Restore Pipe Depth
const pipeBodySearch = "for (let s = 0; s < segs - 1; s++) this.blocks.create(px, GY - B * (s + 1), 'pipe_body');";
const pipeBodyReplacement = "for (let s = 0; s < segs - 1; s++) (this.blocks.create(px, GY - B * (s + 1), 'pipe_body') as Phaser.Physics.Arcade.Sprite).setDepth(2);";
content = content.replace(pipeBodySearch, pipeBodyReplacement);

const pipeCapSearch = "this.blocks.create(px, GY - B * segs + 7, 'pipe_cap');";
const pipeCapReplacement = "(this.blocks.create(px, GY - B * segs + 7, 'pipe_cap') as Phaser.Physics.Arcade.Sprite).setDepth(2);";
content = content.replace(pipeCapSearch, pipeCapReplacement);

// 4. Restore BGM starting and logic in create()
const oldBGMBlock = `               const m1 = [440, 0, 440, 523, 659, 0, 587, 0, 523, 0, 392, 0, 440, 0, 523, 0];
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
               }, 125) as unknown as number; // 125ms = 120BPM fast 16th notes `;

content = content.replace(oldBGMBlock, "               this.startBGM();");

// 5. Restore musicPowerUp and startBGM calls
content = content.replace("this.musicPowerUp();", "this.startBGM();"); // at end of generateLevel
content = content.replace("this.playAudio(300, 'sine', 0.1); setTimeout(() => this.playAudio(400, 'sine', 0.1), 100); setTimeout(() => this.playAudio(500, 'sine', 0.2), 200);", "this.playPowerUpSound();");

// 6. Restore Interaction Sound triggers
content = content.replace("this.playAudio(440, 'sine', 0.1);", "this.playStompSound();");
content = content.replace("this.playAudio(100, 'sawtooth', 0.3);", "this.playHurtSound();");
content = content.replace("this.playAudio(400, 'sine', 0.1);", "this.playJumpSound();");

// 7. Restore flag victory sound
content = content.replace("socket.emit('flagTouched', playerRole);", "socket.emit('flagTouched', playerRole);\n               if (playerRole === role) this.playVictorySound();");

// 8. Restore GameOver sound
content = content.replace("this.gameOver = true;\n                  socket.emit('gameOver');", "this.playGameOverSound();\n                  this.gameOver = true;\n                  socket.emit('gameOver');");

// 9. Restore Moving Platform Momentum
const platformSearch = "(p.body as Phaser.Physics.Arcade.Body).setVelocityX(speed);";
const platformReplacement = `const oldX = p.x;
                  (p.body as Phaser.Physics.Arcade.Body).setVelocityX(speed);
                  const deltaX = p.x - oldX;
                  [this.p1, this.p2].forEach(plr => {
                     if (plr.body.touching.down && (plr.body as any).moves && 
                         Phaser.Geom.Intersects.RectangleToRectangle(plr.getBounds(), p.getBounds())) {
                        plr.x += deltaX;
                     }
                  });`;
content = content.replace(platformSearch, platformReplacement);

// 10. Restore Cleanup
const cleanupSearch = "if (socket) { socket.disconnect(); }";
const cleanupReplacement = `if (socket) { socket.disconnect(); }
         if (typeof window !== 'undefined') {
            const allIntervals = window.setInterval(() => {}, 9999);
            for (let i = 0; i <= allIntervals; i++) window.clearInterval(i);
         }`;
content = content.replace(cleanupSearch, cleanupReplacement);

fs.writeFileSync(path, content);
console.log('Done');
