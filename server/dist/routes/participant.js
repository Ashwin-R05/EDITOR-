"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const participantController_1 = require("../controllers/participantController");
const codingSessionController_1 = require("../controllers/codingSessionController");
const codeDraftController_1 = require("../controllers/codeDraftController");
const codeRunController_1 = require("../controllers/codeRunController");
const submissionController_1 = require("../controllers/submissionController");
const router = (0, express_1.Router)();
// All participant routes require authentication and PARTICIPANT role
router.use(auth_1.requireAuth, auth_1.requireParticipant);
// Dashboard and Profile
router.get('/profile', participantController_1.getProfile);
router.get('/dashboard', participantController_1.getDashboard);
// Rounds
router.get('/rounds/active', participantController_1.getActiveRound);
router.get('/rounds/:id', participantController_1.getRound);
// Sessions
router.post('/coding-sessions/:roundId/enter', codingSessionController_1.enterSession);
router.get('/coding-sessions/:roundId', codingSessionController_1.getSession);
// Code Drafts
router.get('/code-drafts/:roundId', codeDraftController_1.getDraft);
router.put('/code-drafts/:roundId', codeDraftController_1.saveDraft);
// Code Execution
router.post('/code/run', codeRunController_1.runCode);
// Submissions
router.post('/submissions', submissionController_1.createSubmission);
router.get('/submissions', submissionController_1.getSubmissions);
router.get('/submissions/:id', submissionController_1.getSubmissionDetail);
exports.default = router;
//# sourceMappingURL=participant.js.map