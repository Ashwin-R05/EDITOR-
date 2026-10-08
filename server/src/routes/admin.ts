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

const router = Router();

router.use(requireAuth, requireAdmin);

router.get('/dashboard', getAdminDashboard);
router.get('/participants', getParticipants);
router.get('/participants/:id', getParticipantDetail);
router.get('/rounds', getRounds);
router.post('/rounds/:id/start', startRound);
router.post('/rounds/:id/pause', pauseRound);
router.post('/rounds/:id/end', endRound);
router.get('/leaderboard', getLeaderboard);
router.get('/audit-logs', getAuditLogs);

export default router;
