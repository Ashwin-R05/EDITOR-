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
    phase: 'PHASE_2_STUB' | 'PHASE_3_DOCKER_SANDBOX' | 'REMOTE_DOCKER_SERVICE';
}
export interface IExecutionService {
    execute(sourceCode: string, language: string, testCases: ExecutionTestCase[], options?: {
        timeoutSeconds?: number;
        memoryLimitMb?: number;
        onlyPublic?: boolean;
    }): Promise<ExecutionResult>;
}
/**
 * Local Docker Execution Service Adapter
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
/**
 * Remote Decoupled Execution Service Adapter
 * Communicates with a dedicated Docker Execution worker service over HTTPS.
 */
export declare class RemoteExecutionEngineAdapter implements IExecutionService {
    private serviceUrl;
    private token?;
    constructor(serviceUrl: string, token?: string);
    execute(sourceCode: string, language: string, testCases: ExecutionTestCase[], options?: {
        timeoutSeconds?: number;
        memoryLimitMb?: number;
        onlyPublic?: boolean;
    }): Promise<ExecutionResult>;
}
export declare function getExecutionService(): IExecutionService;
export declare function setExecutionService(service: IExecutionService): void;
//# sourceMappingURL=executionService.d.ts.map