"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSubmission = createSubmission;
exports.getSubmissions = getSubmissions;
exports.getSubmissionDetail = getSubmissionDetail;
exports.getAdminSubmissions = getAdminSubmissions;
exports.getAdminSubmissionDetail = getAdminSubmissionDetail;
exports.validateSubmission = validateSubmission;
exports.rejectSubmission = rejectSubmission;
exports.addSubmissionRemark = addSubmissionRemark;
const db_1 = require("../models/db");
const executionService_1 = require("../execution/executionService");
const socketManager_1 = require("../websocket/socketManager");
/**
 * Create an immutable submission snapshot and evaluate against all test cases.
 * Sequential submission numbering per participant per round.
 */
async function createSubmission(req, res) {
    const { roundId, sourceCode, language = 'c' } = req.body;
    if (!roundId || typeof sourceCode !== 'string') {
        res.status(400).json({ error: 'roundId and sourceCode are required' });
        return;
    }
    try {
        // 1. Get participant profile
        const pResult = await (0, db_1.query)('SELECT id, participant_id, status FROM participants WHERE user_id = $1', [req.user.id]);
        if (pResult.rows.length === 0) {
            res.status(404).json({ error: 'Participant not found' });
            return;
        }
        const participant = pResult.rows[0];
        // 2. Validate participant security status
        if (participant.status === 'DISQUALIFIED') {
            res.status(403).json({
                error: 'PARTICIPANT_DISQUALIFIED',
                message: 'Participant is disqualified and cannot submit code.',
            });
            return;
        }
        if (participant.status === 'UNDER_REVIEW') {
            res.status(403).json({
                error: 'SESSION_UNDER_REVIEW',
                message: 'Your session is currently under security review.',
            });
            return;
        }
        // 3. Validate round is ACTIVE
        const rResult = await (0, db_1.query)('SELECT id, round_number, name, status, time_limit_seconds, memory_limit_mb FROM rounds WHERE id = $1', [roundId]);
        if (rResult.rows.length === 0) {
            res.status(404).json({ error: 'Round not found' });
            return;
        }
        const round = rResult.rows[0];
        if (round.status !== 'ACTIVE') {
            res.status(400).json({
                error: 'ROUND_NOT_ACTIVE',
                message: `Cannot submit: round is ${round.status}`,
            });
            return;
        }
        // 4. Validate session and timer expiry
        const sResult = await (0, db_1.query)('SELECT id, status, run_count, submission_count, end_time FROM coding_sessions WHERE participant_id = $1 AND round_id = $2', [participant.id, roundId]);
        if (sResult.rows.length === 0) {
            res.status(400).json({ error: 'No active session found for this round' });
            return;
        }
        const session = sResult.rows[0];
        const now = new Date();
        const sessionEnd = new Date(session.end_time);
        if (now > sessionEnd) {
            await (0, db_1.query)("UPDATE coding_sessions SET status = 'COMPLETED', updated_at = NOW() WHERE id = $1", [session.id]);
            res.status(403).json({
                error: 'ROUND_ENDED',
                message: 'Round time has ended. Submissions are closed.',
            });
            return;
        }
        // 5. Save latest code as draft before submission
        await (0, db_1.query)(`INSERT INTO code_drafts (session_id, participant_id, round_id, source_code, language, save_trigger)
       VALUES ($1, $2, $3, $4, $5, 'submit')`, [session.id, participant.id, roundId, sourceCode, language]);
        // 6. ATOMIC sequential submission numbering per participant per round
        const incResult = await (0, db_1.query)(`UPDATE coding_sessions
       SET submission_count = submission_count + 1, updated_at = NOW()
       WHERE id = $1
       RETURNING submission_count`, [session.id]);
        const newSubmissionNumber = incResult.rows[0].submission_count;
        // 7. Fetch all test cases (both PUBLIC and HIDDEN) for complete scoring
        const probResult = await (0, db_1.query)('SELECT id FROM problems WHERE round_id = $1', [roundId]);
        if (probResult.rows.length === 0) {
            res.status(404).json({ error: 'Problem definition not found' });
            return;
        }
        const problemId = probResult.rows[0].id;
        const tcResult = await (0, db_1.query)(`SELECT id, test_number as "testNumber", input, expected_output as "expectedOutput", case_type as "caseType", points
       FROM test_cases
       WHERE problem_id = $1
       ORDER BY test_number`, [problemId]);
        const allTestCases = tcResult.rows;
        // 8. Execute code against all test cases via Docker execution layer
        const executionService = (0, executionService_1.getExecutionService)();
        const execResult = await executionService.execute(sourceCode, language, allTestCases, {
            timeoutSeconds: round.time_limit_seconds || 5,
            memoryLimitMb: round.memory_limit_mb || 128,
            onlyPublic: false,
        });
        // 9. Insert IMMUTABLE submission record into submissions table
        const subInsert = await (0, db_1.query)(`INSERT INTO submissions (
        participant_id, round_id, session_id, submission_number,
        source_code, language, run_count_at_submission,
        test_cases_passed, total_test_cases, execution_status,
        execution_time_ms, score, validation_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'PENDING_REVIEW')
      RETURNING id, submitted_at, validation_status`, [
            participant.id,
            roundId,
            session.id,
            newSubmissionNumber,
            sourceCode,
            language,
            session.run_count,
            execResult.passedTestCases,
            execResult.totalTestCases,
            execResult.status,
            execResult.executionTimeMs,
            execResult.totalScore,
        ]);
        const submissionId = subInsert.rows[0].id;
        const submittedAt = subInsert.rows[0].submitted_at;
        const validationStatus = subInsert.rows[0].validation_status;
        // 10. Insert individual test results into submission_test_results
        for (const tr of execResult.results) {
            await (0, db_1.query)(`INSERT INTO submission_test_results (
          submission_id, test_case_id, passed, actual_output,
          execution_time_ms, status, error_message
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`, [
                submissionId,
                tr.testCaseId,
                tr.passed,
                tr.actualOutput || null,
                tr.executionTimeMs,
                tr.status,
                tr.errorMessage || null,
            ]);
        }
        // 11. Update participant score (best score) in scores table
        await (0, db_1.query)(`INSERT INTO scores (participant_id, round_id, round_score, test_cases_passed, total_test_cases, best_submission_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (participant_id, round_id) DO UPDATE
       SET round_score = GREATEST(scores.round_score, EXCLUDED.round_score),
           test_cases_passed = CASE WHEN EXCLUDED.round_score > scores.round_score THEN EXCLUDED.test_cases_passed ELSE scores.test_cases_passed END,
           total_test_cases = EXCLUDED.total_test_cases,
           best_submission_id = CASE WHEN EXCLUDED.round_score > scores.round_score THEN EXCLUDED.best_submission_id ELSE scores.best_submission_id END,
           updated_at = NOW()`, [
            participant.id,
            roundId,
            execResult.totalScore,
            execResult.passedTestCases,
            execResult.totalTestCases,
            submissionId,
        ]);
        // 12. Audit log entry for submission creation
        await (0, db_1.query)(`INSERT INTO audit_logs (actor_id, actor_role, action, target_type, target_id, metadata)
       VALUES ($1, 'PARTICIPANT', 'SUBMISSION_CREATED', 'submission', $2, $3)`, [
            req.user.id,
            submissionId,
            JSON.stringify({
                submissionNumber: newSubmissionNumber,
                roundNumber: round.round_number,
                score: execResult.totalScore,
                executionStatus: execResult.status,
                passedTests: execResult.passedTestCases,
                totalTests: execResult.totalTestCases,
            }),
        ]);
        // 13. Broadcast to Admin via Socket.IO
        (0, socketManager_1.emitToAdmin)('submission:created', {
            submissionId,
            submissionNumber: newSubmissionNumber,
            participantId: participant.id,
            participantCode: participant.participant_id,
            participantName: req.user.displayName,
            roundNumber: round.round_number,
            roundName: round.name,
            score: execResult.totalScore,
            testCasesPassed: execResult.passedTestCases,
            totalTestCases: execResult.totalTestCases,
            executionStatus: execResult.status,
            validationStatus,
            submittedAt,
        });
        // 14. Return participant response (preserve hidden test confidentiality)
        const publicResults = execResult.results
            .filter((r) => r.caseType === 'PUBLIC')
            .map((r) => ({
            testNumber: r.testNumber,
            status: r.status,
            passed: r.passed,
            executionTimeMs: r.executionTimeMs,
            input: r.input,
            expectedOutput: r.expectedOutput,
            actualOutput: r.actualOutput,
        }));
        res.status(201).json({
            id: submissionId,
            submissionId,
            submissionNumber: newSubmissionNumber,
            roundNumber: round.round_number,
            roundName: round.name,
            submittedAt,
            executionStatus: execResult.status,
            testCasesPassed: execResult.passedTestCases,
            totalTestCases: execResult.totalTestCases,
            score: execResult.totalScore,
            maxScore: execResult.maxScore,
            validationStatus,
            publicResults,
            message: `Code ${newSubmissionNumber} submitted and evaluated successfully.`,
        });
    }
    catch (error) {
        console.error('CreateSubmission error:', error);
        res.status(500).json({ error: 'Internal server error processing submission' });
    }
}
/**
 * Get submission history for the authenticated participant.
 */
