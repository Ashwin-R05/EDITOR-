"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const adminController_1 = require("../controllers/adminController");
const submissionController_1 = require("../controllers/submissionController");
const securityController_1 = require("../controllers/securityController");
const dashboardController_1 = require("../controllers/dashboardController");
const router = (0, express_1.Router)();
router.use(auth_1.requireAuth, auth_1.requireAdmin);
// =============================================
// Phase 6: Enhanced Admin Dashboard APIs
// =============================================
// Live Dashboard (new efficient single-query endpoint)
router.get('/dashboard/stats', dashboardController_1.getDashboardStats);
// Enhanced Participant List (paginated, searchable, filterable)
router.get('/participants/live', dashboardController_1.getParticipantsList);
// Enhanced Participant Profile  
router.get('/participants/live/:id', dashboardController_1.getParticipantProfile);
// Activity Feed
router.get('/activity', dashboardController_1.getActivityFeed);
// Notifications
router.get('/notifications', dashboardController_1.getNotifications);
router.post('/notifications/:id/read', dashboardController_1.markNotificationRead);
router.post('/notifications/read-all', dashboardController_1.markAllNotificationsRead);
// Enhanced Round Controls (with Socket.IO broadcasts + activity logging)
router.post('/rounds/:id/start-live', dashboardController_1.startRoundControlled);
router.post('/rounds/:id/pause-live', dashboardController_1.pauseRoundControlled);
router.post('/rounds/:id/resume-live', dashboardController_1.resumeRoundControlled);
router.post('/rounds/:id/end-live', dashboardController_1.endRoundControlled);
// =============================================
// Phase 1-5: Original routes (preserved)
// =============================================
// Dashboard & Stats (legacy)
router.get('/dashboard', adminController_1.getAdminDashboard);
// Participants (legacy)
router.get('/participants', adminController_1.getParticipants);
router.get('/participants/:id', adminController_1.getParticipantDetail);
// Rounds Management (legacy)
router.get('/rounds', adminController_1.getRounds);
router.post('/rounds/:id/start', adminController_1.startRound);
router.post('/rounds/:id/pause', adminController_1.pauseRound);
router.post('/rounds/:id/end', adminController_1.endRound);
// Submissions Review Management
router.get('/submissions', submissionController_1.getAdminSubmissions);
router.get('/submissions/:id', submissionController_1.getAdminSubmissionDetail);
router.post('/submissions/:id/validate', submissionController_1.validateSubmission);
router.post('/submissions/:id/reject', submissionController_1.rejectSubmission);
router.post('/submissions/:id/remarks', submissionController_1.addSubmissionRemark);
// Security Incident Management
router.get('/security/incidents', securityController_1.getAdminSecurityIncidents);
router.get('/security/incidents/:id', securityController_1.getAdminSecurityIncidentDetail);
router.post('/security/incidents/:id/accept', securityController_1.acceptIncident);
router.post('/security/incidents/:id/decline', securityController_1.declineIncident);
router.get('/security/stats', securityController_1.getAdminSecurityStats);
// Leaderboard & Audit
router.get('/leaderboard', adminController_1.getLeaderboard);
router.get('/audit-logs', adminController_1.getAuditLogs);
exports.default = router;
//# sourceMappingURL=admin.js.map