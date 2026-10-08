import { DockerService } from './docker.service';
import { ExecutionTestCase, TestCaseExecutionResult } from './execution.types';
export declare class TestRunnerService {
    private dockerService;
    constructor(dockerService: DockerService);
    /**
     * Normalizes program output and expected output for fair comparison
     * (handles CRLF/LF and trailing whitespace differences).
     */
    private normalizeOutput;
    /**
     * Runs the compiled binary in the isolated workspace against all provided test cases.
     */
    runTests(workDir: string, testCases: ExecutionTestCase[], options?: {
        timeoutSeconds?: number;
        memoryLimitMb?: number;
    }): Promise<TestCaseExecutionResult[]>;
}
//# sourceMappingURL=test-runner.service.d.ts.map