const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

app.use(express.static('public'));

io.on('connection', (socket) => {
  // Chat functionality (for index.html)
  socket.on('user connected', (user) => {
    if (!user || typeof user.id !== 'string' || typeof user.displayName !== 'string') return;
    const displayName = user.displayName.trim().slice(0, 20);
    if (!displayName) return;

    const isNewUser = !socket.clientId;
    const oldDisplayName = socket.displayName;
    socket.clientId = user.id;
    socket.displayName = displayName;
    console.log(`${displayName} (${user.id}) connected`);

    if (isNewUser) {
      socket.emit('welcome', { id: user.id, displayName });
      socket.broadcast.emit('user joined', { id: user.id, displayName });
    } else if (oldDisplayName !== displayName) {
      socket.broadcast.emit('user renamed', { id: user.id, oldDisplayName, displayName });
    }
  });

  socket.on('chat message', (data) => {
    if (!socket.clientId || !socket.displayName || !data || typeof data.msg !== 'string') return;
    const msg = data.msg.trim().slice(0, 1000);
    if (!msg) return;
    io.emit('chat message', {
      id: socket.clientId,
      displayName: socket.displayName,
      msg,
      timestamp: Date.now()
    });
  });
  
  // Room functionality (for sensor apps)
  socket.on('join', (room) => {
    socket.join(room);
    console.log(`Client joined room: ${room}`);
  });
  
  // Sensor data handling
  socket.on('sensor', (data) => {
    // センサーデータを'game'ルームにいる他のクライアントに送信する
    socket.to('game').emit('sensor', data);
  });

  socket.on('disconnect', () => {
    if (socket.clientId) {
      console.log(`${socket.displayName} (${socket.clientId}) disconnected`);
      io.emit('user left', { id: socket.clientId, displayName: socket.displayName });
    } else {
      console.log('Client disconnected');
    }
  });
});

server.listen(8080, () => {
  console.log('listening on *:8080');
});
