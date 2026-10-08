import { Router } from 'express';
import { requireAuth, requireParticipant } from '../middleware/auth';
import { getActiveRound, getRound } from '../controllers/participantController';
import { enterSession, getSession } from '../controllers/codingSessionController';
import { getDraft, saveDraft } from '../controllers/codeDraftController';
import { runCode } from '../controllers/codeRunController';
import { createSubmission, getSubmissions, getSubmissionDetail } from '../controllers/submissionController';

const router = Router();

// Top-level aliases for competition coding APIs
router.use(requireAuth, requireParticipant);

// Rounds
router.get('/rounds/active', getActiveRound);
router.get('/rounds/:id', getRound);

// Sessions
router.post('/coding-sessions/:roundId/enter', enterSession);
router.get('/coding-sessions/:roundId', getSession);

// Code Drafts
router.get('/code-drafts/:roundId', getDraft);
router.put('/code-drafts/:roundId', saveDraft);

// Code Run
router.post('/code/run', runCode);

// Submissions
router.post('/submissions', createSubmission);
router.get('/submissions', getSubmissions);
router.get('/submissions/:id', getSubmissionDetail);

export default router;
