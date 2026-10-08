import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
/**
 * Enter or retrieve a participant's coding session for a given round.
 * Validates participant state, round status, and calculates server-authoritative timer.
 */
export declare function enterSession(req: AuthRequest, res: Response): Promise<void>;
/**
 * Get current session state by roundId.
 */
export declare function getSession(req: AuthRequest, res: Response): Promise<void>;
//# sourceMappingURL=codingSessionController.d.ts.map