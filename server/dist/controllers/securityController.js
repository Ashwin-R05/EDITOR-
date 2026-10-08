"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createIncident = createIncident;
exports.getParticipantSecurityStatus = getParticipantSecurityStatus;
exports.getAdminSecurityIncidents = getAdminSecurityIncidents;
exports.getAdminSecurityIncidentDetail = getAdminSecurityIncidentDetail;
exports.acceptIncident = acceptIncident;
exports.declineIncident = declineIncident;
exports.getAdminSecurityStats = getAdminSecurityStats;
const db_1 = require("../models/db");
const socketManager_1 = require("../websocket/socketManager");
const dashboardController_1 = require("./dashboardController");
const VALID_INCIDENT_TYPES = [
    'COPY_ATTEMPT',
    'PASTE_ATTEMPT',
    'CUT_ATTEMPT',
    'RIGHT_CLICK',
    'TAB_SWITCH',
    'WINDOW_BLUR',
    'VISIBILITY_CHANGE',
    'FULLSCREEN_EXIT',
];
const SEVERITY_MAP = {
    COPY_ATTEMPT: 'HIGH',
    PASTE_ATTEMPT: 'HIGH',
    CUT_ATTEMPT: 'HIGH',
    RIGHT_CLICK: 'MEDIUM',
    TAB_SWITCH: 'HIGH',
    WINDOW_BLUR: 'MEDIUM',
    VISIBILITY_CHANGE: 'HIGH',
    FULLSCREEN_EXIT: 'HIGH',
};
// Generate human-readable incident code (e.g. SEC-20261009-1234)
function generateIncidentCode() {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `SEC-${dateStr}-${rand}`;
}
/**
 * Report a security incident during active participant coding session
 */
