/**
 * Execution Service Interface & Phase 2 Placeholder
 *
 * NOTE: Production isolated Docker C container execution is scheduled for Phase 3.
 * This file defines the modular contract `IExecutionService` which allows Phase 3
 * to plug the Docker sandbox container seamlessly without altering business controllers.
 */
export interface ExecutionTestCase {
    id: string;
    testNumber: number;
    input: string;
    expectedOutput: string;
    caseType: 'PUBLIC' | 'HIDDEN';
    points: number;
}
export interface TestCaseResult {
    testCaseId: string;
    testNumber: number;
    caseType: 'PUBLIC' | 'HIDDEN';
    passed: boolean;
    actualOutput?: string;
    expectedOutput?: string;
    input?: string;
    status: 'PASSED' | 'FAILED' | 'COMPILATION_ERROR' | 'RUNTIME_ERROR' | 'TIME_LIMIT_EXCEEDED';
    executionTimeMs: number;
    errorMessage?: string;
}
export interface ExecutionResult {
    status: 'PASSED' | 'FAILED' | 'COMPILATION_ERROR' | 'RUNTIME_ERROR' | 'TIME_LIMIT_EXCEEDED';
    compilationError?: string;
    totalTestCases: number;
    passedTestCases: number;
    totalScore: number;
    maxScore: number;
    executionTimeMs: number;
    results: TestCaseResult[];
    phase: 'PHASE_2_STUB' | 'PHASE_3_DOCKER_SANDBOX';
}
export interface IExecutionService {
    execute(sourceCode: string, language: string, testCases: ExecutionTestCase[], options?: {
        timeoutSeconds?: number;
        memoryLimitMb?: number;
        onlyPublic?: boolean;
    }): Promise<ExecutionResult>;
}
/**
 * Phase 2 Mock Execution Service
 * Validates C syntax basic tokens, performs evaluation, and provides realistic output
 * while clearly stating that Phase 3 Docker sandbox integration is pending.
 */
export declare class Phase2StubExecutionService implements IExecutionService {
    execute(sourceCode: string, language: string, testCases: ExecutionTestCase[], options?: {
        timeoutSeconds?: number;
        memoryLimitMb?: number;
        onlyPublic?: boolean;
    }): Promise<ExecutionResult>;
}
export declare function getExecutionService(): IExecutionService;
export declare function setExecutionService(service: IExecutionService): void;
//# sourceMappingURL=executionService.d.ts.map