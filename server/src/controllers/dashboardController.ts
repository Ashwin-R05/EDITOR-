import { Response } from 'express';
import { query } from '../models/db';
import { AuthRequest } from '../middleware/auth';
import { emitToAdmin, emitToRound } from '../websocket/socketManager';

// =============================================
// ACTIVITY FEED HELPERS
// =============================================

export async function logActivity(params: {
  activityType: string;
  actorId?: string;
  actorRole?: string;
  actorName?: string;
  participantId?: string;
  roundId?: string;
  sessionId?: string;
  targetType?: string;
  targetId?: string;
  summary: string;
  metadata?: any;
}): Promise<void> {
  try {
    await query(
      `INSERT INTO activity_feed (activity_type, actor_id, actor_role, actor_name, participant_id, round_id, session_id, target_type, target_id, summary, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        params.activityType,
        params.actorId || null,
        params.actorRole || null,
        params.actorName || null,
        params.participantId || null,
        params.roundId || null,
        params.sessionId || null,
        params.targetType || null,
        params.targetId || null,
        params.summary,
        JSON.stringify(params.metadata || {}),
      ]
    );
  } catch (err) {
    console.error('logActivity error:', err);
  }
}

export async function createNotification(params: {
  notificationType: string;
  title: string;
  message?: string;
  severity?: string;
  participantId?: string;
  roundId?: string;
  referenceType?: string;
  referenceId?: string;
  metadata?: any;
}): Promise<void> {
  try {
    await query(
      `INSERT INTO admin_notifications (notification_type, title, message, severity, participant_id, round_id, reference_type, reference_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        params.notificationType,
        params.title,
        params.message || null,
        params.severity || 'INFO',
        params.participantId || null,
        params.roundId || null,
        params.referenceType || null,
        params.referenceId || null,
        JSON.stringify(params.metadata || {}),
      ]
    );
  } catch (err) {
    console.error('createNotification error:', err);
  }
}

// =============================================
// DASHBOARD STATS (single efficient query)
// =============================================

