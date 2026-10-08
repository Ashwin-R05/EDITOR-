import { Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { config } from '../config';
import { query } from '../models/db';
import { AuthRequest } from '../middleware/auth';

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export const registerParticipantSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  displayName: z.string().min(1),
  participantId: z.string().min(1),
  college: z.string().optional(),
  department: z.string().optional(),
  year: z.number().int().min(1).max(5).optional(),
  phone: z.string().optional(),
});

export async function login(req: AuthRequest, res: Response): Promise<void> {
  const { email, password } = req.body;

  try {
    const result = await query(
      'SELECT id, email, password_hash, role, display_name, is_active FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const user = result.rows[0];

    if (!user.is_active) {
      res.status(403).json({ error: 'Account is deactivated' });
      return;
    }

    const passwordValid = await bcrypt.compare(password, user.password_hash);
    if (!passwordValid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      displayName: user.display_name,
    };

    const token = jwt.sign(tokenPayload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn as any,
    });

    // Audit log
    await query(
      `INSERT INTO audit_logs (actor_id, actor_role, action, target_type, target_id, metadata)
       VALUES ($1, $2, 'LOGIN', 'user', $3, $4)`,
      [user.id, user.role, user.id, JSON.stringify({ email: user.email })]
    );

    // If participant, fetch participant data
    let participantData = null;
    if (user.role === 'PARTICIPANT') {
      const pResult = await query(
        'SELECT id, participant_id, college, department, year, status, current_round FROM participants WHERE user_id = $1',
        [user.id]
      );
      if (pResult.rows.length > 0) {
        participantData = pResult.rows[0];
      }
    }

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        displayName: user.display_name,
      },
      participant: participantData,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getMe(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const result = await query(
      'SELECT id, email, role, display_name, is_active FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const user = result.rows[0];

    let participantData = null;
    if (user.role === 'PARTICIPANT') {
      const pResult = await query(
        'SELECT id, participant_id, college, department, year, status, current_round FROM participants WHERE user_id = $1',
        [user.id]
      );
      if (pResult.rows.length > 0) {
        participantData = pResult.rows[0];
      }
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        displayName: user.display_name,
      },
      participant: participantData,
    });
  } catch (error) {
    console.error('GetMe error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function registerParticipant(req: AuthRequest, res: Response): Promise<void> {
  const { email, password, displayName, participantId, college, department, year, phone } = req.body;

  try {
    // Check if email already exists
    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    // Check if participant ID already exists
    const existingPid = await query('SELECT id FROM participants WHERE participant_id = $1', [participantId]);
    if (existingPid.rows.length > 0) {
      res.status(409).json({ error: 'Participant ID already in use' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const userResult = await query(
      `INSERT INTO users (email, password_hash, role, display_name)
       VALUES ($1, $2, 'PARTICIPANT', $3) RETURNING id`,
      [email, passwordHash, displayName]
    );

    const userId = userResult.rows[0].id;

    await query(
      `INSERT INTO participants (user_id, participant_id, college, department, year, phone)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, participantId, college || null, department || null, year || null, phone || null]
    );

    // Initialize leaderboard entry
    const pResult = await query('SELECT id FROM participants WHERE user_id = $1', [userId]);
    await query(
      'INSERT INTO leaderboard (participant_id) VALUES ($1) ON CONFLICT DO NOTHING',
      [pResult.rows[0].id]
    );

    // Audit log
    await query(
      `INSERT INTO audit_logs (actor_id, actor_role, action, target_type, target_id, metadata)
       VALUES ($1, $2, 'REGISTER_PARTICIPANT', 'participant', $3, $4)`,
      [req.user!.id, req.user!.role, userId, JSON.stringify({ email, participantId })]
    );

    res.status(201).json({
      message: 'Participant registered successfully',
      userId,
      participantId,
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
