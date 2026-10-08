"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runCode = runCode;
const db_1 = require("../models/db");
const executionService_1 = require("../execution/executionService");
async function runCode(req, res) {
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
        // 2. Verify participant status
        if (participant.status === 'DISQUALIFIED') {
            res.status(403).json({ error: 'Participant is disqualified', status: 'DISQUALIFIED' });
            return;
        }
        if (participant.status === 'UNDER_REVIEW') {
            res.status(403).json({ error: 'Session is currently under security review', status: 'UNDER_REVIEW' });
            return;
        }
        // 3. Verify round is ACTIVE
        const rResult = await (0, db_1.query)('SELECT id, round_number, name, status, run_limit, time_limit_seconds, memory_limit_mb FROM rounds WHERE id = $1', [roundId]);
        if (rResult.rows.length === 0) {
            res.status(404).json({ error: 'Round not found' });
            return;
        }
        const round = rResult.rows[0];
        if (round.status !== 'ACTIVE') {
            res.status(400).json({ error: `Cannot execute code: round is currently ${round.status}` });
            return;
        }
        // 4. Verify session and check remaining time
        const sResult = await (0, db_1.query)('SELECT id, status, run_count, start_time, end_time FROM coding_sessions WHERE participant_id = $1 AND round_id = $2', [participant.id, roundId]);
        if (sResult.rows.length === 0) {
            res.status(400).json({ error: 'No active session found. Please enter the round first.' });
            return;
        }
        const session = sResult.rows[0];
        const now = new Date();
        const sessionEnd = new Date(session.end_time);
        if (now > sessionEnd) {
            await (0, db_1.query)("UPDATE coding_sessions SET status = 'COMPLETED' WHERE id = $1", [session.id]);
            res.status(403).json({ error: 'Round time has ended. Code execution is disabled.' });
            return;
        }
        // 5. Verify run count server-side
        const currentRunCount = session.run_count || 0;
        const maxRuns = round.run_limit || 5;
        if (currentRunCount >= maxRuns) {
            res.status(400).json({
                error: `Run limit reached. Maximum ${maxRuns} runs permitted per round. Submit your solution directly.`,
                runCount: currentRunCount,
                maxRuns,
                runLimitReached: true,
            });
            return;
        }
        // 6. Save code as draft
        await (0, db_1.query)(`INSERT INTO code_drafts (session_id, participant_id, round_id, source_code, language, save_trigger)
       VALUES ($1, $2, $3, $4, $5, 'run')`, [session.id, participant.id, roundId, sourceCode, language]);
        // 7. Increment run count server-side (authoritative!)
        const updatedSession = await (0, db_1.query)(`UPDATE coding_sessions SET run_count = run_count + 1, updated_at = NOW() WHERE id = $1 RETURNING run_count`, [session.id]);
        const newRunCount = updatedSession.rows[0].run_count;
        const remainingRuns = Math.max(0, maxRuns - newRunCount);
        // 8. Fetch test cases for this problem (PUBLIC ONLY for Run!)
        const probResult = await (0, db_1.query)('SELECT id FROM problems WHERE round_id = $1', [roundId]);
        if (probResult.rows.length === 0) {
            res.status(404).json({ error: 'Problem definition not found for this round' });
            return;
        }
        const problemId = probResult.rows[0].id;
        const tcResult = await (0, db_1.query)(`SELECT id, test_number as "testNumber", input, expected_output as "expectedOutput", case_type as "caseType", points
       FROM test_cases
       WHERE problem_id = $1 AND case_type = 'PUBLIC'
       ORDER BY test_number`, [problemId]);
        const publicTestCases = tcResult.rows;
        // 9. Execute code via execution service
        const executionService = (0, executionService_1.getExecutionService)();
        const result = await executionService.execute(sourceCode, language, publicTestCases, {
            timeoutSeconds: round.time_limit_seconds || 5,
            memoryLimitMb: round.memory_limit_mb || 128,
            onlyPublic: true,
        });
        res.json({
            status: result.status,
            compilationError: result.compilationError,
            totalTestCases: result.totalTestCases,
            passedTestCases: result.passedTestCases,
            executionTimeMs: result.executionTimeMs,
            results: result.results,
            runCount: newRunCount,
            maxRuns,
            remainingRuns,
            runLimitReached: remainingRuns <= 0,
            phase: result.phase,
        });
    }
    catch (error) {
        console.error('RunCode error:', error);
        res.status(500).json({ error: 'Internal server error executing code' });
    }
}
//# sourceMappingURL=codeRunController.js.map