async function createIncident(req, res) {
    const { roundId, incidentType, description, codeSnapshot, metadata = {} } = req.body;
    if (!roundId || !incidentType) {
        res.status(400).json({ error: 'roundId and incidentType are required' });
        return;
    }
    if (!VALID_INCIDENT_TYPES.includes(incidentType)) {
        res.status(400).json({ error: `Invalid incidentType: ${incidentType}` });
        return;
    }
    try {
        // 1. Fetch participant profile
        const pResult = await (0, db_1.query)('SELECT id, participant_id, status FROM participants WHERE user_id = $1', [req.user.id]);
        if (pResult.rows.length === 0) {
            res.status(404).json({ error: 'Participant not found' });
            return;
        }
        const participant = pResult.rows[0];
        // If already disqualified, no further state change
        if (participant.status === 'DISQUALIFIED') {
            res.status(403).json({ error: 'Participant is disqualified' });
            return;
        }
        // 2. Fetch round and coding session
        const rResult = await (0, db_1.query)('SELECT id, round_number, name, status FROM rounds WHERE id = $1', [roundId]);
        if (rResult.rows.length === 0) {
            res.status(404).json({ error: 'Round not found' });
            return;
        }
        const round = rResult.rows[0];
        const sResult = await (0, db_1.query)('SELECT id, status FROM coding_sessions WHERE participant_id = $1 AND round_id = $2', [participant.id, roundId]);
        if (sResult.rows.length === 0) {
            res.status(400).json({ error: 'No active coding session for this round' });
            return;
        }
        const session = sResult.rows[0];
        // 3. Deduplication: Check if identical incident logged in last 2 seconds
        const recentDup = await (0, db_1.query)(`SELECT id, incident_code, status
       FROM security_incidents
       WHERE participant_id = $1 AND round_id = $2 AND incident_type = $3
         AND detected_at > NOW() - INTERVAL '2 seconds'
       ORDER BY detected_at DESC
       LIMIT 1`, [participant.id, roundId, incidentType]);
        if (recentDup.rows.length > 0) {
            // Deduplicated: return existing incident
            res.status(200).json({
                message: 'Incident already logged recently (deduplicated)',
                incident: recentDup.rows[0],
                sessionStatus: 'UNDER_REVIEW',
            });
            return;
        }
        // 4. Save current editor code snapshot as a draft
        if (codeSnapshot !== undefined && typeof codeSnapshot === 'string') {
            await (0, db_1.query)(`INSERT INTO code_drafts (session_id, participant_id, round_id, source_code, language, save_trigger)
         VALUES ($1, $2, $3, $4, 'c', 'security')`, [session.id, participant.id, roundId, codeSnapshot]);
        }
        // 5. Create incident in security_incidents table
        const incidentCode = generateIncidentCode();
        const severity = SEVERITY_MAP[incidentType] || 'HIGH';
        const finalDescription = description || `${incidentType.replace(/_/g, ' ')} detected during coding session.`;
        const incResult = await (0, db_1.query)(`INSERT INTO security_incidents (
        participant_id, round_id, session_id, incident_type,
        description, code_snapshot, status, incident_code,
        severity, metadata, detected_at
      ) VALUES ($1, $2, $3, $4, $5, $6, 'PENDING', $7, $8, $9, NOW())
      RETURNING *`, [
            participant.id,
            roundId,
            session.id,
            incidentType,
            finalDescription,
            codeSnapshot || null,
            incidentCode,
            severity,
            JSON.stringify(metadata),
        ]);
        const incident = incResult.rows[0];
        // 6. Mutate participant and session state to UNDER_REVIEW
        await (0, db_1.query)(`UPDATE participants SET status = 'UNDER_REVIEW', updated_at = NOW() WHERE id = $1`, [participant.id]);
        await (0, db_1.query)(`UPDATE coding_sessions SET status = 'UNDER_REVIEW', updated_at = NOW() WHERE id = $1`, [session.id]);
        // 7. Record audit log
        await (0, db_1.query)(`INSERT INTO audit_logs (actor_id, actor_role, action, target_type, target_id, metadata)
       VALUES ($1, 'PARTICIPANT', 'SECURITY_INCIDENT_CREATED', 'security_incident', $2, $3)`, [
            req.user.id,
            incident.id,
            JSON.stringify({
                incidentCode,
                incidentType,
                severity,
                roundNumber: round.round_number,
            }),
        ]);
        // 8. Real-time notifications via Socket.IO
        // A. Notify Admin in real time
        (0, socketManager_1.emitToAdmin)('security:incident', {
            incidentId: incident.id,
            incidentCode,
            participantId: participant.id,
            participantCode: participant.participant_id,
            participantName: req.user.displayName,
            roundId,
            roundNumber: round.round_number,
            roundName: round.name,
            incidentType,
            severity,
            description: finalDescription,
            detectedAt: incident.detected_at,
            status: 'PENDING',
        });
        (0, socketManager_1.emitToAdmin)('participant:statusChanged', {
            participantId: participant.id,
            status: 'UNDER_REVIEW',
            sessionStatus: 'UNDER_REVIEW',
        });
        // B. Direct lock event to the participant's own socket room
        (0, socketManager_1.emitToUser)(req.user.id, 'security:locked', {
            incidentId: incident.id,
            incidentCode,
            incidentType,
            description: finalDescription,
            status: 'UNDER_REVIEW',
        });
        // C. Activity feed & Admin Notification
        await (0, dashboardController_1.logActivity)({
            activityType: 'SECURITY_INCIDENT',
            actorId: req.user.id,
            actorRole: 'PARTICIPANT',
            actorName: req.user.displayName,
            participantId: participant.id,
            roundId,
            sessionId: session.id,
            targetType: 'security_incident',
            targetId: incident.id,
            summary: `Security incident detected: ${incidentType} (${severity}) - ${participant.participant_id}`,
            metadata: { incidentCode, incidentType, severity, description: finalDescription },
        });
        await (0, dashboardController_1.createNotification)({
            notificationType: 'SECURITY_ALERT',
            title: `Security Alert: ${incidentType}`,
            message: `Participant ${participant.participant_id} (${req.user.displayName}) triggered ${incidentType}: ${finalDescription}`,
            severity: severity === 'HIGH' ? 'CRITICAL' : 'WARNING',
            participantId: participant.id,
            roundId,
            referenceType: 'security_incident',
            referenceId: incident.id,
            metadata: { incidentCode, incidentType, severity },
        });
        (0, socketManager_1.emitToAdmin)('activity:new', {
            activityType: 'SECURITY_INCIDENT',
            summary: `Security incident detected: ${incidentType} (${severity}) - ${participant.participant_id}`,
            createdAt: new Date().toISOString(),
            participantId: participant.id,
            roundId,
        });
        (0, socketManager_1.emitToAdmin)('notification:new', {
            title: `Security Alert: ${incidentType}`,
            message: `Participant ${participant.participant_id} triggered ${incidentType}`,
            severity: severity === 'HIGH' ? 'CRITICAL' : 'WARNING',
            createdAt: new Date().toISOString(),
        });
        res.status(201).json({
            message: 'Security incident logged and session locked for administrative review',
            incident,
            sessionStatus: 'UNDER_REVIEW',
        });
    }
    catch (error) {
        console.error('CreateIncident error:', error);
        res.status(500).json({ error: 'Internal server error processing security incident' });
    }
}
/**
 * Get current participant's security status and any active pending review
 */
