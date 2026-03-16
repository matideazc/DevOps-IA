import { Server as SocketIOServer } from 'socket.io';
import type { FastifyInstance } from 'fastify';

let io: SocketIOServer;

export function initSocket(server: FastifyInstance) {
  io = new SocketIOServer(server.server, {
    cors: {
      origin: '*', // For MVP, permissive CORS
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    server.log.info(`Socket connected: ${socket.id}`);

    socket.on('disconnect', () => {
      server.log.info(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function getSocketServer() {
  if (!io) throw new Error('Socket.io has not been initialized yet');
  return io;
}
