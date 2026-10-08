import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare function logActivity(params: {
    activityType: string;
    actorId?: string;
    actorRole?: string;
    actorName?: string;
    participantId?: string;
    roundId?: string;
    sessionId?: string;
    targetType?: string;
    targetId?: string;
    summary: string;
    metadata?: any;
}): Promise<void>;
export declare function createNotification(params: {
    notificationType: string;
    title: string;
    message?: string;
    severity?: string;
    participantId?: string;
    roundId?: string;
    referenceType?: string;
    referenceId?: string;
    metadata?: any;
}): Promise<void>;
export declare function getDashboardStats(req: AuthRequest, res: Response): Promise<void>;
export declare function getParticipantsList(req: AuthRequest, res: Response): Promise<void>;
export declare function getParticipantProfile(req: AuthRequest, res: Response): Promise<void>;
export declare function getActivityFeed(req: AuthRequest, res: Response): Promise<void>;
export declare function getNotifications(req: AuthRequest, res: Response): Promise<void>;
export declare function markNotificationRead(req: AuthRequest, res: Response): Promise<void>;
export declare function markAllNotificationsRead(req: AuthRequest, res: Response): Promise<void>;
export declare function startRoundControlled(req: AuthRequest, res: Response): Promise<void>;
export declare function pauseRoundControlled(req: AuthRequest, res: Response): Promise<void>;
export declare function resumeRoundControlled(req: AuthRequest, res: Response): Promise<void>;
export declare function endRoundControlled(req: AuthRequest, res: Response): Promise<void>;
//# sourceMappingURL=dashboardController.d.ts.map