async function getParticipantSecurityStatus(req, res) {
    try {
        const pResult = await (0, db_1.query)('SELECT id, participant_id, status FROM participants WHERE user_id = $1', [req.user.id]);
        if (pResult.rows.length === 0) {
            res.status(404).json({ error: 'Participant not found' });
            return;
        }
        const participant = pResult.rows[0];
        // Find any pending incident
        const incResult = await (0, db_1.query)(`SELECT si.*, r.name as round_name, r.round_number
       FROM security_incidents si
       JOIN rounds r ON r.id = si.round_id
       WHERE si.participant_id = $1 AND si.status = 'PENDING'
       ORDER BY si.detected_at DESC
       LIMIT 1`, [participant.id]);
        res.json({
            participantStatus: participant.status,
            isUnderReview: participant.status === 'UNDER_REVIEW',
            isDisqualified: participant.status === 'DISQUALIFIED',
            activeIncident: incResult.rows[0] || null,
        });
    }
    catch (error) {
        console.error('GetParticipantSecurityStatus error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
/**
 * Admin: Get all security incidents with filters & search
 */
async function getAdminSecurityIncidents(req, res) {
    const { incidentType, participantId, roundId, status, severity, search } = req.query;
    try {
        let queryText = `
      SELECT si.id, si.incident_code, si.incident_type, si.severity,
             si.description, si.status, si.detected_at, si.decision_at,
             si.admin_decision, si.admin_reason,
             p.id as participant_db_id, p.participant_id as participant_code, p.status as participant_status,
             p.college, p.department,
             u.display_name as participant_name, u.email as participant_email,
             r.id as round_id, r.name as round_name, r.round_number,
             a.display_name as admin_name
      FROM security_incidents si
      JOIN participants p ON p.id = si.participant_id
      JOIN users u ON u.id = p.user_id
      JOIN rounds r ON r.id = si.round_id
      LEFT JOIN users a ON a.id = si.admin_id
      WHERE 1=1
    `;
        const params = [];
        if (incidentType) {
            params.push(incidentType);
            queryText += ` AND si.incident_type = $${params.length}`;
        }
        if (participantId) {
            params.push(participantId);
            queryText += ` AND si.participant_id = $${params.length}`;
        }
        if (roundId) {
            params.push(roundId);
            queryText += ` AND si.round_id = $${params.length}`;
        }
        if (status) {
            params.push(status);
            queryText += ` AND si.status = $${params.length}`;
        }
        if (severity) {
            params.push(severity);
            queryText += ` AND si.severity = $${params.length}`;
        }
        if (search) {
            params.push(`%${search}%`);
            queryText += ` AND (u.display_name ILIKE $${params.length} OR p.participant_id ILIKE $${params.length} OR si.incident_code ILIKE $${params.length})`;
        }
        queryText += ` ORDER BY si.detected_at DESC`;
        const result = await (0, db_1.query)(queryText, params);
        res.json({ incidents: result.rows });
    }
    catch (error) {
        console.error('GetAdminSecurityIncidents error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
/**
 * Admin: Get incident detail including code snapshot and participant session state
 */
async function getAdminSecurityIncidentDetail(req, res) {
    const { id } = req.params;
    try {
        const incResult = await (0, db_1.query)(`SELECT si.*,
              p.id as participant_db_id, p.participant_id as participant_code, p.status as participant_status,
              p.college, p.department, p.year,
              u.id as user_id, u.display_name as participant_name, u.email as participant_email,
              r.id as round_id, r.name as round_name, r.round_number,
              cs.id as session_id, cs.status as session_status, cs.run_count, cs.submission_count,
              cs.start_time as session_start_time, cs.end_time as session_end_time,
              a.display_name as admin_name
       FROM security_incidents si
       JOIN participants p ON p.id = si.participant_id
       JOIN users u ON u.id = p.user_id
       JOIN rounds r ON r.id = si.round_id
       JOIN coding_sessions cs ON cs.id = si.session_id
       LEFT JOIN users a ON a.id = si.admin_id
       WHERE si.id::text = $1 OR si.incident_code = $1`, [id]);
        if (incResult.rows.length === 0) {
            res.status(404).json({ error: 'Security incident not found' });
            return;
        }
        const incident = incResult.rows[0];
        // Compute remaining session seconds
        const now = new Date();
        const end = new Date(incident.session_end_time);
        const remainingSeconds = Math.max(0, Math.floor((end.getTime() - now.getTime()) / 1000));
        res.json({
            incident,
            sessionMetrics: {
                remainingSeconds,
                runCount: incident.run_count,
                submissionCount: incident.submission_count,
                sessionStatus: incident.session_status,
            },
        });
    }
    catch (error) {
        console.error('GetAdminSecurityIncidentDetail error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
/**
 * Admin: Accept incident (Unlock participant and resume coding)
 * Protected against race conditions via atomic WHERE status = 'PENDING'
 */
async function acceptIncident(req, res) {
    const { id } = req.params;
    const { remark = 'Accepted by administrator' } = req.body;
    try {
        // Atomic update preventing duplicate conflicting resolutions
        const updateRes = await (0, db_1.query)(`UPDATE security_incidents
       SET status = 'ACCEPTED',
           admin_decision = 'ACCEPT',
           admin_id = $1,
           admin_reason = $2,
           decision_at = NOW(),
           updated_at = NOW()
       WHERE (id::text = $3 OR incident_code = $3) AND status = 'PENDING'
       RETURNING *`, [req.user.id, remark, id]);
        if (updateRes.rowCount === 0) {
            // Check if incident exists with already resolved status
            const checkRes = await (0, db_1.query)('SELECT id, status, admin_decision FROM security_incidents WHERE id::text = $1 OR incident_code = $1', [id]);
            if (checkRes.rows.length > 0) {
                res.status(409).json({
                    error: 'INCIDENT_ALREADY_RESOLVED',
                    message: `This incident was already resolved as ${checkRes.rows[0].status} (${checkRes.rows[0].admin_decision}).`,
                });
                return;
            }
            res.status(404).json({ error: 'Security incident not found' });
            return;
        }
        const incident = updateRes.rows[0];
        // Restore coding session to ACTIVE
        await (0, db_1.query)(`UPDATE coding_sessions SET status = 'ACTIVE', updated_at = NOW() WHERE id = $1`, [incident.session_id]);
        // Check if participant has any other PENDING incidents
        const pendingCountRes = await (0, db_1.query)(`SELECT COUNT(*) as count FROM security_incidents WHERE participant_id = $1 AND status = 'PENDING'`, [incident.participant_id]);
        const hasOtherPending = parseInt(pendingCountRes.rows[0].count, 10) > 0;
        if (!hasOtherPending) {
            await (0, db_1.query)(`UPDATE participants SET status = 'CLEAR', updated_at = NOW() WHERE id = $1`, [incident.participant_id]);
        }
        // Get participant user_id for socket notification
        const pRes = await (0, db_1.query)('SELECT user_id FROM participants WHERE id = $1', [incident.participant_id]);
        const userId = pRes.rows[0]?.user_id;
        // Audit log
        await (0, db_1.query)(`INSERT INTO audit_logs (actor_id, actor_role, action, target_type, target_id, metadata)
       VALUES ($1, 'ADMIN', 'SECURITY_INCIDENT_ACCEPTED', 'security_incident', $2, $3)`, [
            req.user.id,
            incident.id,
            JSON.stringify({
                incidentCode: incident.incident_code,
                remark,
                participantId: incident.participant_id,
            }),
        ]);
        // Socket.IO notifications
        if (userId) {
            (0, socketManager_1.emitToUser)(userId, 'security:accepted', {
                incidentId: incident.id,
                incidentCode: incident.incident_code,
                roundId: incident.round_id,
                sessionStatus: 'ACTIVE',
                remark,
                message: 'Security review accepted. Your coding session has been resumed.',
            });
        }
        (0, socketManager_1.emitToAdmin)('participant:statusChanged', {
            participantId: incident.participant_id,
            status: hasOtherPending ? 'UNDER_REVIEW' : 'CLEAR',
            sessionStatus: 'ACTIVE',
        });
        await (0, dashboardController_1.logActivity)({
            activityType: 'INCIDENT_RESOLVED',
            actorId: req.user.id,
            actorRole: 'ADMIN',
            actorName: req.user.displayName,
            participantId: incident.participant_id,
            roundId: incident.round_id,
            sessionId: incident.session_id,
            targetType: 'security_incident',
            targetId: incident.id,
            summary: `Admin accepted incident ${incident.incident_code}. Session resumed.`,
            metadata: { decision: 'ACCEPT', remark },
        });
        (0, socketManager_1.emitToAdmin)('activity:new', {
            activityType: 'INCIDENT_RESOLVED',
            summary: `Admin accepted incident ${incident.incident_code}`,
            createdAt: new Date().toISOString(),
        });
        res.json({
            message: 'Incident accepted. Participant session resumed.',
            incident,
        });
    }
    catch (error) {
        console.error('AcceptIncident error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
/**
 * Admin: Decline incident (Disqualify participant)
 * Protected against race conditions via atomic WHERE status = 'PENDING'
 */
async function declineIncident(req, res) {
    const { id } = req.params;
    const { reason } = req.body;
    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
        res.status(400).json({ error: 'Rejection reason is required' });
        return;
    }
    const finalReason = reason.trim();
    try {
        // Atomic update preventing duplicate conflicting resolutions
        const updateRes = await (0, db_1.query)(`UPDATE security_incidents
       SET status = 'DECLINED',
           admin_decision = 'DECLINE',
           admin_id = $1,
           admin_reason = $2,
           decision_at = NOW(),
           updated_at = NOW()
       WHERE (id::text = $3 OR incident_code = $3) AND status = 'PENDING'
       RETURNING *`, [req.user.id, finalReason, id]);
        if (updateRes.rowCount === 0) {
            const checkRes = await (0, db_1.query)('SELECT id, status, admin_decision FROM security_incidents WHERE id::text = $1 OR incident_code = $1', [id]);
            if (checkRes.rows.length > 0) {
                res.status(409).json({
                    error: 'INCIDENT_ALREADY_RESOLVED',
                    message: `This incident was already resolved as ${checkRes.rows[0].status} (${checkRes.rows[0].admin_decision}).`,
                });
                return;
            }
            res.status(404).json({ error: 'Security incident not found' });
            return;
        }
        const incident = updateRes.rows[0];
        // Permanently disqualify participant and session
        await (0, db_1.query)(`UPDATE participants SET status = 'DISQUALIFIED', updated_at = NOW() WHERE id = $1`, [incident.participant_id]);
        await (0, db_1.query)(`UPDATE coding_sessions SET status = 'DISQUALIFIED', updated_at = NOW() WHERE id = $1`, [incident.session_id]);
        const pRes = await (0, db_1.query)('SELECT user_id FROM participants WHERE id = $1', [incident.participant_id]);
        const userId = pRes.rows[0]?.user_id;
        // Audit logs
        await (0, db_1.query)(`INSERT INTO audit_logs (actor_id, actor_role, action, target_type, target_id, metadata)
       VALUES ($1, 'ADMIN', 'SECURITY_INCIDENT_REJECTED', 'security_incident', $2, $3)`, [
            req.user.id,
            incident.id,
            JSON.stringify({ incidentCode: incident.incident_code, reason: finalReason }),
        ]);
        await (0, db_1.query)(`INSERT INTO audit_logs (actor_id, actor_role, action, target_type, target_id, metadata)
       VALUES ($1, 'ADMIN', 'PARTICIPANT_DISQUALIFIED', 'participant', $2, $3)`, [
            req.user.id,
            incident.participant_id,
            JSON.stringify({ reason: finalReason, incidentId: incident.id }),
        ]);
        // Socket.IO notifications
        if (userId) {
            (0, socketManager_1.emitToUser)(userId, 'security:declined', {
                incidentId: incident.id,
                incidentCode: incident.incident_code,
                roundId: incident.round_id,
                reason: finalReason,
                participantStatus: 'DISQUALIFIED',
                message: 'Your participation has been terminated by the administrator.',
            });
        }
        (0, socketManager_1.emitToAdmin)('participant:statusChanged', {
            participantId: incident.participant_id,
            status: 'DISQUALIFIED',
            sessionStatus: 'DISQUALIFIED',
        });
        await (0, dashboardController_1.logActivity)({
            activityType: 'PARTICIPANT_DISQUALIFIED',
            actorId: req.user.id,
            actorRole: 'ADMIN',
            actorName: req.user.displayName,
            participantId: incident.participant_id,
            roundId: incident.round_id,
            sessionId: incident.session_id,
            targetType: 'participant',
            targetId: incident.participant_id,
            summary: `Admin declined incident ${incident.incident_code} and disqualified participant.`,
            metadata: { decision: 'DECLINE', reason: finalReason },
        });
        await (0, dashboardController_1.createNotification)({
            notificationType: 'DISQUALIFICATION',
            title: 'Participant Disqualified',
            message: `Participant ${incident.participant_id} was disqualified: ${finalReason}`,
            severity: 'CRITICAL',
            participantId: incident.participant_id,
            roundId: incident.round_id,
            referenceType: 'participant',
            referenceId: incident.participant_id,
        });
        (0, socketManager_1.emitToAdmin)('activity:new', {
            activityType: 'PARTICIPANT_DISQUALIFIED',
            summary: `Admin disqualified participant ${incident.participant_id}`,
            createdAt: new Date().toISOString(),
        });
        (0, socketManager_1.emitToAdmin)('notification:new', {
            title: 'Participant Disqualified',
            message: `Participant ${incident.participant_id} was disqualified`,
            severity: 'CRITICAL',
            createdAt: new Date().toISOString(),
        });
        res.json({
            message: 'Incident declined. Participant disqualified.',
            incident,
        });
    }
    catch (error) {
        console.error('DeclineIncident error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
/**
 * Admin: Get incident statistics breakdown
 */
async function getAdminSecurityStats(req, res) {
    try {
        const totalResult = await (0, db_1.query)('SELECT COUNT(*) as count FROM security_incidents');
        const pendingResult = await (0, db_1.query)("SELECT COUNT(*) as count FROM security_incidents WHERE status = 'PENDING'");
        const acceptedResult = await (0, db_1.query)("SELECT COUNT(*) as count FROM security_incidents WHERE status = 'ACCEPTED'");
        const declinedResult = await (0, db_1.query)("SELECT COUNT(*) as count FROM security_incidents WHERE status = 'DECLINED'");
        const dqResult = await (0, db_1.query)("SELECT COUNT(*) as count FROM participants WHERE status = 'DISQUALIFIED'");
        const typeBreakdown = await (0, db_1.query)(`SELECT incident_type, COUNT(*) as count
       FROM security_incidents
       GROUP BY incident_type
       ORDER BY count DESC`);
        res.json({
            total: parseInt(totalResult.rows[0].count, 10),
            pending: parseInt(pendingResult.rows[0].count, 10),
            accepted: parseInt(acceptedResult.rows[0].count, 10),
            declined: parseInt(declinedResult.rows[0].count, 10),
            disqualifiedParticipants: parseInt(dqResult.rows[0].count, 10),
            byType: typeBreakdown.rows,
        });
    }
    catch (error) {
        console.error('GetAdminSecurityStats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
//# sourceMappingURL=securityController.js.map