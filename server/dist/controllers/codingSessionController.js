"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enterSession = enterSession;
exports.getSession = getSession;
const db_1 = require("../models/db");
/**
 * Enter or retrieve a participant's coding session for a given round.
 * Validates participant state, round status, and calculates server-authoritative timer.
 */
async function enterSession(req, res) {
    const { roundId } = req.params;
    try {
        // 1. Get participant profile
        const pResult = await (0, db_1.query)('SELECT id, participant_id, status FROM participants WHERE user_id = $1', [req.user.id]);
        if (pResult.rows.length === 0) {
            res.status(404).json({ error: 'Participant record not found' });
            return;
        }
        const participant = pResult.rows[0];
        // 2. Check participant security status
        if (participant.status === 'DISQUALIFIED') {
            res.status(403).json({
                error: 'You have been disqualified from the event by the administrator.',
                status: 'DISQUALIFIED',
            });
            return;
        }
        if (participant.status === 'UNDER_REVIEW') {
            res.status(403).json({
                error: 'Your session is temporarily locked for security review.',
                status: 'UNDER_REVIEW',
            });
            return;
        }
        // 3. Check round exists and is ACTIVE
        const rResult = await (0, db_1.query)('SELECT id, round_number, name, status, duration_minutes, run_limit, start_time, end_time FROM rounds WHERE id = $1', [roundId]);
        if (rResult.rows.length === 0) {
            res.status(404).json({ error: 'Round not found' });
            return;
        }
        const round = rResult.rows[0];
        if (round.status !== 'ACTIVE') {
            const messages = {
                NOT_STARTED: `Round ${round.round_number} (${round.name}) has not started yet. Waiting for administrator activation.`,
                PAUSED: `Round ${round.round_number} is currently paused by the administrator.`,
                ENDED: `Round ${round.round_number} has concluded.`,
            };
            res.status(403).json({
                error: messages[round.status] || 'Round is not active.',
                roundStatus: round.status,
            });
            return;
        }
        // 4. Determine authoritative session end time
        // If the round has an official end_time, use it; otherwise compute based on duration
        const now = new Date();
        const roundEndTime = round.end_time ? new Date(round.end_time) : new Date(now.getTime() + round.duration_minutes * 60 * 1000);
        // 5. Check if session already exists
        const sResult = await (0, db_1.query)('SELECT * FROM coding_sessions WHERE participant_id = $1 AND round_id = $2', [participant.id, roundId]);
        let session;
        if (sResult.rows.length === 0) {
            // Create new session
            const insertResult = await (0, db_1.query)(`INSERT INTO coding_sessions (participant_id, round_id, status, start_time, end_time, run_count, submission_count)
         VALUES ($1, $2, 'ACTIVE', $3, $4, 0, 0)
         RETURNING *`, [participant.id, roundId, now.toISOString(), roundEndTime.toISOString()]);
            session = insertResult.rows[0];
            // Update participant's current round
            await (0, db_1.query)('UPDATE participants SET current_round = $1 WHERE id = $2', [round.round_number, participant.id]);
        }
        else {
            session = sResult.rows[0];
            // Check if session end time has expired
            const sessionEnd = new Date(session.end_time);
            if (now > sessionEnd && session.status !== 'COMPLETED') {
                await (0, db_1.query)("UPDATE coding_sessions SET status = 'COMPLETED', updated_at = NOW() WHERE id = $1", [session.id]);
                session.status = 'COMPLETED';
            }
        }
        // Compute remaining seconds server-authoritatively
        const sessionEnd = new Date(session.end_time);
        const remainingSeconds = Math.max(0, Math.floor((sessionEnd.getTime() - now.getTime()) / 1000));
        res.json({
            session,
            round: {
                id: round.id,
                round_number: round.round_number,
                name: round.name,
                duration_minutes: round.duration_minutes,
                run_limit: round.run_limit,
            },
            timer: {
                serverTime: now.toISOString(),
                startTime: session.start_time,
                endTime: session.end_time,
                remainingSeconds,
                isExpired: remainingSeconds <= 0,
            },
        });
    }
    catch (error) {
        console.error('EnterSession error:', error);
        res.status(500).json({ error: 'Internal server error entering session' });
    }
}
/**
 * Get current session state by roundId.
 */
async function getSession(req, res) {
    const { roundId } = req.params;
    try {
        const pResult = await (0, db_1.query)('SELECT id FROM participants WHERE user_id = $1', [req.user.id]);
        if (pResult.rows.length === 0) {
            res.status(404).json({ error: 'Participant not found' });
            return;
        }
        const participantId = pResult.rows[0].id;
        const sResult = await (0, db_1.query)('SELECT * FROM coding_sessions WHERE participant_id = $1 AND round_id = $2', [participantId, roundId]);
        if (sResult.rows.length === 0) {
            res.status(404).json({ error: 'No active session found for this round' });
            return;
        }
        const session = sResult.rows[0];
        const now = new Date();
        const sessionEnd = new Date(session.end_time);
        const remainingSeconds = Math.max(0, Math.floor((sessionEnd.getTime() - now.getTime()) / 1000));
        res.json({
            session,
            serverTime: now.toISOString(),
            remainingSeconds,
            isExpired: remainingSeconds <= 0,
        });
    }
    catch (error) {
        console.error('GetSession error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
//# sourceMappingURL=codingSessionController.js.map