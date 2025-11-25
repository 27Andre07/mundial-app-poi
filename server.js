// =============================================
// SERVIDOR SOCKET.IO PARA VIDEOLLAMADAS
// Mundial App - POI 2025
// =============================================

const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = 3000;

// Almacenar usuarios conectados
const users = new Map(); // userId -> socketId
const rooms = new Map(); // roomId -> Set of userIds

// Conexión de cliente
io.on('connection', (socket) => {
    console.log('✅ Usuario conectado:', socket.id);

    // Usuario se registra con su ID
    socket.on('register', (userId) => {
        users.set(userId, socket.id);
        socket.userId = userId;
        console.log(`👤 Usuario ${userId} registrado con socket ${socket.id}`);
    });

    // Iniciar llamada
    socket.on('call-user', ({ to, from, signal, callerName }) => {
        const recipientSocketId = users.get(to);
        
        if (recipientSocketId) {
            io.to(recipientSocketId).emit('incoming-call', {
                from,
                signal,
                callerName
            });
            console.log(`📞 Llamada de ${from} (${callerName}) a ${to}`);
        } else {
            socket.emit('call-error', { message: 'Usuario no disponible' });
            console.log(`❌ Usuario ${to} no está conectado`);
        }
    });

    // Aceptar llamada
    socket.on('accept-call', ({ to, signal }) => {
        const callerSocketId = users.get(to);
        
        if (callerSocketId) {
            io.to(callerSocketId).emit('call-accepted', signal);
            console.log(`✅ Llamada aceptada entre ${socket.userId} y ${to}`);
        }
    });

    // Rechazar llamada
    socket.on('reject-call', ({ to }) => {
        const callerSocketId = users.get(to);
        
        if (callerSocketId) {
            io.to(callerSocketId).emit('call-rejected');
            console.log(`❌ Llamada rechazada por ${socket.userId}`);
        }
    });

    // Terminar llamada
    socket.on('end-call', ({ to }) => {
        const recipientSocketId = users.get(to);
        
        if (recipientSocketId) {
            io.to(recipientSocketId).emit('call-ended');
            console.log(`📴 Llamada terminada entre ${socket.userId} y ${to}`);
        }
    });

    // Señal ICE (para conexión P2P)
    socket.on('ice-candidate', ({ to, candidate }) => {
        const recipientSocketId = users.get(to);
        
        if (recipientSocketId) {
            io.to(recipientSocketId).emit('ice-candidate', {
                from: socket.userId,
                candidate
            });
        }
    });

    // Desconexión
    socket.on('disconnect', () => {
        if (socket.userId) {
            users.delete(socket.userId);
            console.log(`👋 Usuario ${socket.userId} desconectado`);
            
            // Notificar a otros sobre la desconexión
            socket.broadcast.emit('user-disconnected', socket.userId);
        }
        console.log('🔴 Socket desconectado:', socket.id);
    });
});

http.listen(PORT, () => {
    console.log(`🚀 Servidor Socket.IO escuchando en http://localhost:${PORT}`);
});
