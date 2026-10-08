import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
export declare function getProfile(req: AuthRequest, res: Response): Promise<void>;
export declare function getDashboard(req: AuthRequest, res: Response): Promise<void>;
export declare function getActiveRound(req: AuthRequest, res: Response): Promise<void>;
export declare function getRound(req: AuthRequest, res: Response): Promise<void>;
//# sourceMappingURL=participantController.d.ts.map