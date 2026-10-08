/**
 * Execution Service Interface & Phase 3 Production Docker Sandbox
 */
import { ExecutionService as RealDockerExecutionService } from './execution.service';
import { ExecutionTestCase, TestCaseExecutionResult, ExecutionStatus } from './execution.types';
export { ExecutionTestCase };
export interface TestCaseResult extends TestCaseExecutionResult {
}
export interface ExecutionResult {
    status: ExecutionStatus;
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
 * Production Phase 3 Docker Execution Service Adapter
 */
export declare class DockerExecutionEngineAdapter implements IExecutionService {
    private engine;
    constructor(engine?: RealDockerExecutionService);
    execute(sourceCode: string, language: string, testCases: ExecutionTestCase[], options?: {
        timeoutSeconds?: number;
        memoryLimitMb?: number;
        onlyPublic?: boolean;
    }): Promise<ExecutionResult>;
}
export declare function getExecutionService(): IExecutionService;
export declare function setExecutionService(service: IExecutionService): void;
//# sourceMappingURL=executionService.d.ts.map