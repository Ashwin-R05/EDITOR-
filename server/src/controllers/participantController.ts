import { Response } from 'express';
import { query } from '../models/db';
import { AuthRequest } from '../middleware/auth';

export async function getProfile(req: AuthRequest, res: Response): Promise<void> {
  try {
    const result = await query(
      `SELECT p.id, p.participant_id, p.college, p.department, p.year, p.phone,
              p.status, p.current_round, p.is_online, p.last_seen,
              u.display_name, u.email
       FROM participants p
       JOIN users u ON u.id = p.user_id
       WHERE u.id = $1`,
      [req.user!.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Participant not found' });
      return;
    }

    res.json({ participant: result.rows[0] });
  } catch (error) {
    console.error('GetProfile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getDashboard(req: AuthRequest, res: Response): Promise<void> {
  try {
    const participant = await query(
      `SELECT p.id, p.participant_id, p.status, p.current_round,
              u.display_name
       FROM participants p JOIN users u ON u.id = p.user_id
       WHERE u.id = $1`,
      [req.user!.id]
    );

    if (participant.rows.length === 0) {
      res.status(404).json({ error: 'Participant not found' });
      return;
    }

    const p = participant.rows[0];

    // Get rounds
    const rounds = await query(
      `SELECT id, round_number, name, description, status, duration_minutes, run_limit
       FROM rounds ORDER BY round_number`,
      []
    );

    // Get coding sessions for this participant
    const sessions = await query(
      `SELECT cs.id, cs.round_id, cs.status, cs.run_count, cs.submission_count, cs.start_time, cs.end_time
       FROM coding_sessions cs
       WHERE cs.participant_id = $1`,
      [p.id]
    );

    // Get scores
    const scores = await query(
      `SELECT s.round_id, s.round_score, s.test_cases_passed, s.total_test_cases
       FROM scores s
       WHERE s.participant_id = $1`,
      [p.id]
    );

    // Get security incidents count
    const incidents = await query(
      `SELECT COUNT(*) as count FROM security_incidents WHERE participant_id = $1`,
      [p.id]
    );

    // Get submission count
    const submissions = await query(
      `SELECT COUNT(*) as count FROM submissions WHERE participant_id = $1`,
      [p.id]
    );

    res.json({
      participant: p,
      rounds: rounds.rows,
      sessions: sessions.rows,
      scores: scores.rows,
      securityIncidents: parseInt(incidents.rows[0].count),
      totalSubmissions: parseInt(submissions.rows[0].count),
    });
  } catch (error) {
    console.error('GetDashboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getActiveRound(req: AuthRequest, res: Response): Promise<void> {
  try {
    const result = await query(
      `SELECT id, round_number, name, description, status, duration_minutes, run_limit,
              time_limit_seconds, memory_limit_mb, start_time, end_time
       FROM rounds WHERE status = 'ACTIVE' LIMIT 1`
    );

    if (result.rows.length === 0) {
      res.json({ round: null });
      return;
    }

    res.json({ round: result.rows[0] });
  } catch (error) {
    console.error('GetActiveRound error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getRound(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const round = await query(
      `SELECT id, round_number, name, description, status, duration_minutes, run_limit,
              time_limit_seconds, memory_limit_mb, start_time, end_time
       FROM rounds WHERE id = $1`,
      [id]
    );

    if (round.rows.length === 0) {
      res.status(404).json({ error: 'Round not found' });
      return;
    }

    const r = round.rows[0];

    // Check participant profile and status
    const pResult = await query(
      'SELECT id, participant_id, status FROM participants WHERE user_id = $1',
      [req.user!.id]
    );

    if (pResult.rows.length === 0) {
      res.status(404).json({ error: 'Participant not found' });
      return;
    }

    const participant = pResult.rows[0];

    if (participant.status === 'DISQUALIFIED') {
      res.status(403).json({ error: 'You are disqualified from the event', status: 'DISQUALIFIED' });
      return;
    }

    if (participant.status === 'UNDER_REVIEW') {
      res.status(403).json({ error: 'Session is locked under security review', status: 'UNDER_REVIEW' });
      return;
    }

    // STRICT ACCESS CONTROL: Only allow problem loading if round is ACTIVE
    if (r.status !== 'ACTIVE') {
      const messages: Record<string, string> = {
        NOT_STARTED: `Round ${r.round_number} (${r.name}) has not started yet. Waiting for administrator activation.`,
        PAUSED: `Round ${r.round_number} is currently paused.`,
        ENDED: `Round ${r.round_number} has concluded.`,
      };
      res.status(403).json({
        error: messages[r.status] || 'Round is not active',
        roundStatus: r.status,
        round: {
          id: r.id,
          round_number: r.round_number,
          name: r.name,
          status: r.status,
          duration_minutes: r.duration_minutes,
        },
      });
      return;
    }

    // Get problem definition
    const problemResult = await query(
      `SELECT id, title, statement, input_format, output_format, constraints, examples, starter_code
       FROM problems WHERE round_id = $1`,
      [id]
    );

    const problem = problemResult.rows.length > 0 ? problemResult.rows[0] : null;

    // Get public test cases only (HIDDEN test cases are strictly excluded)
    let testCases: any[] = [];
    if (problem) {
      const tcResult = await query(
        `SELECT id, test_number as "testNumber", input, expected_output as "expectedOutput", case_type as "caseType", points
         FROM test_cases WHERE problem_id = $1 AND case_type = 'PUBLIC'
         ORDER BY test_number`,
        [problem.id]
      );
      testCases = tcResult.rows;
    }

    // Get or initialize session for this participant
    const now = new Date();
    const roundEndTime = r.end_time ? new Date(r.end_time) : new Date(now.getTime() + r.duration_minutes * 60 * 1000);

    const sResult = await query(
      `SELECT id, status, run_count, submission_count, start_time, end_time
       FROM coding_sessions WHERE participant_id = $1 AND round_id = $2`,
      [participant.id, id]
    );

    let session;
    if (sResult.rows.length === 0) {
      const newSession = await query(
        `INSERT INTO coding_sessions (participant_id, round_id, status, start_time, end_time, run_count, submission_count)
         VALUES ($1, $2, 'ACTIVE', $3, $4, 0, 0)
         RETURNING id, status, run_count, submission_count, start_time, end_time`,
        [participant.id, id, now.toISOString(), roundEndTime.toISOString()]
      );
      session = newSession.rows[0];
    } else {
      session = sResult.rows[0];
      const sessionEnd = new Date(session.end_time);
      if (now > sessionEnd && session.status !== 'COMPLETED') {
        await query("UPDATE coding_sessions SET status = 'COMPLETED' WHERE id = $1", [session.id]);
        session.status = 'COMPLETED';
      }
    }

    // Compute remaining time server-authoritatively
    const sessionEnd = new Date(session.end_time);
    const remainingSeconds = Math.max(0, Math.floor((sessionEnd.getTime() - now.getTime()) / 1000));

    res.json({
      round: r,
      problem,
      testCases,
      session,
      timer: {
        serverTime: now.toISOString(),
        startTime: session.start_time,
        endTime: session.end_time,
        remainingSeconds,
        isExpired: remainingSeconds <= 0,
      },
    });
  } catch (error) {
    console.error('GetRound error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
