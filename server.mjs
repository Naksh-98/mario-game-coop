import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server } from 'socket.io';

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

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
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

    socket.on('updateState', ({ role, x, y, anim, flipX, scale }) => {
      if (role === 'p1' || role === 'p2') {
        state[role] = { ...state[role], x, y, anim, flipX, scale };
        // Broadcast to game room
        socket.broadcast.to('game').emit('stateUpdate', state);
      }
    });

    socket.on('flagTouched', (role) => {
      if (finishedPlayers.has(role)) return; // ignore duplicates
      finishedPlayers.add(role);
      io.to('game').emit('playerFinished', role); // tell everyone who crossed

      if (finishedPlayers.has('p1') && finishedPlayers.has('p2')) {
        // Both players finished — start the countdown
        currentLevel++;
        finishedPlayers.clear();
        // Reset player positions for the next level
        state.p1 = { ...state.p1, x: 150, y: 360 };
        state.p2 = { ...state.p2, x: 80, y: 360 };
        io.to('game').emit('startCountdown', currentLevel);
      }
    });

    socket.on('gameOver', () => {
      // One player died — broadcast game over to everyone
      io.to('game').emit('gameOver');
      // Reset server state for next game
      currentLevel = 1;
      finishedPlayers.clear();
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
