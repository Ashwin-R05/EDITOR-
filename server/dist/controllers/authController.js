"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerParticipantSchema = exports.loginSchema = void 0;
exports.login = login;
exports.getMe = getMe;
exports.registerParticipant = registerParticipant;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const zod_1 = require("zod");
const config_1 = require("../config");
const db_1 = require("../models/db");
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().min(1, 'Email or username is required'),
    password: zod_1.z.string().min(1, 'Password is required'),
});
exports.registerParticipantSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6, 'Password must be at least 6 characters'),
    displayName: zod_1.z.string().min(1),
    participantId: zod_1.z.string().min(1),
    college: zod_1.z.string().optional(),
    department: zod_1.z.string().optional(),
    year: zod_1.z.number().int().min(1).max(5).optional(),
    phone: zod_1.z.string().optional(),
});
async function login(req, res) {
    const { email, password } = req.body;
    try {
        const trimmedInput = email.trim();
        const result = await (0, db_1.query)(`SELECT u.id, u.email, u.password_hash, u.role, u.display_name, u.is_active 
       FROM users u
       LEFT JOIN participants p ON p.user_id = u.id
       WHERE LOWER(u.email) = LOWER($1) 
          OR LOWER(u.display_name) = LOWER($1) 
          OR LOWER(p.participant_id) = LOWER($1)
       LIMIT 1`, [trimmedInput]);
        if (result.rows.length === 0) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }
        const user = result.rows[0];
        if (!user.is_active) {
            res.status(403).json({ error: 'Account is deactivated' });
            return;
        }
        const passwordValid = await bcrypt_1.default.compare(password, user.password_hash);
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
        const token = jsonwebtoken_1.default.sign(tokenPayload, config_1.config.jwt.secret, {
            expiresIn: config_1.config.jwt.expiresIn,
        });
        // Audit log
        await (0, db_1.query)(`INSERT INTO audit_logs (actor_id, actor_role, action, target_type, target_id, metadata)
       VALUES ($1, $2, 'LOGIN', 'user', $3, $4)`, [user.id, user.role, user.id, JSON.stringify({ email: user.email })]);
        // If participant, fetch participant data
        let participantData = null;
        if (user.role === 'PARTICIPANT') {
            const pResult = await (0, db_1.query)('SELECT id, participant_id, college, department, year, status, current_round FROM participants WHERE user_id = $1', [user.id]);
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
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
async function getMe(req, res) {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }
        const result = await (0, db_1.query)('SELECT id, email, role, display_name, is_active FROM users WHERE id = $1', [req.user.id]);
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        const user = result.rows[0];
        let participantData = null;
        if (user.role === 'PARTICIPANT') {
            const pResult = await (0, db_1.query)('SELECT id, participant_id, college, department, year, status, current_round FROM participants WHERE user_id = $1', [user.id]);
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
    }
    catch (error) {
        console.error('GetMe error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
async function registerParticipant(req, res) {
    const { email, password, displayName, participantId, college, department, year, phone } = req.body;
    try {
        // Check if email already exists
        const existingUser = await (0, db_1.query)('SELECT id FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            res.status(409).json({ error: 'Email already registered' });
            return;
        }
        // Check if participant ID already exists
        const existingPid = await (0, db_1.query)('SELECT id FROM participants WHERE participant_id = $1', [participantId]);
        if (existingPid.rows.length > 0) {
            res.status(409).json({ error: 'Participant ID already in use' });
            return;
        }
        const passwordHash = await bcrypt_1.default.hash(password, 12);
        const userResult = await (0, db_1.query)(`INSERT INTO users (email, password_hash, role, display_name)
       VALUES ($1, $2, 'PARTICIPANT', $3) RETURNING id`, [email, passwordHash, displayName]);
        const userId = userResult.rows[0].id;
        await (0, db_1.query)(`INSERT INTO participants (user_id, participant_id, college, department, year, phone)
       VALUES ($1, $2, $3, $4, $5, $6)`, [userId, participantId, college || null, department || null, year || null, phone || null]);
        // Initialize leaderboard entry
        const pResult = await (0, db_1.query)('SELECT id FROM participants WHERE user_id = $1', [userId]);
        await (0, db_1.query)('INSERT INTO leaderboard (participant_id) VALUES ($1) ON CONFLICT DO NOTHING', [pResult.rows[0].id]);
        // Audit log
        await (0, db_1.query)(`INSERT INTO audit_logs (actor_id, actor_role, action, target_type, target_id, metadata)
       VALUES ($1, $2, 'REGISTER_PARTICIPANT', 'participant', $3, $4)`, [req.user.id, req.user.role, userId, JSON.stringify({ email, participantId })]);
        res.status(201).json({
            message: 'Participant registered successfully',
            userId,
            participantId,
        });
    }
    catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
//# sourceMappingURL=authController.js.map