import { Router } from 'express';
import { requireAuth, requireParticipant, requireAdmin } from '../middleware/auth';
import {
  createIncident,
  getParticipantSecurityStatus,
  getAdminSecurityIncidents,
  getAdminSecurityIncidentDetail,
  acceptIncident,
  declineIncident,
  getAdminSecurityStats,
} from '../controllers/securityController';

const router = Router();

// Participant security endpoints
router.post('/incidents', requireAuth, requireParticipant, createIncident);
router.get('/status', requireAuth, requireParticipant, getParticipantSecurityStatus);

// Admin security endpoints
router.get('/admin/incidents', requireAuth, requireAdmin, getAdminSecurityIncidents);
router.get('/admin/incidents/:id', requireAuth, requireAdmin, getAdminSecurityIncidentDetail);
router.post('/admin/incidents/:id/accept', requireAuth, requireAdmin, acceptIncident);
router.post('/admin/incidents/:id/decline', requireAuth, requireAdmin, declineIncident);
router.get('/admin/stats', requireAuth, requireAdmin, getAdminSecurityStats);

export default router;
