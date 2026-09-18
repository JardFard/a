const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*' },
    transports: ['websocket', 'polling']
});

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.get('/healthz', (req, res) => res.status(200).send('OK'));

let players = {};
let chosenTube = Math.random() < 0.5 ? 'left' : 'right';

const TRAIT_COLORS = {
    balanced: '#00f0ff',
    hyper: '#ffaa00',
    acidProof: '#ff00aa',
    mitochondria: '#00ff66',
    rheoMaster: '#00ccff'
};

io.on('connection', (socket) => {
    socket.emit('initRace', {
        id: socket.id,
        chosenTube: chosenTube,
        players: players
    });

    socket.on('joinGame', (data) => {
        players[socket.id] = {
            id: socket.id,
            x: 700,
            y: 9600,
            angle: -Math.PI / 2,
            tailPhase: 0,
            isBoosting: false,
            trait: data.trait || 'balanced',
            color: TRAIT_COLORS[data.trait] || '#00f0ff',
            finished: false
        };
        io.emit('playerJoined', players[socket.id]);
    });

    socket.on('playerUpdate', (data) => {
        if (!players[socket.id]) return;
        players[socket.id].x = data.x;
        players[socket.id].y = data.y;
        players[socket.id].angle = data.angle;
        players[socket.id].tailPhase = data.tailPhase;
        players[socket.id].isBoosting = data.isBoosting;
        players[socket.id].finished = data.finished;
    });

    socket.on('playerWin', () => {
        io.emit('raceWon', { id: socket.id });
        chosenTube = Math.random() < 0.5 ? 'left' : 'right';
        io.emit('initRace', { chosenTube });
    });

    socket.on('disconnect', () => {
        delete players[socket.id];
        io.emit('playerDisconnected', socket.id);
    });
});

// 30 Hz server snapshot broadcast loop
setInterval(() => {
    if (Object.keys(players).length > 0) {
        io.emit('stateUpdate', players);
    }
}, 1000 / 30);

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});