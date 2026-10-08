"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAdminDashboard = getAdminDashboard;
exports.getParticipants = getParticipants;
exports.getParticipantDetail = getParticipantDetail;
exports.getRounds = getRounds;
exports.startRound = startRound;
exports.pauseRound = pauseRound;
exports.endRound = endRound;
exports.getLeaderboard = getLeaderboard;
exports.getAuditLogs = getAuditLogs;
const db_1 = require("../models/db");
async function getAdminDashboard(req, res) {
    try {
        const totalParticipants = await (0, db_1.query)('SELECT COUNT(*) as count FROM participants');
        const activeParticipants = await (0, db_1.query)("SELECT COUNT(*) as count FROM participants WHERE is_online = true");
        const round1Participants = await (0, db_1.query)("SELECT COUNT(*) as count FROM coding_sessions cs JOIN rounds r ON r.id = cs.round_id WHERE r.round_number = 1 AND cs.status = 'ACTIVE'");
        const round2Participants = await (0, db_1.query)("SELECT COUNT(*) as count FROM coding_sessions cs JOIN rounds r ON r.id = cs.round_id WHERE r.round_number = 2 AND cs.status = 'ACTIVE'");
        const underReview = await (0, db_1.query)("SELECT COUNT(*) as count FROM participants WHERE status = 'UNDER_REVIEW'");
        const disqualified = await (0, db_1.query)("SELECT COUNT(*) as count FROM participants WHERE status = 'DISQUALIFIED'");
        const completed = await (0, db_1.query)("SELECT COUNT(*) as count FROM participants WHERE status = 'COMPLETED'");
        const totalSubmissions = await (0, db_1.query)('SELECT COUNT(*) as count FROM submissions');
        const securityIncidents = await (0, db_1.query)('SELECT COUNT(*) as count FROM security_incidents');
        const pendingIncidents = await (0, db_1.query)("SELECT COUNT(*) as count FROM security_incidents WHERE status = 'PENDING'");
        const rounds = await (0, db_1.query)('SELECT id, round_number, name, status, start_time, end_time FROM rounds ORDER BY round_number');
        res.json({
            stats: {
                totalParticipants: parseInt(totalParticipants.rows[0].count),
                activeParticipants: parseInt(activeParticipants.rows[0].count),
                round1Participants: parseInt(round1Participants.rows[0].count),
                round2Participants: parseInt(round2Participants.rows[0].count),
                underReview: parseInt(underReview.rows[0].count),
                disqualified: parseInt(disqualified.rows[0].count),
                completed: parseInt(completed.rows[0].count),
                totalSubmissions: parseInt(totalSubmissions.rows[0].count),
                securityIncidents: parseInt(securityIncidents.rows[0].count),
                pendingIncidents: parseInt(pendingIncidents.rows[0].count),
            },
            rounds: rounds.rows,
        });
    }
    catch (error) {
        console.error('AdminDashboard error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
async function getParticipants(req, res) {
    try {
        const result = await (0, db_1.query)(`SELECT p.id, p.participant_id, p.status, p.current_round, p.is_online, p.last_seen,
              u.display_name, u.email,
              (SELECT COUNT(*) FROM submissions s WHERE s.participant_id = p.id) as submission_count,
              (SELECT COUNT(*) FROM security_incidents si WHERE si.participant_id = p.id) as incident_count,
              (SELECT COALESCE(SUM(sc.round_score), 0) FROM scores sc WHERE sc.participant_id = p.id) as total_score
       FROM participants p
       JOIN users u ON u.id = p.user_id
       ORDER BY p.participant_id`);
        res.json({ participants: result.rows });
    }
    catch (error) {
        console.error('GetParticipants error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
async function getParticipantDetail(req, res) {
    try {
        const { id } = req.params;
        const participant = await (0, db_1.query)(`SELECT p.*, u.display_name, u.email
       FROM participants p JOIN users u ON u.id = p.user_id
       WHERE p.id = $1`, [id]);
        if (participant.rows.length === 0) {
            res.status(404).json({ error: 'Participant not found' });
            return;
        }
        const sessions = await (0, db_1.query)(`SELECT cs.*, r.name as round_name, r.round_number
       FROM coding_sessions cs
       JOIN rounds r ON r.id = cs.round_id
       WHERE cs.participant_id = $1
       ORDER BY r.round_number`, [id]);
        const submissions = await (0, db_1.query)(`SELECT s.*, r.name as round_name, r.round_number
       FROM submissions s
       JOIN rounds r ON r.id = s.round_id
       WHERE s.participant_id = $1
       ORDER BY s.submitted_at DESC`, [id]);
        const incidents = await (0, db_1.query)(`SELECT si.*, r.name as round_name
       FROM security_incidents si
       JOIN rounds r ON r.id = si.round_id
       WHERE si.participant_id = $1
       ORDER BY si.detected_at DESC`, [id]);
        const scores = await (0, db_1.query)(`SELECT sc.*, r.name as round_name, r.round_number
       FROM scores sc
       JOIN rounds r ON r.id = sc.round_id
       WHERE sc.participant_id = $1`, [id]);
        res.json({
            participant: participant.rows[0],
            sessions: sessions.rows,
            submissions: submissions.rows,
            incidents: incidents.rows,
            scores: scores.rows,
        });
    }
    catch (error) {
        console.error('GetParticipantDetail error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
async function getRounds(req, res) {
    try {
        const result = await (0, db_1.query)(`SELECT r.*,
              (SELECT COUNT(*) FROM coding_sessions cs WHERE cs.round_id = r.id) as session_count,
              (SELECT COUNT(*) FROM submissions s WHERE s.round_id = r.id) as submission_count
       FROM rounds r ORDER BY r.round_number`);
        res.json({ rounds: result.rows });
    }
    catch (error) {
        console.error('GetRounds error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
async function startRound(req, res) {
    try {
        const { id } = req.params;
        const round = await (0, db_1.query)('SELECT * FROM rounds WHERE id = $1', [id]);
        if (round.rows.length === 0) {
            res.status(404).json({ error: 'Round not found' });
            return;
        }
        const r = round.rows[0];
        if (r.status !== 'NOT_STARTED' && r.status !== 'PAUSED') {
            res.status(400).json({ error: `Cannot start round in ${r.status} status` });
            return;
        }
        const now = new Date();
        const endTime = new Date(now.getTime() + r.duration_minutes * 60 * 1000);
        if (r.status === 'NOT_STARTED') {
            await (0, db_1.query)(`UPDATE rounds SET status = 'ACTIVE', start_time = $1, end_time = $2 WHERE id = $3`, [now.toISOString(), endTime.toISOString(), id]);
        }
        else {
            // Resuming from pause
            const pausedMs = r.pause_time ? now.getTime() - new Date(r.pause_time).getTime() : 0;
            const newPausedDuration = (r.paused_duration_seconds || 0) + Math.floor(pausedMs / 1000);
            const newEndTime = new Date(new Date(r.end_time).getTime() + pausedMs);
            await (0, db_1.query)(`UPDATE rounds SET status = 'ACTIVE', pause_time = NULL, paused_duration_seconds = $1, end_time = $2 WHERE id = $3`, [newPausedDuration, newEndTime.toISOString(), id]);
        }
        // Create coding sessions for all participants who don't have one
        const participants = await (0, db_1.query)('SELECT id FROM participants WHERE status != $1', ['DISQUALIFIED']);
        for (const p of participants.rows) {
            await (0, db_1.query)(`INSERT INTO coding_sessions (participant_id, round_id, status, start_time)
         VALUES ($1, $2, 'ACTIVE', $3)
         ON CONFLICT (participant_id, round_id) DO UPDATE SET status = 'ACTIVE', start_time = COALESCE(coding_sessions.start_time, $3)`, [p.id, id, now.toISOString()]);
        }
        // Audit log
        await (0, db_1.query)(`INSERT INTO audit_logs (actor_id, actor_role, action, target_type, target_id, metadata)
       VALUES ($1, $2, 'ROUND_STARTED', 'round', $3, $4)`, [req.user.id, 'ADMIN', id, JSON.stringify({ roundNumber: r.round_number })]);
        res.json({ message: 'Round started', status: 'ACTIVE' });
    }
    catch (error) {
        console.error('StartRound error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
async function pauseRound(req, res) {
    try {
        const { id } = req.params;
        const round = await (0, db_1.query)('SELECT * FROM rounds WHERE id = $1', [id]);
        if (round.rows.length === 0) {
            res.status(404).json({ error: 'Round not found' });
            return;
        }
        if (round.rows[0].status !== 'ACTIVE') {
            res.status(400).json({ error: 'Can only pause active rounds' });
            return;
        }
        await (0, db_1.query)(`UPDATE rounds SET status = 'PAUSED', pause_time = NOW() WHERE id = $1`, [id]);
        await (0, db_1.query)(`INSERT INTO audit_logs (actor_id, actor_role, action, target_type, target_id)
       VALUES ($1, 'ADMIN', 'ROUND_PAUSED', 'round', $2)`, [req.user.id, id]);
        res.json({ message: 'Round paused', status: 'PAUSED' });
    }
    catch (error) {
        console.error('PauseRound error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
async function endRound(req, res) {
    try {
        const { id } = req.params;
        const round = await (0, db_1.query)('SELECT * FROM rounds WHERE id = $1', [id]);
        if (round.rows.length === 0) {
            res.status(404).json({ error: 'Round not found' });
            return;
        }
        await (0, db_1.query)(`UPDATE rounds SET status = 'ENDED', end_time = NOW() WHERE id = $1`, [id]);
        // Mark all active sessions as completed
        await (0, db_1.query)(`UPDATE coding_sessions SET status = 'COMPLETED', end_time = NOW()
       WHERE round_id = $1 AND status IN ('ACTIVE', 'NOT_STARTED')`, [id]);
        await (0, db_1.query)(`INSERT INTO audit_logs (actor_id, actor_role, action, target_type, target_id)
       VALUES ($1, 'ADMIN', 'ROUND_ENDED', 'round', $2)`, [req.user.id, id]);
        res.json({ message: 'Round ended', status: 'ENDED' });
    }
    catch (error) {
        console.error('EndRound error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
async function getLeaderboard(req, res) {
    try {
        const result = await (0, db_1.query)(`SELECT l.*, p.participant_id, u.display_name
       FROM leaderboard l
       JOIN participants p ON p.id = l.participant_id
       JOIN users u ON u.id = p.user_id
       ORDER BY l.total_score DESC, u.display_name ASC`);
        res.json({ leaderboard: result.rows });
    }
    catch (error) {
        console.error('GetLeaderboard error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
async function getAuditLogs(req, res) {
    try {
        const result = await (0, db_1.query)(`SELECT al.*, u.display_name as actor_name, u.email as actor_email
       FROM audit_logs al
       LEFT JOIN users u ON u.id = al.actor_id
       ORDER BY al.created_at DESC
       LIMIT 200`);
        res.json({ logs: result.rows });
    }
    catch (error) {
        console.error('GetAuditLogs error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
//# sourceMappingURL=adminController.js.map