import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { query } from '../models/db';
import { AuthUser } from '../middleware/auth';

let io: SocketIOServer;

export function initializeWebSocket(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: config.clientUrl,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Authentication middleware
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, config.jwt.secret) as AuthUser;
      (socket as any).user = decoded;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket: Socket) => {
    const user = (socket as any).user as AuthUser;
    console.log(`[WS] ${user.role} connected: ${user.displayName} (${user.id})`);

    // Join role-based rooms
    socket.join(`role:${user.role.toLowerCase()}`);
    socket.join(`user:${user.id}`);

    if (user.role === 'ADMIN') {
      socket.join('admin');
    }

    if (user.role === 'PARTICIPANT') {
      // Update online status
      try {
        await query(
          `UPDATE participants SET is_online = true, last_seen = NOW() WHERE user_id = $1`,
          [user.id]
        );
        // Notify admin
        io.to('admin').emit('participant:connected', {
          userId: user.id,
          displayName: user.displayName,
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        console.error('Error updating online status:', err);
      }
    }

    socket.on('disconnect', async () => {
      console.log(`[WS] ${user.role} disconnected: ${user.displayName}`);

      if (user.role === 'PARTICIPANT') {
        try {
          await query(
            `UPDATE participants SET is_online = false, last_seen = NOW() WHERE user_id = $1`,
            [user.id]
          );
          io.to('admin').emit('participant:disconnected', {
            userId: user.id,
            displayName: user.displayName,
            timestamp: new Date().toISOString(),
          });
        } catch (err) {
          console.error('Error updating offline status:', err);
        }
      }
    });

    // Join round room
    socket.on('join:round', (roundId: string) => {
      socket.join(`round:${roundId}`);
    });

    // Leave round room
    socket.on('leave:round', (roundId: string) => {
      socket.leave(`round:${roundId}`);
    });
  });

  return io;
}

export function getIO(): SocketIOServer {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
}

// Emit helpers
export function emitToAdmin(event: string, data: any): void {
  if (io) {
    io.to('admin').emit(event, data);
  }
}

export function emitToUser(userId: string, event: string, data: any): void {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
}

export function emitToRound(roundId: string, event: string, data: any): void {
  if (io) {
    io.to(`round:${roundId}`).emit(event, data);
  }
}

export function emitToAll(event: string, data: any): void {
  if (io) {
    io.emit(event, data);
  }
}
