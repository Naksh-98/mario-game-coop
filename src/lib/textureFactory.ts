/**
 * TextureFactory — extracted procedural texture generation.
 * Shared between MainScene (gameplay) and LevelEditorScene (palette thumbnails).
 */

function drawPlayer(scene: Phaser.Scene, key: string, shirtCol: number, frameType: 'run1' | 'run2' | 'jump' | 'crouch') {
  const skin = 0xffdab9; const overalls = 0x1e90ff; const hat = shirtCol; const shoes = 0x8b4513;
  const g = scene.make.graphics({ x: 0, y: 0 }, false); const p = 2;

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

function drawPrincess(scene: Phaser.Scene, key: string, frameType: 'run1' | 'run2' | 'jump' | 'crouch') {
  const skin = 0xffdab9; const hair = 0xffe066; const dress = 0xffb6c1; const trim = 0xff1493;
  const crown = 0xffd700; const jewel = 0x00bfff; const shoes = 0xe52458; const legs = 0xffffff;
  const g = scene.make.graphics({ x: 0, y: 0 }, false); const p = 2;

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


/**
 * Creates all procedural textures used in the game.
 * Call from any Phaser.Scene's create() method.
 */
export function createTextures(scene: Phaser.Scene): void {
  const ge = scene.make.graphics({ x: 0, y: 0 }, false);
  ge.fillStyle(0x8b4513, 1); ge.fillRect(4, 0, 24, 20);
  ge.fillStyle(0xcc2200, 1); ge.fillRect(0, 0, 32, 14); ge.fillRect(2, 14, 28, 6);
  ge.fillStyle(0xffdab9, 1); ge.fillRect(6, 20, 20, 12);
  ge.fillStyle(0x000, 1); ge.fillRect(9, 23, 5, 5); ge.fillRect(18, 23, 5, 5);
  ge.fillStyle(0xffffff, 1); ge.fillRect(10, 24, 3, 3); ge.fillRect(19, 24, 3, 3);
  ge.fillStyle(0x8b4513, 1); ge.fillRect(2, 28, 10, 4); ge.fillRect(20, 28, 10, 4);
  ge.generateTexture('enemy', 32, 32); ge.destroy();

  const gF = scene.make.graphics({ x: 0, y: 0 }, false);
  gF.fillStyle(0xff6600, 1); gF.fillCircle(10, 10, 10);
  gF.fillStyle(0xffff00, 1); gF.fillCircle(10, 10, 6);
  gF.fillStyle(0xffffff, 1); gF.fillCircle(8, 8, 3);
  gF.generateTexture('fireball', 20, 20); gF.destroy();

  const gP = scene.make.graphics({ x: 0, y: 0 }, false);
  gP.fillStyle(0x228b22, 1); gP.fillRect(0, 0, 96, 16);
  gP.fillStyle(0x32cd32, 1); gP.fillRect(2, 2, 92, 6);
  gP.lineStyle(2, 0x145214, 1); gP.strokeRect(0, 0, 96, 16);
  gP.generateTexture('movingPlat', 96, 16); gP.destroy();

  const gC = scene.make.graphics({ x: 0, y: 0 }, false);
  gC.fillStyle(0xffffff, 0.9); gC.fillEllipse(60, 40, 80, 40); gC.fillEllipse(40, 48, 60, 36); gC.fillEllipse(85, 48, 55, 30); gC.fillEllipse(60, 55, 100, 28);
  gC.fillStyle(0xe8e8ff, 0.5); gC.fillEllipse(55, 35, 50, 20);
  gC.generateTexture('cloud', 120, 70); gC.destroy();

  const gq = scene.make.graphics({ x: 0, y: 0 }, false);
  gq.fillStyle(0xf8b800, 1); gq.fillRect(0, 0, 32, 32);
  gq.fillStyle(0xfc6400, 1); gq.fillRect(0, 0, 32, 3); gq.fillRect(0, 0, 3, 32);
  gq.fillStyle(0x7c4c00, 1); gq.fillRect(29, 0, 3, 32); gq.fillRect(0, 29, 32, 3);
  gq.fillStyle(0xffffff, 1); gq.fillRect(13, 5, 6, 3); gq.fillRect(19, 8, 3, 4); gq.fillRect(16, 12, 3, 3); gq.fillRect(16, 19, 3, 3); gq.fillRect(16, 23, 3, 3);
  gq.generateTexture('qblock', 32, 32); gq.clear();
  gq.fillStyle(0x7c5800, 1); gq.fillRect(0, 0, 32, 32);
  gq.fillStyle(0x9b7000, 1); gq.fillRect(2, 2, 28, 28);
  gq.generateTexture('qblock_empty', 32, 32); gq.destroy();

  const gB = scene.make.graphics({ x: 0, y: 0 }, false);
  gB.fillStyle(0xc84c0c, 1); gB.fillRect(0, 0, 32, 32);
  gB.fillStyle(0xfc9838, 1); gB.fillRect(1, 1, 14, 6); gB.fillRect(17, 1, 14, 6); gB.fillRect(1, 17, 6, 6); gB.fillRect(9, 17, 14, 6); gB.fillRect(25, 17, 6, 6);
  gB.fillStyle(0x7c3800, 1); gB.fillRect(0, 8, 32, 2); gB.fillRect(0, 24, 32, 2); gB.fillRect(15, 0, 2, 8); gB.fillRect(7, 16, 2, 8); gB.fillRect(23, 16, 2, 8);
  gB.generateTexture('block', 32, 32); gB.destroy();

  const gFlag = scene.make.graphics({ x: 0, y: 0 }, false);
  gFlag.fillStyle(0xffffff, 1); gFlag.fillRect(0, 0, 4, 160);
  gFlag.fillStyle(0x00cc00, 1); gFlag.fillRect(4, 0, 28, 20);
  gFlag.generateTexture('flag', 32, 160); gFlag.destroy();

  const gPB = scene.make.graphics({ x: 0, y: 0 }, false);
  gPB.fillStyle(0x196419, 1); gPB.fillRect(0, 0, 32, 32);
  gPB.fillStyle(0x22a022, 1); gPB.fillRect(5, 0, 10, 32);
  gPB.fillStyle(0x0d3d0d, 1); gPB.fillRect(0, 0, 3, 32); gPB.fillRect(29, 0, 3, 32);
  gPB.generateTexture('pipe_body', 32, 32); gPB.destroy();

  const gPC = scene.make.graphics({ x: 0, y: 0 }, false);
  gPC.fillStyle(0x196419, 1); gPC.fillRect(0, 0, 40, 18);
  gPC.fillStyle(0x22a022, 1); gPC.fillRect(6, 2, 12, 14);
  gPC.fillStyle(0x0d3d0d, 1); gPC.fillRect(0, 0, 3, 18); gPC.fillRect(37, 0, 3, 18);
  gPC.lineStyle(2, 0x0d3d0d, 1); gPC.strokeRect(0, 0, 40, 18);
  gPC.generateTexture('pipe_cap', 40, 18); gPC.destroy();

  const gHill = scene.make.graphics({ x: 0, y: 0 }, false);
  gHill.fillStyle(0x3c8c3c, 1); gHill.fillEllipse(56, 44, 96, 64);
  gHill.fillStyle(0x52a852, 1); gHill.fillEllipse(44, 36, 56, 32);
  gHill.generateTexture('hill', 112, 64); gHill.destroy();

  const gCW = scene.make.graphics({ x: 0, y: 0 }, false);
  gCW.fillStyle(0x9b5e30, 1); gCW.fillRect(0, 0, 32, 32);
  gCW.fillStyle(0x7a4520, 1); gCW.fillRect(0, 0, 14, 14); gCW.fillRect(18, 16, 14, 14);
  gCW.fillStyle(0x5a3010, 1); gCW.fillRect(0, 14, 32, 3); gCW.fillRect(14, 0, 4, 14); gCW.fillRect(0, 29, 32, 3); gCW.fillRect(14, 16, 4, 14);
  gCW.generateTexture('castle_wall', 32, 32); gCW.destroy();

  // Purple night theme textures for level 3
  const gPBlock = scene.make.graphics({ x: 0, y: 0 }, false);
  gPBlock.fillStyle(0x2a1a6e, 1); gPBlock.fillRect(0, 0, 32, 32);
  gPBlock.fillStyle(0x3d2a8f, 1); gPBlock.fillRect(1, 1, 14, 6); gPBlock.fillRect(17, 1, 14, 6); gPBlock.fillRect(1, 17, 6, 6); gPBlock.fillRect(9, 17, 14, 6); gPBlock.fillRect(25, 17, 6, 6);
  gPBlock.fillStyle(0x1a0e4e, 1); gPBlock.fillRect(0, 8, 32, 2); gPBlock.fillRect(0, 24, 32, 2); gPBlock.fillRect(15, 0, 2, 8); gPBlock.fillRect(7, 16, 2, 8); gPBlock.fillRect(23, 16, 2, 8);
  gPBlock.generateTexture('purple_block', 32, 32); gPBlock.destroy();

  const gPPipeB = scene.make.graphics({ x: 0, y: 0 }, false);
  gPPipeB.fillStyle(0x5c2d91, 1); gPPipeB.fillRect(0, 0, 32, 32);
  gPPipeB.fillStyle(0x7b3fbd, 1); gPPipeB.fillRect(5, 0, 10, 32);
  gPPipeB.fillStyle(0x3d1a6e, 1); gPPipeB.fillRect(0, 0, 3, 32); gPPipeB.fillRect(29, 0, 3, 32);
  gPPipeB.generateTexture('purple_pipe_body', 32, 32); gPPipeB.destroy();

  const gPPipeC = scene.make.graphics({ x: 0, y: 0 }, false);
  gPPipeC.fillStyle(0x5c2d91, 1); gPPipeC.fillRect(0, 0, 40, 18);
  gPPipeC.fillStyle(0x7b3fbd, 1); gPPipeC.fillRect(6, 2, 12, 14);
  gPPipeC.fillStyle(0x3d1a6e, 1); gPPipeC.fillRect(0, 0, 3, 18); gPPipeC.fillRect(37, 0, 3, 18);
  gPPipeC.lineStyle(2, 0x3d1a6e, 1); gPPipeC.strokeRect(0, 0, 40, 18);
  gPPipeC.generateTexture('purple_pipe_cap', 40, 18); gPPipeC.destroy();

  const gPBush = scene.make.graphics({ x: 0, y: 0 }, false);
  gPBush.fillStyle(0x2d1b4e, 1); gPBush.fillEllipse(60, 50, 120, 50); gPBush.fillEllipse(35, 45, 60, 40); gPBush.fillEllipse(90, 45, 70, 44);
  gPBush.fillStyle(0x3d2566, 1); gPBush.fillEllipse(50, 40, 50, 30); gPBush.fillEllipse(80, 42, 40, 26);
  gPBush.generateTexture('purple_bush', 120, 64); gPBush.destroy();

  const gStar = scene.make.graphics({ x: 0, y: 0 }, false);
  gStar.fillStyle(0xffee00, 1);
  gStar.fillRect(4, 0, 2, 2); gStar.fillRect(0, 4, 10, 2); gStar.fillRect(2, 2, 6, 6); gStar.fillRect(4, 6, 2, 4);
  gStar.generateTexture('star', 10, 10); gStar.destroy();

  const gSmBlock = scene.make.graphics({ x: 0, y: 0 }, false);
  gSmBlock.fillStyle(0x1a1a5e, 1); gSmBlock.fillRect(0, 0, 32, 32);
  gSmBlock.fillStyle(0x2a2a7e, 1); gSmBlock.fillRect(2, 2, 12, 12); gSmBlock.fillRect(18, 2, 12, 12); gSmBlock.fillRect(2, 18, 12, 12); gSmBlock.fillRect(18, 18, 12, 12);
  gSmBlock.fillStyle(0x0e0e3e, 1); gSmBlock.fillRect(0, 15, 32, 2); gSmBlock.fillRect(15, 0, 2, 32);
  gSmBlock.generateTexture('steel_block', 32, 32); gSmBlock.destroy();

  // Bullet Bill cannon texture
  const gCannon = scene.make.graphics({ x: 0, y: 0 }, false);
  gCannon.fillStyle(0x111111, 1); gCannon.fillRect(0, 0, 32, 32);
  gCannon.fillStyle(0x333333, 1); gCannon.fillRect(2, 0, 28, 8);
  gCannon.fillStyle(0x222222, 1); gCannon.fillRect(4, 8, 24, 20);
  gCannon.fillStyle(0x444444, 1); gCannon.fillRect(6, 10, 20, 4);
  gCannon.fillStyle(0x111111, 1); gCannon.fillRect(0, 28, 32, 4);
  gCannon.generateTexture('cannon', 32, 32); gCannon.destroy();

  // Bullet Bill projectile texture
  const gBullet = scene.make.graphics({ x: 0, y: 0 }, false);
  gBullet.fillStyle(0x111111, 1); gBullet.fillEllipse(12, 10, 24, 18);
  gBullet.fillStyle(0x333333, 1); gBullet.fillRect(0, 4, 8, 12);
  gBullet.fillStyle(0xffffff, 1); gBullet.fillCircle(18, 8, 3);
  gBullet.fillStyle(0x000000, 1); gBullet.fillCircle(18, 8, 1.5);
  gBullet.generateTexture('bullet_bill', 24, 20); gBullet.destroy();

  // Hammer Brother texture
  const gHB = scene.make.graphics({ x: 0, y: 0 }, false);
  gHB.fillStyle(0x228b22, 1); gHB.fillEllipse(16, 22, 22, 20);
  gHB.fillStyle(0x32cd32, 1); gHB.fillEllipse(14, 18, 14, 12);
  gHB.fillStyle(0xfff44f, 1); gHB.fillEllipse(16, 8, 16, 14);
  gHB.fillStyle(0xffffff, 1); gHB.fillCircle(12, 6, 3); gHB.fillCircle(20, 6, 3);
  gHB.fillStyle(0x000000, 1); gHB.fillCircle(12, 6, 1.5); gHB.fillCircle(20, 6, 1.5);
  gHB.fillStyle(0xffffff, 1); gHB.fillRect(0, 0, 6, 3); gHB.fillRect(4, 0, 3, 8);
  gHB.fillStyle(0x8b4513, 1); gHB.fillRect(2, 8, 3, 10);
  gHB.generateTexture('hammer_bro', 32, 32); gHB.destroy();

  // Hammer projectile
  const gHammer = scene.make.graphics({ x: 0, y: 0 }, false);
  gHammer.fillStyle(0x8b4513, 1); gHammer.fillRect(6, 4, 4, 14);
  gHammer.fillStyle(0x666666, 1); gHammer.fillRect(2, 0, 12, 6);
  gHammer.generateTexture('hammer', 16, 18); gHammer.destroy();

  // Level 4 textures - Sky platform level
  const gMushPlat = scene.make.graphics({ x: 0, y: 0 }, false);
  gMushPlat.fillStyle(0x228b22, 1); gMushPlat.fillRect(10, 4, 108, 16);
  gMushPlat.fillStyle(0x228b22, 1); gMushPlat.fillEllipse(10, 12, 20, 16); gMushPlat.fillEllipse(118, 12, 20, 16);
  gMushPlat.fillStyle(0x32cd32, 1); gMushPlat.fillRect(10, 2, 108, 8);
  gMushPlat.fillStyle(0x145214, 1); gMushPlat.fillCircle(24, 12, 5); gMushPlat.fillCircle(48, 14, 6); gMushPlat.fillCircle(72, 12, 5); gMushPlat.fillCircle(96, 14, 6); gMushPlat.fillCircle(112, 12, 4);
  gMushPlat.fillStyle(0x3cb03c, 1); gMushPlat.fillRect(10, 0, 108, 3);
  gMushPlat.generateTexture('mush_platform', 128, 20); gMushPlat.destroy();

  // Green block for level 4 pillar tops
  const gGreenBlock = scene.make.graphics({ x: 0, y: 0 }, false);
  gGreenBlock.fillStyle(0x22a022, 1); gGreenBlock.fillRect(0, 0, 32, 32);
  gGreenBlock.fillStyle(0x32cd32, 1); gGreenBlock.fillRect(1, 1, 14, 14); gGreenBlock.fillRect(17, 17, 14, 14);
  gGreenBlock.fillStyle(0x145214, 1); gGreenBlock.fillRect(0, 15, 32, 2); gGreenBlock.fillRect(15, 0, 2, 32);
  gGreenBlock.fillStyle(0x3cb03c, 1); gGreenBlock.fillRect(0, 0, 32, 4);
  gGreenBlock.generateTexture('green_block', 32, 32); gGreenBlock.destroy();

  const gMushStem = scene.make.graphics({ x: 0, y: 0 }, false);
  gMushStem.fillStyle(0x196419, 1); gMushStem.fillRect(0, 0, 20, 64);
  gMushStem.fillStyle(0x22a022, 1); gMushStem.fillRect(4, 0, 8, 64);
  gMushStem.fillStyle(0x0d3d0d, 1); gMushStem.fillRect(0, 0, 2, 64); gMushStem.fillRect(18, 0, 2, 64);
  gMushStem.generateTexture('mush_stem', 20, 64); gMushStem.destroy();

  const gStoneWall = scene.make.graphics({ x: 0, y: 0 }, false);
  gStoneWall.fillStyle(0x8b7355, 1); gStoneWall.fillRect(0, 0, 32, 32);
  gStoneWall.fillStyle(0xa08c60, 1); gStoneWall.fillRect(1, 1, 14, 10); gStoneWall.fillRect(17, 1, 14, 10); gStoneWall.fillRect(1, 13, 8, 8); gStoneWall.fillRect(11, 13, 10, 8); gStoneWall.fillRect(23, 13, 8, 8); gStoneWall.fillRect(1, 23, 14, 8); gStoneWall.fillRect(17, 23, 14, 8);
  gStoneWall.fillStyle(0x6b5535, 1); gStoneWall.fillRect(0, 11, 32, 2); gStoneWall.fillRect(0, 21, 32, 2); gStoneWall.fillRect(15, 0, 2, 11); gStoneWall.fillRect(9, 11, 2, 10); gStoneWall.fillRect(21, 11, 2, 10); gStoneWall.fillRect(15, 21, 2, 11);
  gStoneWall.generateTexture('stone_wall', 32, 32); gStoneWall.destroy();

  // Level 5 textures - Lava/Boss level
  const gLavaBlock = scene.make.graphics({ x: 0, y: 0 }, false);
  gLavaBlock.fillStyle(0x4a1a0a, 1); gLavaBlock.fillRect(0, 0, 32, 32);
  gLavaBlock.fillStyle(0x6b2a10, 1); gLavaBlock.fillRect(1, 1, 14, 14); gLavaBlock.fillRect(17, 17, 14, 14);
  gLavaBlock.fillStyle(0x3a0a00, 1); gLavaBlock.fillRect(0, 15, 32, 2); gLavaBlock.fillRect(15, 0, 2, 32);
  gLavaBlock.generateTexture('lava_block', 32, 32); gLavaBlock.destroy();

  const gLava = scene.make.graphics({ x: 0, y: 0 }, false);
  gLava.fillStyle(0xff4400, 1); gLava.fillRect(0, 0, 64, 32);
  gLava.fillStyle(0xff6600, 1); gLava.fillRect(0, 0, 64, 8);
  gLava.fillStyle(0xffaa00, 1); gLava.fillRect(5, 0, 12, 4); gLava.fillRect(30, 0, 16, 5); gLava.fillRect(52, 0, 10, 3);
  gLava.fillStyle(0xcc2200, 1); gLava.fillRect(0, 20, 64, 12);
  gLava.generateTexture('lava', 64, 32); gLava.destroy();

  const gBowser = scene.make.graphics({ x: 0, y: 0 }, false);
  gBowser.fillStyle(0x228b22, 1); gBowser.fillRect(8, 52, 12, 12); gBowser.fillRect(40, 52, 12, 12);
  gBowser.fillStyle(0xd2691e, 1); gBowser.fillRect(4, 60, 8, 6); gBowser.fillRect(16, 60, 6, 6); gBowser.fillRect(38, 60, 6, 6); gBowser.fillRect(48, 60, 8, 6);
  gBowser.fillStyle(0x228b22, 1); gBowser.fillEllipse(32, 42, 44, 30);
  gBowser.fillStyle(0x145214, 1); gBowser.fillEllipse(36, 38, 36, 26);
  gBowser.fillStyle(0xffffff, 1);
  gBowser.fillTriangle(24, 26, 28, 18, 32, 26);
  gBowser.fillTriangle(32, 24, 36, 16, 40, 24);
  gBowser.fillTriangle(40, 26, 44, 18, 48, 26);
  gBowser.fillStyle(0xd2a060, 1); gBowser.fillEllipse(24, 46, 20, 18);
  gBowser.fillStyle(0xb8863c, 1); gBowser.fillRect(16, 42, 16, 2); gBowser.fillRect(16, 46, 16, 2); gBowser.fillRect(16, 50, 16, 2);
  gBowser.fillStyle(0x228b22, 1); gBowser.fillRect(4, 38, 10, 8); gBowser.fillRect(46, 36, 10, 8);
  gBowser.fillStyle(0xd2691e, 1); gBowser.fillRect(2, 42, 6, 4); gBowser.fillRect(52, 40, 6, 4);
  gBowser.fillStyle(0x228b22, 1); gBowser.fillEllipse(20, 24, 24, 22);
  gBowser.fillStyle(0x32cd32, 1); gBowser.fillEllipse(14, 26, 14, 12);
  gBowser.fillStyle(0xffffff, 1); gBowser.fillCircle(16, 20, 4); gBowser.fillCircle(26, 18, 4);
  gBowser.fillStyle(0x000000, 1); gBowser.fillCircle(15, 20, 2); gBowser.fillCircle(25, 18, 2);
  gBowser.fillStyle(0xff4500, 1); gBowser.fillRect(12, 16, 8, 2); gBowser.fillRect(22, 14, 8, 2);
  gBowser.fillStyle(0x000000, 1); gBowser.fillRect(8, 28, 12, 3);
  gBowser.fillStyle(0xffffff, 1); gBowser.fillRect(9, 28, 2, 3); gBowser.fillRect(13, 28, 2, 3); gBowser.fillRect(17, 28, 2, 3);
  gBowser.fillStyle(0xd2691e, 1);
  gBowser.fillTriangle(12, 14, 8, 4, 16, 12);
  gBowser.fillTriangle(26, 12, 28, 2, 32, 10);
  gBowser.fillStyle(0xff4500, 1); gBowser.fillRect(6, 10, 4, 6); gBowser.fillRect(10, 8, 4, 6); gBowser.fillRect(14, 6, 4, 8);
  gBowser.generateTexture('bowser', 64, 66); gBowser.destroy();

  const gFireBreath = scene.make.graphics({ x: 0, y: 0 }, false);
  gFireBreath.fillStyle(0xff4400, 1); gFireBreath.fillEllipse(16, 10, 32, 16);
  gFireBreath.fillStyle(0xff8800, 1); gFireBreath.fillEllipse(12, 10, 20, 10);
  gFireBreath.fillStyle(0xffcc00, 1); gFireBreath.fillEllipse(8, 10, 10, 6);
  gFireBreath.generateTexture('fire_breath', 32, 20); gFireBreath.destroy();

  // Fire bar ball (single fireball in the chain)
  const gFBall = scene.make.graphics({ x: 0, y: 0 }, false);
  gFBall.fillStyle(0xff6600, 1); gFBall.fillCircle(8, 8, 8);
  gFBall.fillStyle(0xff9900, 1); gFBall.fillCircle(7, 6, 5);
  gFBall.fillStyle(0xffcc00, 1); gFBall.fillCircle(6, 5, 3);
  gFBall.generateTexture('firebar_ball', 16, 16); gFBall.destroy();

  // Fire bar center block
  const gFCenter = scene.make.graphics({ x: 0, y: 0 }, false);
  gFCenter.fillStyle(0xcc6600, 1); gFCenter.fillRect(0, 0, 20, 20);
  gFCenter.fillStyle(0xff8800, 1); gFCenter.fillRect(2, 2, 16, 16);
  gFCenter.fillStyle(0xffaa00, 1); gFCenter.fillCircle(10, 10, 5);
  gFCenter.generateTexture('firebar_center', 20, 20); gFCenter.destroy();

  const gM = scene.make.graphics({ x: 0, y: 0 }, false);
  gM.fillStyle(0xffdab9, 1); gM.fillRect(6, 16, 12, 10); gM.fillStyle(0xeec090, 1); gM.fillRect(6, 22, 12, 4);
  gM.fillStyle(0xcc0000, 1); gM.fillEllipse(12, 12, 24, 18); gM.fillRect(4, 12, 16, 8);
  gM.fillStyle(0xffffff, 1); gM.fillCircle(7, 10, 3); gM.fillCircle(17, 8, 3); gM.fillCircle(13, 14, 2);
  gM.fillStyle(0xffdab9, 1); gM.fillRect(6, 17, 4, 4); gM.fillRect(14, 17, 4, 4);
  gM.fillStyle(0x000000, 1); gM.fillRect(7, 18, 2, 2); gM.fillRect(15, 18, 2, 2);
  gM.generateTexture('mushroom', 24, 26); gM.destroy();

  // Green 1-up mushroom
  const gM1 = scene.make.graphics({ x: 0, y: 0 }, false);
  gM1.fillStyle(0xffdab9, 1); gM1.fillRect(6, 16, 12, 10); gM1.fillStyle(0xeec090, 1); gM1.fillRect(6, 22, 12, 4);
  gM1.fillStyle(0x00aa00, 1); gM1.fillEllipse(12, 12, 24, 18); gM1.fillRect(4, 12, 16, 8);
  gM1.fillStyle(0xffffff, 1); gM1.fillCircle(7, 10, 3); gM1.fillCircle(17, 8, 3); gM1.fillCircle(13, 14, 2);
  gM1.fillStyle(0xffdab9, 1); gM1.fillRect(6, 17, 4, 4); gM1.fillRect(14, 17, 4, 4);
  gM1.fillStyle(0x000000, 1); gM1.fillRect(7, 18, 2, 2); gM1.fillRect(15, 18, 2, 2);
  gM1.generateTexture('mushroom_1up', 24, 26); gM1.destroy();

  // Collectible coin texture
  const gCoin = scene.make.graphics({ x: 0, y: 0 }, false);
  gCoin.fillStyle(0xff8c00, 1); gCoin.fillEllipse(10, 12, 16, 20);
  gCoin.fillStyle(0xffcc00, 1); gCoin.fillEllipse(10, 12, 10, 16);
  gCoin.fillStyle(0xffffff, 0.4); gCoin.fillEllipse(8, 9, 4, 8);
  gCoin.generateTexture('coin', 20, 24); gCoin.destroy();

  const gPP = scene.make.graphics({ x: 0, y: 0 }, false);
  gPP.fillStyle(0x228b22, 1); gPP.fillRect(9, 16, 6, 16);
  gPP.fillStyle(0xcc0000, 1); gPP.fillEllipse(12, 12, 24, 22);
  gPP.fillStyle(0xffffff, 1); gPP.fillRect(2, 12, 20, 5);
  gPP.fillStyle(0xcc0000, 1); gPP.fillRect(5, 12, 3, 4); gPP.fillRect(11, 12, 3, 4); gPP.fillRect(17, 12, 3, 4);
  gPP.fillStyle(0xffffff, 1); gPP.fillCircle(7, 7, 4); gPP.fillCircle(17, 7, 4);
  gPP.fillStyle(0x000000, 1); gPP.fillCircle(8, 7, 2); gPP.fillCircle(18, 7, 2);
  gPP.fillStyle(0xff6666, 1); gPP.fillCircle(5, 4, 2); gPP.fillCircle(19, 4, 2);
  gPP.generateTexture('piranha', 24, 32); gPP.destroy();

  const gK = scene.make.graphics({ x: 0, y: 0 }, false);
  gK.fillStyle(0x228b22, 1); gK.fillEllipse(16, 18, 26, 22);
  gK.fillStyle(0x32cd32, 1); gK.fillEllipse(14, 15, 16, 12);
  gK.lineStyle(1, 0x145214, 1); gK.strokeEllipse(16, 18, 26, 22); gK.lineBetween(16, 7, 16, 29); gK.lineBetween(5, 12, 27, 24);
  gK.fillStyle(0xfff44f, 1); gK.fillEllipse(16, 5, 14, 12);
  gK.fillStyle(0xffffff, 1); gK.fillCircle(13, 4, 2); gK.fillCircle(19, 4, 2);
  gK.fillStyle(0x000000, 1); gK.fillCircle(13, 4, 1); gK.fillCircle(19, 4, 1);
  gK.fillStyle(0xfff44f, 1); gK.fillEllipse(9, 29, 10, 6); gK.fillEllipse(23, 29, 10, 6);
  gK.generateTexture('koopa', 32, 32); gK.destroy();

  // Power Mushroom (red cap, white spots, tan stem)
  const gPwrMush = scene.make.graphics({ x: 0, y: 0 }, false);
  gPwrMush.fillStyle(0xeec090, 1); gPwrMush.fillRect(10, 20, 12, 12);
  gPwrMush.fillStyle(0xcc0000, 1); gPwrMush.fillEllipse(16, 14, 28, 22);
  gPwrMush.fillStyle(0xffffff, 1); gPwrMush.fillCircle(10, 12, 4); gPwrMush.fillCircle(22, 10, 4); gPwrMush.fillCircle(16, 7, 3);
  gPwrMush.generateTexture('power_mushroom', 32, 32); gPwrMush.destroy();

  // Poison Mushroom (purple cap, dark spots, gray stem)
  const gPsnMush = scene.make.graphics({ x: 0, y: 0 }, false);
  gPsnMush.fillStyle(0x888888, 1); gPsnMush.fillRect(10, 20, 12, 12);
  gPsnMush.fillStyle(0x6600aa, 1); gPsnMush.fillEllipse(16, 14, 28, 22);
  gPsnMush.fillStyle(0x330066, 1); gPsnMush.fillCircle(10, 12, 4); gPsnMush.fillCircle(22, 10, 4); gPsnMush.fillCircle(16, 7, 3);
  gPsnMush.generateTexture('poison_mushroom', 32, 32); gPsnMush.destroy();

  // Invincibility Star (yellow 5-pointed star)
  const gInvStar = scene.make.graphics({ x: 0, y: 0 }, false);
  gInvStar.fillStyle(0xffdd00, 1);
  gInvStar.fillTriangle(16, 2, 12, 13, 20, 13);
  gInvStar.fillTriangle(4, 12, 16, 12, 10, 20);
  gInvStar.fillTriangle(28, 12, 16, 12, 22, 20);
  gInvStar.fillTriangle(8, 26, 12, 16, 16, 26);
  gInvStar.fillTriangle(24, 26, 20, 16, 16, 26);
  gInvStar.fillStyle(0xffee88, 1); gInvStar.fillCircle(16, 16, 5);
  gInvStar.fillStyle(0x000000, 1); gInvStar.fillCircle(13, 14, 1.5); gInvStar.fillCircle(19, 14, 1.5);
  gInvStar.generateTexture('invincibility_star', 32, 32); gInvStar.destroy();

  // Fire Flower (orange/red flower on green stem)
  const gFireFlower = scene.make.graphics({ x: 0, y: 0 }, false);
  gFireFlower.fillStyle(0x228b22, 1); gFireFlower.fillRect(14, 18, 4, 14);
  gFireFlower.fillStyle(0x32cd32, 1); gFireFlower.fillRect(8, 22, 6, 4); gFireFlower.fillRect(18, 24, 6, 4);
  gFireFlower.fillStyle(0xff4400, 1);
  gFireFlower.fillCircle(16, 10, 5); gFireFlower.fillCircle(10, 12, 4); gFireFlower.fillCircle(22, 12, 4); gFireFlower.fillCircle(12, 6, 4); gFireFlower.fillCircle(20, 6, 4);
  gFireFlower.fillStyle(0xffcc00, 1); gFireFlower.fillCircle(16, 10, 3);
  gFireFlower.generateTexture('fire_flower', 32, 32); gFireFlower.destroy();

  // Koopa Shell (green shell)
  const gShell = scene.make.graphics({ x: 0, y: 0 }, false);
  gShell.fillStyle(0x228b22, 1); gShell.fillEllipse(16, 18, 26, 22);
  gShell.fillStyle(0x32cd32, 1); gShell.fillEllipse(14, 15, 16, 12);
  gShell.lineStyle(1, 0x145214, 1); gShell.strokeEllipse(16, 18, 26, 22);
  gShell.lineBetween(16, 7, 16, 29); gShell.lineBetween(5, 12, 27, 24);
  gShell.generateTexture('koopa_shell', 32, 32); gShell.destroy();

  // Ice Block (light blue with frost pattern)
  const gIce = scene.make.graphics({ x: 0, y: 0 }, false);
  gIce.fillStyle(0x88ccff, 1); gIce.fillRect(0, 0, 32, 32);
  gIce.fillStyle(0xaaddff, 1); gIce.fillRect(2, 2, 12, 12); gIce.fillRect(18, 18, 12, 12);
  gIce.fillStyle(0xcceeFF, 1); gIce.fillRect(4, 4, 6, 6); gIce.fillRect(20, 20, 6, 6);
  gIce.lineStyle(1, 0xffffff, 0.6); gIce.lineBetween(6, 14, 12, 20); gIce.lineBetween(20, 6, 26, 12);
  gIce.lineStyle(2, 0x66aadd, 1); gIce.strokeRect(0, 0, 32, 32);
  gIce.generateTexture('ice_block', 32, 32); gIce.destroy();

  // Bounce Block (orange/yellow with spring mark)
  const gBounce = scene.make.graphics({ x: 0, y: 0 }, false);
  gBounce.fillStyle(0xff8800, 1); gBounce.fillRect(0, 0, 32, 32);
  gBounce.fillStyle(0xffcc00, 1); gBounce.fillRect(2, 2, 28, 28);
  gBounce.fillStyle(0xff6600, 1); gBounce.fillRect(0, 0, 32, 3); gBounce.fillRect(0, 29, 32, 3);
  gBounce.lineStyle(2, 0xff4400, 1);
  gBounce.lineBetween(8, 24, 12, 16); gBounce.lineBetween(12, 16, 16, 24); gBounce.lineBetween(16, 24, 20, 16); gBounce.lineBetween(20, 16, 24, 24);
  gBounce.fillStyle(0xff4400, 1); gBounce.fillTriangle(14, 6, 16, 2, 18, 6);
  gBounce.generateTexture('bounce_block', 32, 32); gBounce.destroy();

  // Breakable Block (brown with crack pattern)
  const gBreak = scene.make.graphics({ x: 0, y: 0 }, false);
  gBreak.fillStyle(0xc84c0c, 1); gBreak.fillRect(0, 0, 32, 32);
  gBreak.fillStyle(0xfc9838, 1); gBreak.fillRect(1, 1, 14, 6); gBreak.fillRect(17, 1, 14, 6); gBreak.fillRect(1, 17, 6, 6); gBreak.fillRect(9, 17, 14, 6); gBreak.fillRect(25, 17, 6, 6);
  gBreak.fillStyle(0x7c3800, 1); gBreak.fillRect(0, 8, 32, 2); gBreak.fillRect(0, 24, 32, 2); gBreak.fillRect(15, 0, 2, 8); gBreak.fillRect(7, 16, 2, 8); gBreak.fillRect(23, 16, 2, 8);
  gBreak.lineStyle(1, 0x3a1a00, 1);
  gBreak.lineBetween(10, 10, 16, 16); gBreak.lineBetween(16, 10, 22, 14); gBreak.lineBetween(14, 14, 18, 18);
  gBreak.generateTexture('breakable_block', 32, 32); gBreak.destroy();

  // Lakitu (cloud enemy)
  const gLakitu = scene.make.graphics({ x: 0, y: 0 }, false);
  gLakitu.fillStyle(0xffffff, 0.9); gLakitu.fillEllipse(16, 24, 28, 16); gLakitu.fillEllipse(12, 22, 18, 12);
  gLakitu.fillStyle(0xfff44f, 1); gLakitu.fillEllipse(16, 14, 14, 16);
  gLakitu.fillStyle(0xffffff, 1); gLakitu.fillCircle(13, 12, 3); gLakitu.fillCircle(19, 12, 3);
  gLakitu.fillStyle(0x000000, 1); gLakitu.fillCircle(13, 12, 1.5); gLakitu.fillCircle(19, 12, 1.5);
  gLakitu.fillStyle(0x228b22, 1); gLakitu.fillEllipse(16, 6, 12, 6);
  gLakitu.generateTexture('lakitu', 32, 32); gLakitu.destroy();

  // Chain Chomp (black ball with chain)
  const gChomp = scene.make.graphics({ x: 0, y: 0 }, false);
  gChomp.fillStyle(0x111111, 1); gChomp.fillCircle(16, 14, 12);
  gChomp.fillStyle(0xffffff, 1); gChomp.fillCircle(19, 10, 4); gChomp.fillCircle(12, 10, 3);
  gChomp.fillStyle(0x000000, 1); gChomp.fillCircle(19, 10, 2); gChomp.fillCircle(12, 10, 1.5);
  gChomp.fillStyle(0xffffff, 1); gChomp.fillRect(10, 18, 12, 4);
  gChomp.fillStyle(0x111111, 1); gChomp.fillRect(12, 18, 2, 4); gChomp.fillRect(16, 18, 2, 4); gChomp.fillRect(20, 18, 2, 4);
  gChomp.fillStyle(0x444444, 1); gChomp.fillCircle(16, 28, 3); gChomp.fillCircle(16, 31, 2);
  gChomp.generateTexture('chain_chomp', 32, 32); gChomp.destroy();

  drawPlayer(scene, 'p1_run1', 0xd50000, 'run1'); drawPlayer(scene, 'p1_run2', 0xd50000, 'run2'); drawPlayer(scene, 'p1_jump', 0xd50000, 'jump'); drawPlayer(scene, 'p1_crouch', 0xd50000, 'crouch');
  drawPrincess(scene, 'p2_run1', 'run1'); drawPrincess(scene, 'p2_run2', 'run2'); drawPrincess(scene, 'p2_jump', 'jump'); drawPrincess(scene, 'p2_crouch', 'crouch');

  // Death frames (X pose - arms up, legs spread)
  const drawDeath = (key: string, shirtCol: number) => {
    const skin = 0xffdab9; const overalls = 0x1e90ff; const hat = shirtCol; const shoes = 0x8b4513;
    const g = scene.make.graphics({ x: 0, y: 0 }, false); const p = 2;
    g.fillStyle(hat); g.fillRect(4 * p, 0, 5 * p, 2 * p); g.fillRect(3 * p, 2 * p, 7 * p, 1 * p);
    g.fillStyle(skin); g.fillRect(4 * p, 3 * p, 5 * p, 4 * p);
    g.fillStyle(0x000000); g.fillRect(5 * p, 4 * p, 1 * p, 1 * p); g.fillRect(7 * p, 4 * p, 1 * p, 1 * p);
    g.fillStyle(0x000000); g.fillRect(5 * p, 6 * p, 3 * p, 1 * p);
    g.fillStyle(shirtCol); g.fillRect(4 * p, 7 * p, 5 * p, 3 * p);
    g.fillStyle(overalls); g.fillRect(4 * p, 10 * p, 5 * p, 3 * p);
    g.fillStyle(shirtCol); g.fillRect(1 * p, 3 * p, 3 * p, 2 * p); g.fillRect(9 * p, 3 * p, 3 * p, 2 * p);
    g.fillStyle(skin); g.fillRect(0, 2 * p, 2 * p, 2 * p); g.fillRect(11 * p, 2 * p, 2 * p, 2 * p);
    g.fillStyle(overalls); g.fillRect(2 * p, 13 * p, 2 * p, 3 * p); g.fillRect(9 * p, 13 * p, 2 * p, 3 * p);
    g.fillStyle(shoes); g.fillRect(1 * p, 16 * p, 2 * p, 1 * p); g.fillRect(10 * p, 16 * p, 2 * p, 1 * p);
    g.generateTexture(key, 13 * p, 17 * p); g.destroy();
  };
  drawDeath('p1_death', 0xd50000);

  // Princess death
  const drawPDeath = () => {
    const skin = 0xffdab9; const dress = 0xffb6c1; const crown = 0xffd700; const shoes = 0xe52458;
    const g = scene.make.graphics({ x: 0, y: 0 }, false); const p = 2;
    g.fillStyle(crown); g.fillRect(5 * p, 0, 3 * p, 1 * p); g.fillRect(4 * p, 1 * p, 5 * p, 1 * p);
    g.fillStyle(skin); g.fillRect(4 * p, 2 * p, 5 * p, 4 * p);
    g.fillStyle(0x000000); g.fillRect(5 * p, 3 * p, 1 * p, 1 * p); g.fillRect(7 * p, 3 * p, 1 * p, 1 * p);
    g.fillStyle(0x000000); g.fillRect(5 * p, 5 * p, 3 * p, 1 * p);
    g.fillStyle(dress); g.fillRect(4 * p, 6 * p, 5 * p, 4 * p);
    g.fillStyle(dress); g.fillRect(4 * p, 10 * p, 5 * p, 3 * p);
    g.fillStyle(dress); g.fillRect(1 * p, 3 * p, 3 * p, 2 * p); g.fillRect(9 * p, 3 * p, 3 * p, 2 * p);
    g.fillStyle(skin); g.fillRect(0, 2 * p, 2 * p, 2 * p); g.fillRect(11 * p, 2 * p, 2 * p, 2 * p);
    g.fillStyle(dress); g.fillRect(2 * p, 13 * p, 2 * p, 2 * p); g.fillRect(9 * p, 13 * p, 2 * p, 2 * p);
    g.fillStyle(shoes); g.fillRect(1 * p, 15 * p, 2 * p, 1 * p); g.fillRect(10 * p, 15 * p, 2 * p, 1 * p);
    g.generateTexture('p2_death', 13 * p, 17 * p); g.destroy();
  };
  drawPDeath();

  scene.anims.create({ key: 'p1_run', frames: [{ key: 'p1_run1' }, { key: 'p1_run2' }], frameRate: 10, repeat: -1 });
  scene.anims.create({ key: 'p2_run', frames: [{ key: 'p2_run1' }, { key: 'p2_run2' }], frameRate: 10, repeat: -1 });
}
