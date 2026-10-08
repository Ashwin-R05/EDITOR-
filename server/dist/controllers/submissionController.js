"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSubmission = createSubmission;
exports.getSubmissions = getSubmissions;
exports.getSubmissionDetail = getSubmissionDetail;
const db_1 = require("../models/db");
const executionService_1 = require("../execution/executionService");
const socketManager_1 = require("../websocket/socketManager");
/**
 * Create an immutable submission snapshot and evaluate against all test cases.
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
        // 2. Validate participant status
        if (participant.status === 'DISQUALIFIED') {
            res.status(403).json({ error: 'Participant is disqualified' });
            return;
        }
        if (participant.status === 'UNDER_REVIEW') {
            res.status(403).json({ error: 'Session is under security review' });
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
            res.status(400).json({ error: `Cannot submit: round is ${round.status}` });
            return;
        }
        // 4. Validate session and expiry
        const sResult = await (0, db_1.query)('SELECT id, status, run_count, submission_count, end_time FROM coding_sessions WHERE participant_id = $1 AND round_id = $2', [participant.id, roundId]);
        if (sResult.rows.length === 0) {
            res.status(400).json({ error: 'No active session found for this round' });
            return;
        }
        const session = sResult.rows[0];
        const now = new Date();
        const sessionEnd = new Date(session.end_time);
        if (now > sessionEnd) {
            await (0, db_1.query)("UPDATE coding_sessions SET status = 'COMPLETED' WHERE id = $1", [session.id]);
            res.status(403).json({ error: 'Round time has ended. Submissions are closed.' });
            return;
        }
        // 5. Save code as draft
        await (0, db_1.query)(`INSERT INTO code_drafts (session_id, participant_id, round_id, source_code, language, save_trigger)
       VALUES ($1, $2, $3, $4, $5, 'submit')`, [session.id, participant.id, roundId, sourceCode, language]);
        // 6. Compute new submission number (immutable sequential snapshot)
        const newSubmissionNumber = (session.submission_count || 0) + 1;
        // Update session submission count
        await (0, db_1.query)(`UPDATE coding_sessions SET submission_count = $1, updated_at = NOW() WHERE id = $2`, [newSubmissionNumber, session.id]);
        // 7. Fetch all test cases (both PUBLIC and HIDDEN) for scoring
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
        // 8. Execute code against all test cases via execution layer
        const executionService = (0, executionService_1.getExecutionService)();
        const execResult = await executionService.execute(sourceCode, language, allTestCases, {
            timeoutSeconds: round.time_limit_seconds || 5,
            memoryLimitMb: round.memory_limit_mb || 128,
            onlyPublic: false,
        });
        // 9. Insert immutable submission record into submissions table
        const subInsert = await (0, db_1.query)(`INSERT INTO submissions (
        participant_id, round_id, session_id, submission_number,
        source_code, language, run_count_at_submission,
        test_cases_passed, total_test_cases, execution_status,
        score, validation_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'PENDING')
      RETURNING id, submitted_at`, [
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
            execResult.totalScore,
        ]);
        const submissionId = subInsert.rows[0].id;
        const submittedAt = subInsert.rows[0].submitted_at;
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
        // 12. Broadcast to Admin via Socket.IO
        (0, socketManager_1.emitToAdmin)('submission:created', {
            submissionId,
            submissionNumber: newSubmissionNumber,
            participantId: participant.id,
            participantName: req.user.displayName,
            roundNumber: round.round_number,
            roundName: round.name,
            score: execResult.totalScore,
            testCasesPassed: execResult.passedTestCases,
            totalTestCases: execResult.totalTestCases,
            submittedAt,
        });
        // 13. Return participant-safe response (sanitize hidden test cases!)
        const publicResults = execResult.results.filter((r) => r.caseType === 'PUBLIC');
        res.status(201).json({
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
        const result = await (0, db_1.query)(`SELECT s.id, s.submission_number, s.round_id, s.language,
              s.submitted_at, s.run_count_at_submission,
              s.test_cases_passed, s.total_test_cases,
              s.execution_status, s.score, s.validation_status,
              s.admin_remarks,
              r.name as round_name, r.round_number
       FROM submissions s
       JOIN rounds r ON r.id = s.round_id
       WHERE s.participant_id = $1
       ORDER BY s.submitted_at DESC`, [participantId]);
        res.json({ submissions: result.rows });
    }
    catch (error) {
        console.error('GetSubmissions error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
/**
 * Get exact immutable submission snapshot by ID.
 */
async function getSubmissionDetail(req, res) {
    const { id } = req.params;
    try {
        const pResult = await (0, db_1.query)('SELECT id FROM participants WHERE user_id = $1', [req.user.id]);
        if (pResult.rows.length === 0) {
            res.status(404).json({ error: 'Participant not found' });
            return;
        }
        const participantId = pResult.rows[0].id;
        // Fetch submission ensuring it belongs to this participant
        const sResult = await (0, db_1.query)(`SELECT s.*, r.name as round_name, r.round_number
       FROM submissions s
       JOIN rounds r ON r.id = s.round_id
       WHERE s.id = $1 AND s.participant_id = $2`, [id, participantId]);
        if (sResult.rows.length === 0) {
            res.status(404).json({ error: 'Submission not found' });
            return;
        }
        const submission = sResult.rows[0];
        // Fetch test results for PUBLIC test cases only (keep hidden test cases confidential!)
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
//# sourceMappingURL=submissionController.js.map