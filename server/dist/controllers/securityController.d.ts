import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
/**
 * Report a security incident during active participant coding session
 */
export declare function createIncident(req: AuthRequest, res: Response): Promise<void>;
/**
 * Get current participant's security status and any active pending review
 */
export declare function getParticipantSecurityStatus(req: AuthRequest, res: Response): Promise<void>;
/**
 * Admin: Get all security incidents with filters & search
 */
export declare function getAdminSecurityIncidents(req: AuthRequest, res: Response): Promise<void>;
/**
 * Admin: Get incident detail including code snapshot and participant session state
 */
export declare function getAdminSecurityIncidentDetail(req: AuthRequest, res: Response): Promise<void>;
/**
 * Admin: Accept incident (Unlock participant and resume coding)
 * Protected against race conditions via atomic WHERE status = 'PENDING'
 */
export declare function acceptIncident(req: AuthRequest, res: Response): Promise<void>;
/**
 * Admin: Decline incident (Disqualify participant)
 * Protected against race conditions via atomic WHERE status = 'PENDING'
 */
export declare function declineIncident(req: AuthRequest, res: Response): Promise<void>;
/**
 * Admin: Get incident statistics breakdown
 */
export declare function getAdminSecurityStats(req: AuthRequest, res: Response): Promise<void>;
//# sourceMappingURL=securityController.d.ts.map