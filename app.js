// server.js
const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// Store nicknames and socket IDs
const users = {};
// Store reverse mapping of nickname to socket ID for private messaging
const nickToSocket = {};

io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('set nickname', (nickname) => {
        users[socket.id] = nickname;
        nickToSocket[nickname] = socket.id;
        socket.broadcast.emit('chat message', `${nickname} has joined the chat`);
        io.emit('users update', Object.values(users));
    });

    socket.on('chat message', (msg) => {
        const nickname = users[socket.id] || "Anonymous";
        io.emit('chat message', `${nickname}: ${msg}`);
    });

    socket.on('private message', ({ to, message }) => {
        const senderNickname = users[socket.id];
        const recipientSocketId = nickToSocket[to];
        
        if (recipientSocketId) {
            // Send to recipient
            io.to(recipientSocketId).emit('private message', {
                from: senderNickname,
                message: message
            });
            // Send to sender
            socket.emit('private message', {
                from: senderNickname,
                to: to,
                message: message
            });
        } else {
            socket.emit('chat message', `User ${to} is not online.`);
        }
    });

    socket.on('typing', (nickname) => {
        io.emit('typing', nickname);
    });
    
    socket.on('stop typing', () => {
        io.emit('stop typing');
    });
    
    socket.on('disconnect', () => {
        const nickname = users[socket.id];
        delete nickToSocket[nickname];
        delete users[socket.id];
        io.emit('chat message', `${nickname} has left the chat`);
        io.emit('users update', Object.values(users));
    });
});

server.listen(3000, () => {
  console.log('listening on :3000');
});