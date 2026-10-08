import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth';
import {
  getAdminDashboard,
  getParticipants,
  getParticipantDetail,
  getRounds,
  startRound,
  pauseRound,
  endRound,
  getLeaderboard,
  getAuditLogs,
} from '../controllers/adminController';
import {
  getAdminSubmissions,
  getAdminSubmissionDetail,
  validateSubmission,
  rejectSubmission,
  addSubmissionRemark,
} from '../controllers/submissionController';

const router = Router();

router.use(requireAuth, requireAdmin);

// Dashboard & Stats
router.get('/dashboard', getAdminDashboard);

// Participants
router.get('/participants', getParticipants);
router.get('/participants/:id', getParticipantDetail);

// Rounds Management
router.get('/rounds', getRounds);
router.post('/rounds/:id/start', startRound);
router.post('/rounds/:id/pause', pauseRound);
router.post('/rounds/:id/end', endRound);

// Submissions Review Management
router.get('/submissions', getAdminSubmissions);
router.get('/submissions/:id', getAdminSubmissionDetail);
router.post('/submissions/:id/validate', validateSubmission);
router.post('/submissions/:id/reject', rejectSubmission);
router.post('/submissions/:id/remarks', addSubmissionRemark);

// Leaderboard & Audit
router.get('/leaderboard', getLeaderboard);
router.get('/audit-logs', getAuditLogs);

export default router;