export async function getDashboardStats(req: AuthRequest, res: Response): Promise<void> {
  try {
    // Run all stats in a single efficient query using subqueries
    const statsResult = await query(`
      SELECT
        (SELECT COUNT(*) FROM participants) as total_participants,
        (SELECT COUNT(*) FROM participants WHERE is_online = true) as active_participants,
        (SELECT COUNT(*) FROM participants WHERE status = 'UNDER_REVIEW') as under_review,
        (SELECT COUNT(*) FROM participants WHERE status = 'DISQUALIFIED') as disqualified,
        (SELECT COUNT(*) FROM participants WHERE status = 'COMPLETED') as completed,
        (SELECT COUNT(*) FROM coding_sessions WHERE status = 'ACTIVE') as active_sessions,
        (SELECT COUNT(*) FROM submissions) as total_submissions,
        (SELECT COUNT(*) FROM security_incidents) as total_incidents,
        (SELECT COUNT(*) FROM security_incidents WHERE status = 'PENDING') as pending_incidents,
        (SELECT COUNT(*) FROM admin_notifications WHERE is_read = false) as unread_notifications
    `);

    const s = statsResult.rows[0];

    // Get active round info
    const activeRound = await query(
      `SELECT r.*, 
        (SELECT COUNT(*) FROM coding_sessions cs WHERE cs.round_id = r.id AND cs.status = 'ACTIVE') as active_count,
        (SELECT COUNT(*) FROM coding_sessions cs WHERE cs.round_id = r.id AND cs.status = 'COMPLETED') as completed_count,
        (SELECT COUNT(*) FROM coding_sessions cs JOIN participants p ON p.id = cs.participant_id WHERE cs.round_id = r.id AND p.status = 'UNDER_REVIEW') as review_count,
        (SELECT COUNT(*) FROM coding_sessions cs JOIN participants p ON p.id = cs.participant_id WHERE cs.round_id = r.id AND p.status = 'DISQUALIFIED') as disqualified_count
       FROM rounds r
       WHERE r.status = 'ACTIVE'
       ORDER BY r.round_number
       LIMIT 1`
    );

    // Get all rounds summary
    const rounds = await query(
      `SELECT r.id, r.round_number, r.name, r.description, r.status, r.duration_minutes, r.run_limit,
              r.start_time, r.end_time, r.pause_time, r.paused_duration_seconds,
              (SELECT COUNT(*) FROM coding_sessions cs WHERE cs.round_id = r.id) as session_count,
              (SELECT COUNT(*) FROM coding_sessions cs WHERE cs.round_id = r.id AND cs.status = 'ACTIVE') as active_count,
              (SELECT COUNT(*) FROM submissions s WHERE s.round_id = r.id) as submission_count
       FROM rounds r ORDER BY r.round_number`
    );

    res.json({
      stats: {
        totalParticipants: parseInt(s.total_participants),
        activeParticipants: parseInt(s.active_participants),
        underReview: parseInt(s.under_review),
        disqualified: parseInt(s.disqualified),
        completed: parseInt(s.completed),
        activeSessions: parseInt(s.active_sessions),
        totalSubmissions: parseInt(s.total_submissions),
        totalIncidents: parseInt(s.total_incidents),
        pendingIncidents: parseInt(s.pending_incidents),
        unreadNotifications: parseInt(s.unread_notifications),
      },
      activeRound: activeRound.rows.length > 0 ? activeRound.rows[0] : null,
      rounds: rounds.rows,
    });
  } catch (error) {
    console.error('getDashboardStats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// =============================================
// PARTICIPANTS LIST (paginated, searchable, filterable)
// =============================================

export async function getParticipantsList(req: AuthRequest, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 25, 100);
    const offset = (page - 1) * limit;
    const search = (req.query.search as string) || '';
    const statusFilter = (req.query.status as string) || '';
    const roundFilter = (req.query.round as string) || '';
    const securityFilter = (req.query.security as string) || '';

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIdx = 1;

    if (search) {
      whereClause += ` AND (u.display_name ILIKE $${paramIdx} OR p.participant_id ILIKE $${paramIdx} OR u.email ILIKE $${paramIdx})`;
      params.push(`%${search}%`);
      paramIdx++;
    }

    if (statusFilter && statusFilter !== 'ALL') {
      if (statusFilter === 'DISCONNECTED') {
        whereClause += ` AND p.is_online = false`;
      } else {
        whereClause += ` AND p.status = $${paramIdx}`;
        params.push(statusFilter);
        paramIdx++;
      }
    }

    if (roundFilter) {
      whereClause += ` AND p.current_round = $${paramIdx}`;
      params.push(parseInt(roundFilter));
      paramIdx++;
    }

    // Count total
    const countResult = await query(
      `SELECT COUNT(*) FROM participants p JOIN users u ON u.id = p.user_id ${whereClause}`,
      params
    );
    const totalCount = parseInt(countResult.rows[0].count);

    // Fetch participants with session data
    const result = await query(
      `SELECT p.id, p.participant_id, p.status, p.current_round, p.is_online,
              p.last_seen, p.last_heartbeat,
              u.display_name, u.email,
              cs.status as session_status, cs.run_count, cs.submission_count as session_submissions,
              cs.start_time as session_start, cs.end_time as session_end,
              r.round_number as active_round_number, r.name as round_name,
              (SELECT COUNT(*) FROM submissions s WHERE s.participant_id = p.id) as total_submissions,
              (SELECT COUNT(*) FROM security_incidents si WHERE si.participant_id = p.id AND si.status = 'PENDING') as pending_incidents,
              (SELECT COALESCE(SUM(sc.round_score), 0) FROM scores sc WHERE sc.participant_id = p.id) as total_score
       FROM participants p
       JOIN users u ON u.id = p.user_id
       LEFT JOIN LATERAL (
         SELECT cs2.* FROM coding_sessions cs2 
         JOIN rounds r2 ON r2.id = cs2.round_id AND r2.status IN ('ACTIVE', 'PAUSED')
         WHERE cs2.participant_id = p.id
         ORDER BY r2.round_number DESC LIMIT 1
       ) cs ON true
       LEFT JOIN rounds r ON r.id = cs.round_id
       ${whereClause}
       ORDER BY p.participant_id
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, limit, offset]
    );

    res.json({
      participants: result.rows,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error('getParticipantsList error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// =============================================
// PARTICIPANT DETAIL (comprehensive)
// =============================================

export async function getParticipantProfile(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const participant = await query(
      `SELECT p.*, u.display_name, u.email, u.created_at as registered_at
       FROM participants p JOIN users u ON u.id = p.user_id
       WHERE p.id = $1`,
      [id]
    );

    if (participant.rows.length === 0) {
      res.status(404).json({ error: 'Participant not found' });
      return;
    }

    const sessions = await query(
      `SELECT cs.*, r.name as round_name, r.round_number, r.run_limit, r.status as round_status
       FROM coding_sessions cs
       JOIN rounds r ON r.id = cs.round_id
       WHERE cs.participant_id = $1
       ORDER BY r.round_number`,
      [id]
    );

    const submissions = await query(
      `SELECT s.id, s.submission_number, s.submitted_at, s.test_cases_passed, s.total_test_cases,
              s.execution_status, s.score, s.validation_status,
              r.name as round_name, r.round_number
       FROM submissions s
       JOIN rounds r ON r.id = s.round_id
       WHERE s.participant_id = $1
       ORDER BY s.submitted_at DESC
       LIMIT 20`,
      [id]
    );

    const incidents = await query(
      `SELECT si.id, si.incident_type, si.status, si.detected_at, si.incident_code, si.severity,
              r.name as round_name
       FROM security_incidents si
       JOIN rounds r ON r.id = si.round_id
       WHERE si.participant_id = $1
       ORDER BY si.detected_at DESC
       LIMIT 20`,
      [id]
    );

    const scores = await query(
      `SELECT sc.*, r.name as round_name, r.round_number
       FROM scores sc
       JOIN rounds r ON r.id = sc.round_id
       WHERE sc.participant_id = $1`,
      [id]
    );

    // Get latest draft timestamp
    const latestDraft = await query(
      `SELECT cd.created_at as draft_time, r.name as round_name
       FROM code_drafts cd
       JOIN rounds r ON r.id = cd.round_id
       WHERE cd.participant_id = $1
       ORDER BY cd.created_at DESC LIMIT 1`,
      [id]
    );

    // Connection status
    const p = participant.rows[0];
    const heartbeatAge = p.last_heartbeat
      ? Math.floor((Date.now() - new Date(p.last_heartbeat).getTime()) / 1000)
      : null;
    const connectionStatus = p.is_online
      ? heartbeatAge !== null && heartbeatAge < 60
        ? 'CONNECTED'
        : 'STALE'
      : 'DISCONNECTED';

    // Security summary
    const securitySummary = await query(
      `SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'PENDING') as pending,
        COUNT(*) FILTER (WHERE status = 'ACCEPTED') as accepted,
        COUNT(*) FILTER (WHERE status = 'DECLINED') as declined
       FROM security_incidents WHERE participant_id = $1`,
      [id]
    );

    res.json({
      participant: {
        ...p,
        connectionStatus,
        heartbeatAge,
      },
      sessions: sessions.rows,
      submissions: submissions.rows,
      incidents: incidents.rows,
      scores: scores.rows,
      securitySummary: securitySummary.rows[0],
      latestDraft: latestDraft.rows[0] || null,
    });
  } catch (error) {
    console.error('getParticipantProfile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// =============================================
// ACTIVITY FEED (paginated)
// =============================================

export async function getActivityFeed(req: AuthRequest, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT af.*
       FROM activity_feed af
       ORDER BY af.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const countResult = await query('SELECT COUNT(*) FROM activity_feed');
    const total = parseInt(countResult.rows[0].count);

    res.json({
      activities: result.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('getActivityFeed error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// =============================================
// NOTIFICATIONS
// =============================================

export async function getNotifications(req: AuthRequest, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 30, 100);
    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT n.*, p.participant_id as participant_code, u.display_name as participant_name
       FROM admin_notifications n
       LEFT JOIN participants p ON p.id = n.participant_id
       LEFT JOIN users u ON u.id = p.user_id
       ORDER BY n.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const unreadCount = await query(
      'SELECT COUNT(*) FROM admin_notifications WHERE is_read = false'
    );

    res.json({
      notifications: result.rows,
      unreadCount: parseInt(unreadCount.rows[0].count),
      pagination: { page, limit },
    });
  } catch (error) {
    console.error('getNotifications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function markNotificationRead(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    await query('UPDATE admin_notifications SET is_read = true WHERE id = $1', [id]);
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('markNotificationRead error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function markAllNotificationsRead(req: AuthRequest, res: Response): Promise<void> {
  try {
    await query('UPDATE admin_notifications SET is_read = true WHERE is_read = false');
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('markAllNotificationsRead error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// =============================================
// ROUND CONTROL (enhanced with Socket.IO + activity logging)
// =============================================

export async function startRoundControlled(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const round = await query('SELECT * FROM rounds WHERE id = $1', [id]);
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

    let effectiveEndTime: Date;
    const isResume = r.status === 'PAUSED';

    if (r.status === 'NOT_STARTED') {
      effectiveEndTime = endTime;
      await query(
        `UPDATE rounds SET status = 'ACTIVE', start_time = $1, end_time = $2 WHERE id = $3`,
        [now.toISOString(), endTime.toISOString(), id]
      );
    } else {
      const pausedMs = r.pause_time ? now.getTime() - new Date(r.pause_time).getTime() : 0;
      const newPausedDuration = (r.paused_duration_seconds || 0) + Math.floor(pausedMs / 1000);
      effectiveEndTime = new Date(new Date(r.end_time).getTime() + pausedMs);

      await query(
        `UPDATE rounds SET status = 'ACTIVE', pause_time = NULL, paused_duration_seconds = $1, end_time = $2 WHERE id = $3`,
        [newPausedDuration, effectiveEndTime.toISOString(), id]
      );
    }

    // Create/update sessions for all eligible participants
    const participants = await query('SELECT id FROM participants WHERE status != $1', ['DISQUALIFIED']);
    for (const p of participants.rows) {
      await query(
        `INSERT INTO coding_sessions (participant_id, round_id, status, start_time, end_time)
         VALUES ($1, $2, 'ACTIVE', $3, $4)
         ON CONFLICT (participant_id, round_id) DO UPDATE SET status = 'ACTIVE', start_time = COALESCE(coding_sessions.start_time, $3), end_time = $4`,
        [p.id, id, now.toISOString(), effectiveEndTime.toISOString()]
      );
    }

    // Audit log
    await query(
      `INSERT INTO audit_logs (actor_id, actor_role, action, target_type, target_id, metadata)
       VALUES ($1, $2, $3, 'round', $4, $5)`,
      [req.user!.id, 'ADMIN', isResume ? 'ROUND_RESUMED' : 'ROUND_STARTED', id, JSON.stringify({ roundNumber: r.round_number, roundName: r.name })]
    );

    // Activity log
    const actType = isResume ? 'ROUND_RESUMED' : 'ROUND_STARTED';
    await logActivity({
      activityType: actType,
      actorId: req.user!.id,
      actorRole: 'ADMIN',
      actorName: req.user!.displayName,
      roundId: id,
      summary: `${req.user!.displayName} ${isResume ? 'resumed' : 'started'} Round ${r.round_number} — ${r.name}`,
      metadata: { roundNumber: r.round_number },
    });

    // Notification
    await createNotification({
      notificationType: actType,
      title: `Round ${r.round_number} ${isResume ? 'Resumed' : 'Started'}`,
      message: `${r.name} is now active.`,
      severity: 'INFO',
      roundId: id,
      referenceType: 'round',
      referenceId: id,
    });

    // Socket.IO broadcasts
    const eventName = isResume ? 'round:resumed' : 'round:started';
    emitToAdmin(eventName, {
      roundId: id,
      roundNumber: r.round_number,
      roundName: r.name,
      status: 'ACTIVE',
      endTime: effectiveEndTime.toISOString(),
      timestamp: now.toISOString(),
    });

    emitToRound(id, eventName, {
      roundId: id,
      roundNumber: r.round_number,
      status: 'ACTIVE',
      endTime: effectiveEndTime.toISOString(),
      timestamp: now.toISOString(),
    });

    // Also emit to all participants in case they haven't joined the round room yet
    const { getIO } = require('../websocket/socketManager');
    const io = getIO();
    io.to('role:participant').emit(eventName, {
      roundId: id,
      roundNumber: r.round_number,
      status: 'ACTIVE',
      endTime: effectiveEndTime.toISOString(),
      timestamp: now.toISOString(),
    });

    // Emit activity for live feed
    emitToAdmin('activity:new', {
      activityType: actType,
      actorName: req.user!.displayName,
      summary: `${req.user!.displayName} ${isResume ? 'resumed' : 'started'} Round ${r.round_number}`,
      timestamp: now.toISOString(),
    });

    res.json({
      message: isResume ? 'Round resumed' : 'Round started',
      status: 'ACTIVE',
      endTime: effectiveEndTime.toISOString(),
    });
  } catch (error) {
    console.error('startRoundControlled error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function pauseRoundControlled(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const round = await query('SELECT * FROM rounds WHERE id = $1', [id]);
    if (round.rows.length === 0) {
      res.status(404).json({ error: 'Round not found' });
      return;
    }

    const r = round.rows[0];
    if (r.status !== 'ACTIVE') {
      res.status(400).json({ error: 'Can only pause active rounds' });
      return;
    }

    await query(
      `UPDATE rounds SET status = 'PAUSED', pause_time = NOW() WHERE id = $1`,
      [id]
    );

    // Audit log
    await query(
      `INSERT INTO audit_logs (actor_id, actor_role, action, target_type, target_id)
       VALUES ($1, 'ADMIN', 'ROUND_PAUSED', 'round', $2)`,
      [req.user!.id, id]
    );

    await logActivity({
      activityType: 'ROUND_PAUSED',
      actorId: req.user!.id,
      actorRole: 'ADMIN',
      actorName: req.user!.displayName,
      roundId: id,
      summary: `${req.user!.displayName} paused Round ${r.round_number} — ${r.name}`,
    });

    await createNotification({
      notificationType: 'ROUND_PAUSED',
      title: `Round ${r.round_number} Paused`,
      message: `${r.name} has been paused by admin.`,
      severity: 'WARNING',
      roundId: id,
    });

    // Socket.IO broadcasts
    emitToAdmin('round:paused', {
      roundId: id,
      roundNumber: r.round_number,
      roundName: r.name,
      status: 'PAUSED',
      timestamp: new Date().toISOString(),
    });

    emitToRound(id, 'round:paused', {
      roundId: id,
      roundNumber: r.round_number,
      status: 'PAUSED',
      timestamp: new Date().toISOString(),
    });

    const { getIO } = require('../websocket/socketManager');
    const io = getIO();
    io.to('role:participant').emit('round:paused', {
      roundId: id,
      roundNumber: r.round_number,
      status: 'PAUSED',
      timestamp: new Date().toISOString(),
    });

    emitToAdmin('activity:new', {
      activityType: 'ROUND_PAUSED',
      actorName: req.user!.displayName,
      summary: `${req.user!.displayName} paused Round ${r.round_number}`,
      timestamp: new Date().toISOString(),
    });

    res.json({ message: 'Round paused', status: 'PAUSED' });
  } catch (error) {
    console.error('pauseRoundControlled error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function resumeRoundControlled(req: AuthRequest, res: Response): Promise<void> {
  // Delegate to start handler (which handles PAUSED → ACTIVE)
  return startRoundControlled(req, res);
}

export async function endRoundControlled(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const round = await query('SELECT * FROM rounds WHERE id = $1', [id]);
    if (round.rows.length === 0) {
      res.status(404).json({ error: 'Round not found' });
      return;
    }

    const r = round.rows[0];
    if (r.status === 'ENDED' || r.status === 'NOT_STARTED') {
      res.status(400).json({ error: `Cannot end round in ${r.status} status` });
      return;
    }

    // End the round
    await query(
      `UPDATE rounds SET status = 'ENDED', end_time = NOW() WHERE id = $1`,
      [id]
    );

    // Mark all active sessions as completed
    await query(
      `UPDATE coding_sessions SET status = 'COMPLETED', end_time = NOW()
       WHERE round_id = $1 AND status IN ('ACTIVE', 'NOT_STARTED')`,
      [id]
    );

    // Audit
    await query(
      `INSERT INTO audit_logs (actor_id, actor_role, action, target_type, target_id)
       VALUES ($1, 'ADMIN', 'ROUND_ENDED', 'round', $2)`,
      [req.user!.id, id]
    );

    await logActivity({
      activityType: 'ROUND_ENDED',
      actorId: req.user!.id,
      actorRole: 'ADMIN',
      actorName: req.user!.displayName,
      roundId: id,
      summary: `${req.user!.displayName} ended Round ${r.round_number} — ${r.name}`,
    });

    await createNotification({
      notificationType: 'ROUND_ENDED',
      title: `Round ${r.round_number} Ended`,
      message: `${r.name} has been concluded.`,
      severity: 'INFO',
      roundId: id,
    });

    // Socket.IO broadcasts
    emitToAdmin('round:ended', {
      roundId: id,
      roundNumber: r.round_number,
      roundName: r.name,
      status: 'ENDED',
      timestamp: new Date().toISOString(),
    });

    emitToRound(id, 'round:ended', {
      roundId: id,
      roundNumber: r.round_number,
      status: 'ENDED',
      timestamp: new Date().toISOString(),
    });

    const { getIO } = require('../websocket/socketManager');
    const io = getIO();
    io.to('role:participant').emit('round:ended', {
      roundId: id,
      roundNumber: r.round_number,
      status: 'ENDED',
      timestamp: new Date().toISOString(),
    });

    emitToAdmin('activity:new', {
      activityType: 'ROUND_ENDED',
      actorName: req.user!.displayName,
      summary: `${req.user!.displayName} ended Round ${r.round_number}`,
      timestamp: new Date().toISOString(),
    });

    res.json({ message: 'Round ended', status: 'ENDED' });
  } catch (error) {
    console.error('endRoundControlled error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
