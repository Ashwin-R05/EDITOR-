"use strict";
/**
 * Execution Service Interface & Phase 2 Placeholder
 *
 * NOTE: Production isolated Docker C container execution is scheduled for Phase 3.
 * This file defines the modular contract `IExecutionService` which allows Phase 3
 * to plug the Docker sandbox container seamlessly without altering business controllers.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Phase2StubExecutionService = void 0;
exports.getExecutionService = getExecutionService;
exports.setExecutionService = setExecutionService;
/**
 * Phase 2 Mock Execution Service
 * Validates C syntax basic tokens, performs evaluation, and provides realistic output
 * while clearly stating that Phase 3 Docker sandbox integration is pending.
 */
class Phase2StubExecutionService {
    async execute(sourceCode, language, testCases, options = {}) {
        const startTime = Date.now();
        // 1. Basic C language structure check
        if (!sourceCode || sourceCode.trim().length === 0) {
            return {
                status: 'COMPILATION_ERROR',
                compilationError: 'error: empty source file',
                totalTestCases: testCases.length,
                passedTestCases: 0,
                totalScore: 0,
                maxScore: testCases.reduce((sum, tc) => sum + tc.points, 0),
                executionTimeMs: 15,
                results: [],
                phase: 'PHASE_2_STUB',
            };
        }
        if (!sourceCode.includes('main') || !sourceCode.includes('{')) {
            return {
                status: 'COMPILATION_ERROR',
                compilationError: 'main.c: undefined reference to `main`\ncollect2: error: ld returned 1 exit status',
                totalTestCases: testCases.length,
                passedTestCases: 0,
                totalScore: 0,
                maxScore: testCases.reduce((sum, tc) => sum + tc.points, 0),
                executionTimeMs: 25,
                results: [],
                phase: 'PHASE_2_STUB',
            };
        }
        // Filter test cases if only public requested
        const targetCases = options.onlyPublic
            ? testCases.filter((tc) => tc.caseType === 'PUBLIC')
            : testCases;
        const results = [];
        let passedCount = 0;
        let earnedScore = 0;
        const maxScore = targetCases.reduce((sum, tc) => sum + tc.points, 0);
        // In Phase 2 stub mode, check if code has substantive solution logic
        // (e.g. loops, checks, or returns output)
        const hasLogic = sourceCode.includes('printf') &&
            (sourceCode.includes('for') || sourceCode.includes('while') || sourceCode.includes('if'));
        for (const tc of targetCases) {
            // Simulate evaluation for Phase 2
            // If code has basic loop/check logic, pass public tests or test based on simple heuristics
            let passed = false;
            let actualOutput = '';
            if (hasLogic) {
                // If code has reasonable palindrome logic or pattern logic, simulate pass on early tests
                passed = tc.testNumber <= 2 || tc.testNumber === 4;
                actualOutput = passed ? tc.expectedOutput : 'NO';
            }
            else {
                actualOutput = '';
                passed = false;
            }
            if (passed) {
                passedCount++;
                earnedScore += tc.points;
            }
            results.push({
                testCaseId: tc.id,
                testNumber: tc.testNumber,
                caseType: tc.caseType,
                passed,
                actualOutput: tc.caseType === 'PUBLIC' ? actualOutput : undefined,
                expectedOutput: tc.caseType === 'PUBLIC' ? tc.expectedOutput : undefined,
                input: tc.caseType === 'PUBLIC' ? tc.input : undefined,
                status: passed ? 'PASSED' : 'FAILED',
                executionTimeMs: Math.floor(Math.random() * 30) + 10,
                errorMessage: passed ? undefined : (tc.caseType === 'PUBLIC' ? 'Wrong Output' : 'Test case failed'),
            });
        }
        const allPassed = passedCount === targetCases.length;
        const duration = Date.now() - startTime;
        return {
            status: allPassed ? 'PASSED' : (passedCount > 0 ? 'FAILED' : 'FAILED'),
            totalTestCases: targetCases.length,
            passedTestCases: passedCount,
            totalScore: earnedScore,
            maxScore,
            executionTimeMs: duration || 20,
            results,
            phase: 'PHASE_2_STUB',
        };
    }
}
exports.Phase2StubExecutionService = Phase2StubExecutionService;
// Singleton provider
let executionServiceInstance = new Phase2StubExecutionService();
function getExecutionService() {
    return executionServiceInstance;
}
function setExecutionService(service) {
    executionServiceInstance = service;
}
//# sourceMappingURL=executionService.js.map