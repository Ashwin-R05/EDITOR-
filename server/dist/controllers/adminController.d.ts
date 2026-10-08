import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare function getAdminDashboard(req: AuthRequest, res: Response): Promise<void>;
export declare function getParticipants(req: AuthRequest, res: Response): Promise<void>;
export declare function getParticipantDetail(req: AuthRequest, res: Response): Promise<void>;
export declare function getRounds(req: AuthRequest, res: Response): Promise<void>;
export declare function startRound(req: AuthRequest, res: Response): Promise<void>;
export declare function pauseRound(req: AuthRequest, res: Response): Promise<void>;
export declare function endRound(req: AuthRequest, res: Response): Promise<void>;
export declare function getLeaderboard(req: AuthRequest, res: Response): Promise<void>;
export declare function getAuditLogs(req: AuthRequest, res: Response): Promise<void>;
//# sourceMappingURL=adminController.d.ts.map