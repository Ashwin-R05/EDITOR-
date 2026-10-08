"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const securityController_1 = require("../controllers/securityController");
const router = (0, express_1.Router)();
// Participant security endpoints
router.post('/incidents', auth_1.requireAuth, auth_1.requireParticipant, securityController_1.createIncident);
router.get('/status', auth_1.requireAuth, auth_1.requireParticipant, securityController_1.getParticipantSecurityStatus);
// Admin security endpoints
router.get('/admin/incidents', auth_1.requireAuth, auth_1.requireAdmin, securityController_1.getAdminSecurityIncidents);
router.get('/admin/incidents/:id', auth_1.requireAuth, auth_1.requireAdmin, securityController_1.getAdminSecurityIncidentDetail);
router.post('/admin/incidents/:id/accept', auth_1.requireAuth, auth_1.requireAdmin, securityController_1.acceptIncident);
router.post('/admin/incidents/:id/decline', auth_1.requireAuth, auth_1.requireAdmin, securityController_1.declineIncident);
router.get('/admin/stats', auth_1.requireAuth, auth_1.requireAdmin, securityController_1.getAdminSecurityStats);
exports.default = router;
//# sourceMappingURL=security.js.map