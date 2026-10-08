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
      // Update online status + heartbeat
      try {
        await query(
          `UPDATE participants SET is_online = true, last_seen = NOW(), last_heartbeat = NOW() WHERE user_id = $1`,
          [user.id]
        );

        // Get participant info for admin notification
        const pResult = await query(
          `SELECT p.participant_id, u.display_name FROM participants p JOIN users u ON u.id = p.user_id WHERE p.user_id = $1`,
          [user.id]
        );
        const pInfo = pResult.rows[0];

        // Notify admin
        io.to('admin').emit('participant:connected', {
          userId: user.id,
          displayName: user.displayName,
          participantId: pInfo?.participant_id,
          timestamp: new Date().toISOString(),
        });

        // Emit updated stats to admin
        emitAdminStatsUpdate();
      } catch (err) {
        console.error('Error updating online status:', err);
      }

      // === Heartbeat Handler ===
      socket.on('heartbeat', async () => {
        try {
          await query(
            `UPDATE participants SET last_heartbeat = NOW(), last_seen = NOW() WHERE user_id = $1`,
            [user.id]
          );
        } catch (err) {
          // Silently handle heartbeat DB errors
        }
      });

      // === Participant Room Guard ===
      socket.on('join:room', (room: string) => {
        // Participants cannot join admin room
        if (room === 'admin' || room.startsWith('role:admin')) {
          console.warn(`[WS] DENIED: Participant ${user.id} tried to join admin room`);
          return;
        }
        // Participants can only join their own user room or round rooms
        if (room.startsWith('user:') && room !== `user:${user.id}`) {
          console.warn(`[WS] DENIED: Participant ${user.id} tried to join other user room ${room}`);
          return;
        }
      });
    }

    socket.on('disconnect', async () => {
      console.log(`[WS] ${user.role} disconnected: ${user.displayName}`);

      if (user.role === 'PARTICIPANT') {
        try {
          await query(
            `UPDATE participants SET is_online = false, last_seen = NOW() WHERE user_id = $1`,
            [user.id]
          );

          const pResult = await query(
            `SELECT p.participant_id FROM participants p WHERE p.user_id = $1`,
            [user.id]
          );

          io.to('admin').emit('participant:disconnected', {
            userId: user.id,
            displayName: user.displayName,
            participantId: pResult.rows[0]?.participant_id,
            timestamp: new Date().toISOString(),
          });

          // Emit updated stats to admin
          emitAdminStatsUpdate();
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

// Debounced admin stats updater - avoids flooding admin with stats on rapid events
let adminStatsTimeout: NodeJS.Timeout | null = null;

export async function emitAdminStatsUpdate(): Promise<void> {
  if (adminStatsTimeout) {
    clearTimeout(adminStatsTimeout);
  }
  adminStatsTimeout = setTimeout(async () => {
    try {
      const statsResult = await query(`
        SELECT
          (SELECT COUNT(*) FROM participants) as total_participants,
          (SELECT COUNT(*) FROM participants WHERE is_online = true) as active_participants,
          (SELECT COUNT(*) FROM participants WHERE status = 'UNDER_REVIEW') as under_review,
          (SELECT COUNT(*) FROM participants WHERE status = 'DISQUALIFIED') as disqualified,
          (SELECT COUNT(*) FROM participants WHERE status = 'COMPLETED') as completed,
          (SELECT COUNT(*) FROM coding_sessions WHERE status = 'ACTIVE') as active_sessions,
          (SELECT COUNT(*) FROM submissions) as total_submissions,
          (SELECT COUNT(*) FROM security_incidents) as total_incidents,
          (SELECT COUNT(*) FROM security_incidents WHERE status = 'PENDING') as pending_incidents,
          (SELECT COUNT(*) FROM admin_notifications WHERE is_read = false) as unread_notifications
      `);
      const s = statsResult.rows[0];
      emitToAdmin('dashboard:stats', {
        totalParticipants: parseInt(s.total_participants),
        activeParticipants: parseInt(s.active_participants),
        underReview: parseInt(s.under_review),
        disqualified: parseInt(s.disqualified),
        completed: parseInt(s.completed),
        activeSessions: parseInt(s.active_sessions),
        totalSubmissions: parseInt(s.total_submissions),
        totalIncidents: parseInt(s.total_incidents),
        pendingIncidents: parseInt(s.pending_incidents),
        unreadNotifications: parseInt(s.unread_notifications),
      });
    } catch (err) {
      // Silent fail for stats
    }
  }, 500);
}
