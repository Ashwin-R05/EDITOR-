import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
/**
 * Create an immutable submission snapshot and evaluate against all test cases.
 */
export declare function createSubmission(req: AuthRequest, res: Response): Promise<void>;
/**
 * Get submission history for the authenticated participant.
 */
export declare function getSubmissions(req: AuthRequest, res: Response): Promise<void>;
/**
 * Get exact immutable submission snapshot by ID.
 */
export declare function getSubmissionDetail(req: AuthRequest, res: Response): Promise<void>;
//# sourceMappingURL=submissionController.d.ts.map