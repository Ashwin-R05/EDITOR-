import { Response } from 'express';
import { query } from '../models/db';
import { AuthRequest } from '../middleware/auth';

/**
 * Retrieve the latest code draft for the authenticated participant and given round.
 * Falls back to the problem starter code if no draft has been saved yet.
 */
export async function getDraft(req: AuthRequest, res: Response): Promise<void> {
  const { roundId } = req.params;

  try {
    const pResult = await query(
      'SELECT id FROM participants WHERE user_id = $1',
      [req.user!.id]
    );

    if (pResult.rows.length === 0) {
      res.status(404).json({ error: 'Participant not found' });
      return;
    }

    const participantId = pResult.rows[0].id;

    // 1. Try to get latest saved draft
    const draftResult = await query(
      `SELECT source_code, language, save_trigger, created_at
       FROM code_drafts
       WHERE participant_id = $1 AND round_id = $2
       ORDER BY created_at DESC
       LIMIT 1`,
      [participantId, roundId]
    );

    if (draftResult.rows.length > 0) {
      const draft = draftResult.rows[0];
      res.json({
        sourceCode: draft.source_code,
        language: draft.language || 'c',
        lastSavedAt: draft.created_at,
        isDraft: true,
        saveTrigger: draft.save_trigger,
      });
      return;
    }

    // 2. Fall back to problem starter code
    const problemResult = await query(
      'SELECT starter_code, allowed_language FROM problems WHERE round_id = $1',
      [roundId]
    );

    const starterCode =
      problemResult.rows[0]?.starter_code ||
      '#include <stdio.h>\n\nint main() {\n    // Write your C solution here\n    return 0;\n}\n';

    res.json({
      sourceCode: starterCode,
      language: problemResult.rows[0]?.allowed_language || 'c',
      lastSavedAt: null,
      isDraft: false,
      saveTrigger: 'initial_starter',
    });
  } catch (error) {
    console.error('GetDraft error:', error);
    res.status(500).json({ error: 'Internal server error retrieving draft' });
  }
}

/**
 * Save code draft for the authenticated participant and given round.
 * Validates session is active and not expired before saving.
 */
export async function saveDraft(req: AuthRequest, res: Response): Promise<void> {
  const { roundId } = req.params;
  const { sourceCode, language = 'c', saveTrigger = 'autosave' } = req.body;

  if (typeof sourceCode !== 'string') {
    res.status(400).json({ error: 'sourceCode string is required' });
    return;
  }

  try {
    const pResult = await query(
      'SELECT id, status FROM participants WHERE user_id = $1',
      [req.user!.id]
    );

    if (pResult.rows.length === 0) {
      res.status(404).json({ error: 'Participant not found' });
      return;
    }

    const participant = pResult.rows[0];

    if (participant.status === 'DISQUALIFIED') {
      res.status(403).json({ error: 'Participant is disqualified' });
      return;
    }

    // Check session
    const sResult = await query(
      'SELECT id, status, end_time FROM coding_sessions WHERE participant_id = $1 AND round_id = $2',
      [participant.id, roundId]
    );

    let sessionId: string;
    if (sResult.rows.length === 0) {
      // Auto-create session if within active round
      const rResult = await query('SELECT status, duration_minutes FROM rounds WHERE id = $1', [roundId]);
      if (rResult.rows.length === 0 || rResult.rows[0].status !== 'ACTIVE') {
        res.status(400).json({ error: 'Cannot save draft for inactive round' });
        return;
      }
      const now = new Date();
      const endTime = new Date(now.getTime() + rResult.rows[0].duration_minutes * 60 * 1000);
      const newSession = await query(
        `INSERT INTO coding_sessions (participant_id, round_id, status, start_time, end_time)
         VALUES ($1, $2, 'ACTIVE', $3, $4) RETURNING id`,
        [participant.id, roundId, now.toISOString(), endTime.toISOString()]
      );
      sessionId = newSession.rows[0].id;
    } else {
      const session = sResult.rows[0];
      sessionId = session.id;

      // Check if session has expired
      const now = new Date();
      const sessionEnd = new Date(session.end_time);
      if (now > sessionEnd) {
        // Mark session completed
        await query("UPDATE coding_sessions SET status = 'COMPLETED' WHERE id = $1", [sessionId]);
        res.status(403).json({ error: 'Session has expired. Draft cannot be saved.' });
        return;
      }
    }

    // Insert new draft record
    const insertResult = await query(
      `INSERT INTO code_drafts (session_id, participant_id, round_id, source_code, language, save_trigger)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, created_at`,
      [sessionId, participant.id, roundId, sourceCode, language, saveTrigger]
    );

    res.json({
      success: true,
      draftId: insertResult.rows[0].id,
      savedAt: insertResult.rows[0].created_at,
      saveTrigger,
    });
  } catch (error) {
    console.error('SaveDraft error:', error);
    res.status(500).json({ error: 'Internal server error saving draft' });
  }
}
