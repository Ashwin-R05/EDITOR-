import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
export declare function initializeWebSocket(httpServer: HttpServer): SocketIOServer;
export declare function getIO(): SocketIOServer;
export declare function emitToAdmin(event: string, data: any): void;
export declare function emitToUser(userId: string, event: string, data: any): void;
export declare function emitToRound(roundId: string, event: string, data: any): void;
export declare function emitToAll(event: string, data: any): void;
//# sourceMappingURL=socketManager.d.ts.map