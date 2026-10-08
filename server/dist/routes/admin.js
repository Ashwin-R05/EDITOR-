"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const adminController_1 = require("../controllers/adminController");
const router = (0, express_1.Router)();
router.use(auth_1.requireAuth, auth_1.requireAdmin);
router.get('/dashboard', adminController_1.getAdminDashboard);
router.get('/participants', adminController_1.getParticipants);
router.get('/participants/:id', adminController_1.getParticipantDetail);
router.get('/rounds', adminController_1.getRounds);
router.post('/rounds/:id/start', adminController_1.startRound);
router.post('/rounds/:id/pause', adminController_1.pauseRound);
router.post('/rounds/:id/end', adminController_1.endRound);
router.get('/leaderboard', adminController_1.getLeaderboard);
router.get('/audit-logs', adminController_1.getAuditLogs);
exports.default = router;
//# sourceMappingURL=admin.js.map