async function getSubmissions(req, res) {
    try {
        const pResult = await (0, db_1.query)('SELECT id FROM participants WHERE user_id = $1', [req.user.id]);
        if (pResult.rows.length === 0) {
            res.status(404).json({ error: 'Participant not found' });
            return;
        }
        const participantId = pResult.rows[0].id;
        const { roundId } = req.query;
        let queryText = `
      SELECT s.id, s.submission_number, s.round_id, s.language,
             s.submitted_at, s.run_count_at_submission,
             s.test_cases_passed, s.total_test_cases,
             s.execution_status, s.execution_time_ms, s.score, s.validation_status,
             s.admin_remarks, s.rejection_reason,
             r.name as round_name, r.round_number
      FROM submissions s
      JOIN rounds r ON r.id = s.round_id
      WHERE s.participant_id = $1
    `;
        const params = [participantId];
        if (roundId) {
            params.push(roundId);
            queryText += ` AND s.round_id = $${params.length}`;
        }
        queryText += ` ORDER BY s.submitted_at DESC`;
        const result = await (0, db_1.query)(queryText, params);
        res.json({ submissions: result.rows });
    }
    catch (error) {
        console.error('GetSubmissions error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
/**
 * Get exact immutable submission snapshot by ID (Participant with ownership verification).
 */
async function getSubmissionDetail(req, res) {
    const { id } = req.params;
    try {
        let participantId = null;
        if (req.user.role === 'PARTICIPANT') {
            const pResult = await (0, db_1.query)('SELECT id FROM participants WHERE user_id = $1', [req.user.id]);
            if (pResult.rows.length === 0) {
                res.status(404).json({ error: 'Participant not found' });
                return;
            }
            participantId = pResult.rows[0].id;
        }
        // Fetch submission with round info
        const sResult = await (0, db_1.query)(`SELECT s.*, r.name as round_name, r.round_number
       FROM submissions s
       JOIN rounds r ON r.id = s.round_id
       WHERE s.id = $1`, [id]);
        if (sResult.rows.length === 0) {
            res.status(404).json({ error: 'Submission not found' });
            return;
        }
        const submission = sResult.rows[0];
        // Ownership check: If PARTICIPANT, verify submission belongs to them!
        if (req.user.role === 'PARTICIPANT' && submission.participant_id !== participantId) {
            res.status(403).json({ error: 'Forbidden: You do not have permission to view this submission' });
            return;
        }
        // Fetch test results (preserve hidden test confidentiality for participants!)
        const trResult = await (0, db_1.query)(`SELECT str.passed, str.actual_output, str.execution_time_ms, str.status, str.error_message,
              tc.test_number, tc.case_type, tc.points,
              CASE WHEN tc.case_type = 'PUBLIC' THEN tc.input ELSE NULL END as input,
              CASE WHEN tc.case_type = 'PUBLIC' THEN tc.expected_output ELSE NULL END as expected_output
       FROM submission_test_results str
       JOIN test_cases tc ON tc.id = str.test_case_id
       WHERE str.submission_id = $1
       ORDER BY tc.test_number`, [id]);
        res.json({
            submission,
            testResults: trResult.rows,
        });
    }
    catch (error) {
        console.error('GetSubmissionDetail error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
/**
 * ============================================================================
 * ADMIN SUBMISSION MANAGEMENT APIs
 * ============================================================================
 */
/**
 * Admin: Get all submissions with filtering and search
 */
async function getAdminSubmissions(req, res) {
    const { roundId, participantId, executionStatus, validationStatus, search, minScore, maxScore, } = req.query;
    try {
        let queryText = `
      SELECT s.id, s.submission_number, s.round_id, s.language,
             s.submitted_at, s.run_count_at_submission,
             s.test_cases_passed, s.total_test_cases,
             s.execution_status, s.execution_time_ms, s.score, s.validation_status,
             s.admin_remarks, s.rejection_reason, s.validated_at,
             u.display_name as participant_name, u.email as participant_email,
             p.id as participant_db_id, p.participant_id as participant_code, p.status as participant_status,
             r.name as round_name, r.round_number,
             v.display_name as validator_name
      FROM submissions s
      JOIN participants p ON p.id = s.participant_id
      JOIN users u ON u.id = p.user_id
      JOIN rounds r ON r.id = s.round_id
      LEFT JOIN users v ON v.id = s.validated_by
      WHERE 1=1
    `;
        const params = [];
        if (roundId) {
            params.push(roundId);
            queryText += ` AND s.round_id = $${params.length}`;
        }
        if (participantId) {
            params.push(participantId);
            queryText += ` AND s.participant_id = $${params.length}`;
        }
        if (executionStatus) {
            params.push(executionStatus);
            queryText += ` AND s.execution_status = $${params.length}`;
        }
        if (validationStatus) {
            params.push(validationStatus);
            queryText += ` AND s.validation_status = $${params.length}`;
        }
        if (minScore !== undefined && minScore !== '') {
            params.push(Number(minScore));
            queryText += ` AND s.score >= $${params.length}`;
        }
        if (maxScore !== undefined && maxScore !== '') {
            params.push(Number(maxScore));
            queryText += ` AND s.score <= $${params.length}`;
        }
        if (search) {
            params.push(`%${search}%`);
            queryText += ` AND (u.display_name ILIKE $${params.length} OR p.participant_id ILIKE $${params.length} OR u.email ILIKE $${params.length})`;
        }
        queryText += ` ORDER BY s.submitted_at DESC`;
        const result = await (0, db_1.query)(queryText, params);
        res.json({ submissions: result.rows });
    }
    catch (error) {
        console.error('GetAdminSubmissions error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
/**
 * Admin: Get detailed submission snapshot including review history and test cases
 */
async function getAdminSubmissionDetail(req, res) {
    const { id } = req.params;
    try {
        // 1. Fetch submission with participant and round metadata
        const sResult = await (0, db_1.query)(`SELECT s.*,
              u.display_name as participant_name, u.email as participant_email,
              p.participant_id as participant_code, p.status as participant_status,
              p.college, p.department, p.year,
              r.name as round_name, r.round_number,
              v.display_name as validator_name
       FROM submissions s
       JOIN participants p ON p.id = s.participant_id
       JOIN users u ON u.id = p.user_id
       JOIN rounds r ON r.id = s.round_id
       LEFT JOIN users v ON v.id = s.validated_by
       WHERE s.id = $1`, [id]);
        if (sResult.rows.length === 0) {
            res.status(404).json({ error: 'Submission not found' });
            return;
        }
        const submission = sResult.rows[0];
        // 2. Fetch test case results
        // Requirement 12: For hidden tests, show only status and execution time. Do NOT reveal hidden input or hidden expected output!
        const trResult = await (0, db_1.query)(`SELECT str.passed, str.execution_time_ms, str.status, str.error_message,
              tc.test_number, tc.case_type, tc.points,
              CASE WHEN tc.case_type = 'PUBLIC' THEN tc.input ELSE NULL END as input,
              CASE WHEN tc.case_type = 'PUBLIC' THEN tc.expected_output ELSE NULL END as expected_output,
              CASE WHEN tc.case_type = 'PUBLIC' THEN str.actual_output ELSE NULL END as actual_output
       FROM submission_test_results str
       JOIN test_cases tc ON tc.id = str.test_case_id
       WHERE str.submission_id = $1
       ORDER BY tc.test_number`, [id]);
        // 3. Fetch review history
        const rhResult = await (0, db_1.query)(`SELECT sr.id, sr.action, sr.previous_status, sr.new_status, sr.remark, sr.created_at,
              u.display_name as admin_name
       FROM submission_reviews sr
       JOIN users u ON u.id = sr.admin_id
       WHERE sr.submission_id = $1
       ORDER BY sr.created_at DESC`, [id]);
        res.json({
            submission,
            testResults: trResult.rows,
            reviewHistory: rhResult.rows,
        });
    }
    catch (error) {
        console.error('GetAdminSubmissionDetail error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
/**
 * Admin: Validate submission
 */
async function validateSubmission(req, res) {
    const { id } = req.params;
    const { remark } = req.body;
    try {
        const sResult = await (0, db_1.query)('SELECT id, validation_status, round_id, participant_id FROM submissions WHERE id = $1', [id]);
        if (sResult.rows.length === 0) {
            res.status(404).json({ error: 'Submission not found' });
            return;
        }
        const submission = sResult.rows[0];
        const previousStatus = submission.validation_status;
        // Update submission
        const updated = await (0, db_1.query)(`UPDATE submissions
       SET validation_status = 'VALIDATED',
           validated_by = $1,
           validated_at = NOW(),
           admin_remarks = COALESCE($2, admin_remarks),
           rejection_reason = NULL
       WHERE id = $3
       RETURNING *`, [req.user.id, remark || null, id]);
        // Record review history
        await (0, db_1.query)(`INSERT INTO submission_reviews (submission_id, admin_id, action, previous_status, new_status, remark)
       VALUES ($1, $2, 'VALIDATE', $3, 'VALIDATED', $4)`, [id, req.user.id, previousStatus, remark || 'Validated by admin']);
        // Record audit log
        await (0, db_1.query)(`INSERT INTO audit_logs (actor_id, actor_role, action, target_type, target_id, metadata)
       VALUES ($1, 'ADMIN', 'SUBMISSION_VALIDATED', 'submission', $2, $3)`, [
            req.user.id,
            id,
            JSON.stringify({ previousStatus, newStatus: 'VALIDATED', remark }),
        ]);
        (0, socketManager_1.emitToAdmin)('submission:validated', {
            submissionId: id,
            validationStatus: 'VALIDATED',
            adminId: req.user.id,
            adminName: req.user.displayName,
            remark,
        });
        res.json({
            message: 'Submission validated successfully',
            submission: updated.rows[0],
        });
    }
    catch (error) {
        console.error('ValidateSubmission error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
/**
 * Admin: Reject submission (Reason required!)
 */
async function rejectSubmission(req, res) {
    const { id } = req.params;
    const { reason, remark } = req.body;
    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
        res.status(400).json({ error: 'Rejection reason is required' });
        return;
    }
    try {
        const sResult = await (0, db_1.query)('SELECT id, validation_status, round_id, participant_id FROM submissions WHERE id = $1', [id]);
        if (sResult.rows.length === 0) {
            res.status(404).json({ error: 'Submission not found' });
            return;
        }
        const submission = sResult.rows[0];
        const previousStatus = submission.validation_status;
        const finalReason = reason.trim();
        // Update submission
        const updated = await (0, db_1.query)(`UPDATE submissions
       SET validation_status = 'REJECTED',
           rejection_reason = $1,
           validated_by = $2,
           validated_at = NOW(),
           admin_remarks = COALESCE($3, $1)
       WHERE id = $4
       RETURNING *`, [finalReason, req.user.id, remark ? remark.trim() : null, id]);
        // Record review history
        await (0, db_1.query)(`INSERT INTO submission_reviews (submission_id, admin_id, action, previous_status, new_status, remark)
       VALUES ($1, $2, 'REJECT', $3, 'REJECTED', $4)`, [id, req.user.id, previousStatus, finalReason]);
        // Record audit log
        await (0, db_1.query)(`INSERT INTO audit_logs (actor_id, actor_role, action, target_type, target_id, metadata)
       VALUES ($1, 'ADMIN', 'SUBMISSION_REJECTED', 'submission', $2, $3)`, [
            req.user.id,
            id,
            JSON.stringify({ previousStatus, newStatus: 'REJECTED', reason: finalReason }),
        ]);
        (0, socketManager_1.emitToAdmin)('submission:rejected', {
            submissionId: id,
            validationStatus: 'REJECTED',
            adminId: req.user.id,
            adminName: req.user.displayName,
            reason: finalReason,
        });
        res.json({
            message: 'Submission rejected successfully',
            submission: updated.rows[0],
        });
    }
    catch (error) {
        console.error('RejectSubmission error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
/**
 * Admin: Add administrative remarks to submission
 */
async function addSubmissionRemark(req, res) {
    const { id } = req.params;
    const { remark } = req.body;
    if (!remark || typeof remark !== 'string' || remark.trim().length === 0) {
        res.status(400).json({ error: 'Remark content is required' });
        return;
    }
    try {
        const sResult = await (0, db_1.query)('SELECT id, validation_status FROM submissions WHERE id = $1', [id]);
        if (sResult.rows.length === 0) {
            res.status(404).json({ error: 'Submission not found' });
            return;
        }
        const submission = sResult.rows[0];
        const finalRemark = remark.trim();
        // Update submission remarks
        const updated = await (0, db_1.query)(`UPDATE submissions
       SET admin_remarks = $1
       WHERE id = $2
       RETURNING *`, [finalRemark, id]);
        // Record in review history
        await (0, db_1.query)(`INSERT INTO submission_reviews (submission_id, admin_id, action, previous_status, new_status, remark)
       VALUES ($1, $2, 'REMARK', $3, $3, $4)`, [id, req.user.id, submission.validation_status, finalRemark]);
        // Record audit log
        await (0, db_1.query)(`INSERT INTO audit_logs (actor_id, actor_role, action, target_type, target_id, metadata)
       VALUES ($1, 'ADMIN', 'SUBMISSION_REMARK_ADDED', 'submission', $2, $3)`, [
            req.user.id,
            id,
            JSON.stringify({ remark: finalRemark, status: submission.validation_status }),
        ]);
        res.json({
            message: 'Remark recorded successfully',
            submission: updated.rows[0],
        });
    }
    catch (error) {
        console.error('AddSubmissionRemark error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
//# sourceMappingURL=submissionController.js.map