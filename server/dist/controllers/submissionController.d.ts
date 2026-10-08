import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
/**
 * Create an immutable submission snapshot and evaluate against all test cases.
 * Sequential submission numbering per participant per round.
 */
export declare function createSubmission(req: AuthRequest, res: Response): Promise<void>;
/**
 * Get submission history for the authenticated participant.
 */
export declare function getSubmissions(req: AuthRequest, res: Response): Promise<void>;
/**
 * Get exact immutable submission snapshot by ID (Participant with ownership verification).
 */
export declare function getSubmissionDetail(req: AuthRequest, res: Response): Promise<void>;
/**
 * ============================================================================
 * ADMIN SUBMISSION MANAGEMENT APIs
 * ============================================================================
 */
/**
 * Admin: Get all submissions with filtering and search
 */
export declare function getAdminSubmissions(req: AuthRequest, res: Response): Promise<void>;
/**
 * Admin: Get detailed submission snapshot including review history and test cases
 */
export declare function getAdminSubmissionDetail(req: AuthRequest, res: Response): Promise<void>;
/**
 * Admin: Validate submission
 */
export declare function validateSubmission(req: AuthRequest, res: Response): Promise<void>;
/**
 * Admin: Reject submission (Reason required!)
 */
export declare function rejectSubmission(req: AuthRequest, res: Response): Promise<void>;
/**
 * Admin: Add administrative remarks to submission
 */
export declare function addSubmissionRemark(req: AuthRequest, res: Response): Promise<void>;
//# sourceMappingURL=submissionController.d.ts.map