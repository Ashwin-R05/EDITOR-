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
import {
  getAdminSecurityIncidents,
  getAdminSecurityIncidentDetail,
  acceptIncident,
  declineIncident,
  getAdminSecurityStats,
} from '../controllers/securityController';
import {
  getDashboardStats,
  getParticipantsList,
  getParticipantProfile,
  getActivityFeed,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  startRoundControlled,
  pauseRoundControlled,
  resumeRoundControlled,
  endRoundControlled,
} from '../controllers/dashboardController';

const router = Router();

router.use(requireAuth, requireAdmin);

// =============================================
// Phase 6: Enhanced Admin Dashboard APIs
// =============================================

// Live Dashboard (new efficient single-query endpoint)
router.get('/dashboard/stats', getDashboardStats);

// Enhanced Participant List (paginated, searchable, filterable)
router.get('/participants/live', getParticipantsList);

// Enhanced Participant Profile  
router.get('/participants/live/:id', getParticipantProfile);

// Activity Feed
router.get('/activity', getActivityFeed);

// Notifications
router.get('/notifications', getNotifications);
router.post('/notifications/:id/read', markNotificationRead);
router.post('/notifications/read-all', markAllNotificationsRead);

// Enhanced Round Controls (with Socket.IO broadcasts + activity logging)
router.post('/rounds/:id/start-live', startRoundControlled);
router.post('/rounds/:id/pause-live', pauseRoundControlled);
router.post('/rounds/:id/resume-live', resumeRoundControlled);
router.post('/rounds/:id/end-live', endRoundControlled);

// =============================================
// Phase 1-5: Original routes (preserved)
// =============================================

// Dashboard & Stats (legacy)
router.get('/dashboard', getAdminDashboard);

// Participants (legacy)
router.get('/participants', getParticipants);
router.get('/participants/:id', getParticipantDetail);

// Rounds Management (legacy)
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

// Security Incident Management
router.get('/security/incidents', getAdminSecurityIncidents);
router.get('/security/incidents/:id', getAdminSecurityIncidentDetail);
router.post('/security/incidents/:id/accept', acceptIncident);
router.post('/security/incidents/:id/decline', declineIncident);
router.get('/security/stats', getAdminSecurityStats);

// Leaderboard & Audit
router.get('/leaderboard', getLeaderboard);
router.get('/audit-logs', getAuditLogs);

export default router;
