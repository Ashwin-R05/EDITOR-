import { Router } from 'express';
import { login, getMe, registerParticipant, loginSchema, registerParticipantSchema } from '../controllers/authController';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

router.post('/login', validate(loginSchema), login);
router.get('/me', requireAuth, getMe);
router.post('/register-participant', requireAuth, requireAdmin, validate(registerParticipantSchema), registerParticipant);

export default router;
