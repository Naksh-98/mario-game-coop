import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server } from 'socket.io';
import { writeFileSync, readFileSync, mkdirSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = process.env.PORT || 3000;

// when using middleware `hostname` and `port` must be provided below
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

let state = {
  p1: { x: 150, y: 360, anim: 'run1', flipX: false, connected: false },
  p2: { x: 80, y: 360, anim: 'run1', flipX: false, connected: false },
};
let currentLevel = 1;
let finishedPlayers = new Set(); // tracks who touched the flag this level
let levelTransitionTime = 0; // timestamp of last level transition
let checkpointTouchedBy = new Set(); // who touched the mid-level checkpoint
let checkpointActive = false; // both players reached the checkpoint
let checkpointChances = 3; // remaining respawns after checkpoint

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    try {
      const parsedUrl = parse(req.url, true);

      // --- Level Editor API (localhost only) ---
      const levelsDir = join(process.cwd(), 'public', 'levels');

      // POST /api/save-level — save level JSON to public/levels/
      if (req.method === 'POST' && parsedUrl.pathname === '/api/save-level') {
        if (!dev) {
          res.statusCode = 403;
          res.end(JSON.stringify({ error: 'Save only available in development mode' }));
          return;
        }
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          try {
            const levelData = JSON.parse(body);
            const fileName = (levelData.name || 'untitled').replace(/[^a-zA-Z0-9_-]/g, '_') + '.json';
            if (!existsSync(levelsDir)) mkdirSync(levelsDir, { recursive: true });
            writeFileSync(join(levelsDir, fileName), JSON.stringify(levelData, null, 2));
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, fileName }));
          } catch (err) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Invalid JSON' }));
          }
        });
        return;
      }

      // GET /api/list-levels — list all saved level files
      if (req.method === 'GET' && parsedUrl.pathname === '/api/list-levels') {
        try {
          if (!existsSync(levelsDir)) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ levels: [] }));
            return;
          }
          const files = readdirSync(levelsDir).filter(f => f.endsWith('.json'));
          const levels = files.map(f => {
            try {
              const data = JSON.parse(readFileSync(join(levelsDir, f), 'utf-8'));
              return { fileName: f, name: data.name, createdAt: data.createdAt, slotNumber: data.slotNumber };
            } catch { return null; }
          }).filter(Boolean);
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ levels }));
        } catch (err) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: 'Failed to list levels' }));
        }
        return;
      }

      handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  const io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] }
  });

  io.on('connection', (socket) => {
    socket.on('join', (role) => {
      socket.join('game');
      socket.emit('init', { state, currentLevel });
      io.to('game').emit('stateUpdate', state);
    });

    socket.on('setServerLevel', (level) => {
      currentLevel = level;
      io.to('game').emit('loadLevel', currentLevel);
    });

    socket.on('loadCustomLevel', (levelId) => {
      io.to('game').emit('loadCustomLevel', levelId);
    });

    // Sync shared hearts pool between both players
    socket.on('syncHearts', (hearts) => {
      socket.broadcast.to('game').emit('syncHearts', hearts);
    });

    // Relay 1UP popup so both players see it
    socket.on('oneUp', () => {
      socket.broadcast.to('game').emit('oneUp');
    });

    // Relay fireball shots so both players see teammate's fireballs
    socket.on('shootFireball', (data) => {
      socket.broadcast.to('game').emit('shootFireball', data);
    });

    // Relay warp-pipe events so both players warp together
    socket.on('warp', (data) => {
      socket.broadcast.to('game').emit('warp', data);
    });

    // ─── WebRTC signaling for audio/video calls ───────────────────────
    socket.on('callRequest', (data) => {
      socket.broadcast.to('game').emit('callRequest', data);
    });
    socket.on('callAccepted', (data) => {
      socket.broadcast.to('game').emit('callAccepted', data);
    });
    socket.on('callRejected', () => {
      socket.broadcast.to('game').emit('callRejected');
    });
    socket.on('callEnded', () => {
      socket.broadcast.to('game').emit('callEnded');
    });
    socket.on('webrtcOffer', (data) => {
      socket.broadcast.to('game').emit('webrtcOffer', data);
    });
    socket.on('webrtcAnswer', (data) => {
      socket.broadcast.to('game').emit('webrtcAnswer', data);
    });
    socket.on('webrtcIce', (data) => {
      socket.broadcast.to('game').emit('webrtcIce', data);
    });

    socket.on('updateState', ({ role, x, y, anim, flipX, scale, fire }) => {
      if (role === 'p1' || role === 'p2') {
        state[role] = { ...state[role], x, y, anim, flipX, scale, fire };
        // Broadcast to game room
        socket.broadcast.to('game').emit('stateUpdate', state);
      }
    });

    socket.on('flagTouched', (role) => {
      // Ignore stale events that arrive shortly after a level transition
      if (Date.now() - levelTransitionTime < 2000) return;
      if (finishedPlayers.has(role)) return; // ignore duplicates
      finishedPlayers.add(role);
      io.to('game').emit('playerFinished', role); // tell everyone who crossed

      if (finishedPlayers.has('p1') && finishedPlayers.has('p2')) {
        // Both players finished — start the countdown
        currentLevel++;
        finishedPlayers.clear();
        levelTransitionTime = Date.now();
        // Reset checkpoint state for the new level
        checkpointTouchedBy.clear();
        checkpointActive = false;
        checkpointChances = 3;
        // Reset player positions for the next level
        state.p1 = { ...state.p1, x: 150, y: 360 };
        state.p2 = { ...state.p2, x: 80, y: 360 };
        io.to('game').emit('startCountdown', currentLevel);
      }
    });

    // Mid-level checkpoint: both players must touch it to activate
    socket.on('checkpointTouched', (role) => {
      if (checkpointActive) return;
      checkpointTouchedBy.add(role);
      io.to('game').emit('checkpointPlayerTouched', role);
      if (checkpointTouchedBy.has('p1') && checkpointTouchedBy.has('p2')) {
        checkpointActive = true;
        checkpointChances = 3;
        io.to('game').emit('checkpointActivated', { chances: checkpointChances });
      }
    });

    // Restart the whole game back to level 1 (no page reload) — synced to both players
    socket.on('restartGame', () => {
      currentLevel = 1;
      finishedPlayers.clear();
      levelTransitionTime = Date.now();
      checkpointTouchedBy.clear();
      checkpointActive = false;
      checkpointChances = 3;
      state.p1 = { x: 150, y: 360, anim: 'run1', flipX: false, connected: false };
      state.p2 = { x: 80, y: 360, anim: 'run1', flipX: false, connected: false };
      io.to('game').emit('restartGame');
    });

    socket.on('gameOver', () => {
      // If a checkpoint is active and chances remain, respawn instead of full game over
      if (checkpointActive && checkpointChances > 1) {
        checkpointChances--;
        finishedPlayers.clear();
        levelTransitionTime = Date.now();
        io.to('game').emit('checkpointRespawn', { chances: checkpointChances });
        return;
      }
      // One player died — broadcast game over to everyone
      io.to('game').emit('gameOver');
      // Reset server state for next game
      currentLevel = 1;
      finishedPlayers.clear();
      levelTransitionTime = 0;
      checkpointTouchedBy.clear();
      checkpointActive = false;
      checkpointChances = 3;
      state.p1 = { x: 150, y: 360, anim: 'run1', flipX: false, connected: false };
      state.p2 = { x: 80, y: 360, anim: 'run1', flipX: false, connected: false };
    });
  });

  httpServer.once('error', (err) => {
    console.error(err);
    process.exit(1);
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});
