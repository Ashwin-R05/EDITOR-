"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeWebSocket = initializeWebSocket;
exports.getIO = getIO;
exports.emitToAdmin = emitToAdmin;
exports.emitToUser = emitToUser;
exports.emitToRound = emitToRound;
exports.emitToAll = emitToAll;
const socket_io_1 = require("socket.io");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
const db_1 = require("../models/db");
let io;
function initializeWebSocket(httpServer) {
    io = new socket_io_1.Server(httpServer, {
        cors: {
            origin: config_1.config.clientUrl,
            methods: ['GET', 'POST'],
            credentials: true,
        },
        pingTimeout: 60000,
        pingInterval: 25000,
    });
    // Authentication middleware
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error('Authentication required'));
        }
        try {
            const decoded = jsonwebtoken_1.default.verify(token, config_1.config.jwt.secret);
            socket.user = decoded;
            next();
        }
        catch (error) {
            next(new Error('Invalid token'));
        }
    });
    io.on('connection', async (socket) => {
        const user = socket.user;
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
                await (0, db_1.query)(`UPDATE participants SET is_online = true, last_seen = NOW() WHERE user_id = $1`, [user.id]);
                // Notify admin
                io.to('admin').emit('participant:connected', {
                    userId: user.id,
                    displayName: user.displayName,
                    timestamp: new Date().toISOString(),
                });
            }
            catch (err) {
                console.error('Error updating online status:', err);
            }
        }
        socket.on('disconnect', async () => {
            console.log(`[WS] ${user.role} disconnected: ${user.displayName}`);
            if (user.role === 'PARTICIPANT') {
                try {
                    await (0, db_1.query)(`UPDATE participants SET is_online = false, last_seen = NOW() WHERE user_id = $1`, [user.id]);
                    io.to('admin').emit('participant:disconnected', {
                        userId: user.id,
                        displayName: user.displayName,
                        timestamp: new Date().toISOString(),
                    });
                }
                catch (err) {
                    console.error('Error updating offline status:', err);
                }
            }
        });
        // Join round room
        socket.on('join:round', (roundId) => {
            socket.join(`round:${roundId}`);
        });
        // Leave round room
        socket.on('leave:round', (roundId) => {
            socket.leave(`round:${roundId}`);
        });
    });
    return io;
}
function getIO() {
    if (!io) {
        throw new Error('Socket.IO not initialized');
    }
    return io;
}
// Emit helpers
function emitToAdmin(event, data) {
    if (io) {
        io.to('admin').emit(event, data);
    }
}
function emitToUser(userId, event, data) {
    if (io) {
        io.to(`user:${userId}`).emit(event, data);
    }
}
function emitToRound(roundId, event, data) {
    if (io) {
        io.to(`round:${roundId}`).emit(event, data);
    }
}
function emitToAll(event, data) {
    if (io) {
        io.emit(event, data);
    }
}
//# sourceMappingURL=socketManager.js.map