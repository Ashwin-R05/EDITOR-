import { DockerService } from './docker.service';
import { ExecutionTestCase, BatchExecutionResult } from './execution.types';
export declare class ExecutionService {
    private dockerService;
    private compilerService;
    private testRunnerService;
    constructor(dockerService?: DockerService);
    /**
     * Executes untrusted C code inside an isolated Docker sandbox.
     */
    executeCCode(params: {
        sourceCode: string;
        testCases: ExecutionTestCase[];
        timeLimit?: number;
        memoryLimit?: number;
        onlyPublic?: boolean;
    }): Promise<BatchExecutionResult>;
}
//# sourceMappingURL=execution.service.d.ts.map