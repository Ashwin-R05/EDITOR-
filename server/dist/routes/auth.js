"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const router = (0, express_1.Router)();
router.post('/login', (0, validate_1.validate)(authController_1.loginSchema), authController_1.login);
router.get('/me', auth_1.requireAuth, authController_1.getMe);
router.post('/register-participant', auth_1.requireAuth, auth_1.requireAdmin, (0, validate_1.validate)(authController_1.registerParticipantSchema), authController_1.registerParticipant);
exports.default = router;
//# sourceMappingURL=auth.js.map