const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

let io;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      socket.userId = decoded.userId;
      socket.userRole = decoded.role;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    logger.info(`User ${socket.userId} connected via Socket.IO`);

    // Join role-based rooms
    if (socket.userRole === 'ADMIN' || socket.userRole === 'SUPERADMIN') {
      socket.join('role:ADMIN');
      socket.join('role:SUPERADMIN');
    }
    socket.join(`user:${socket.userId}`);

    socket.on('disconnect', () => {
      logger.info(`User ${socket.userId} disconnected`);
    });
  });

  return io;
};

const getIO = () => io;

module.exports = { initSocket, getIO };
