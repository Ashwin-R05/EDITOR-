import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
/**
 * Retrieve the latest code draft for the authenticated participant and given round.
 * Falls back to the problem starter code if no draft has been saved yet.
 */
export declare function getDraft(req: AuthRequest, res: Response): Promise<void>;
/**
 * Save code draft for the authenticated participant and given round.
 * Validates session is active and not expired before saving.
 */
export declare function saveDraft(req: AuthRequest, res: Response): Promise<void>;
//# sourceMappingURL=codeDraftController.d.ts.map