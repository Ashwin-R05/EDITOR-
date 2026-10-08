"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const adminController_1 = require("../controllers/adminController");
const submissionController_1 = require("../controllers/submissionController");
const router = (0, express_1.Router)();
router.use(auth_1.requireAuth, auth_1.requireAdmin);
// Dashboard & Stats
router.get('/dashboard', adminController_1.getAdminDashboard);
// Participants
router.get('/participants', adminController_1.getParticipants);
router.get('/participants/:id', adminController_1.getParticipantDetail);
// Rounds Management
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
// Leaderboard & Audit
router.get('/leaderboard', adminController_1.getLeaderboard);
router.get('/audit-logs', adminController_1.getAuditLogs);
exports.default = router;
//# sourceMappingURL=admin.js.map