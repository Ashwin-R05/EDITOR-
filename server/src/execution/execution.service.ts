import { DockerService } from './docker.service';
import { CompilerService } from './compiler.service';
import { TestRunnerService } from './test-runner.service';
import {
  ExecutionTestCase,
  TestCaseExecutionResult,
  BatchExecutionResult,
  ExecutionStatus,
  ExecutionOptions
} from './execution.types';

export class ExecutionService {
  private dockerService: DockerService;
  private compilerService: CompilerService;
  private testRunnerService: TestRunnerService;

  constructor(dockerService?: DockerService) {
    this.dockerService = dockerService || new DockerService();
    this.compilerService = new CompilerService(this.dockerService);
    this.testRunnerService = new TestRunnerService(this.dockerService);
  }

  /**
   * Executes untrusted C code inside an isolated Docker sandbox.
   */
  async executeCCode(params: {
    sourceCode: string;
    testCases: ExecutionTestCase[];
    timeLimit?: number;       // in seconds
    memoryLimit?: number;     // in MB
    onlyPublic?: boolean;
  }): Promise<BatchExecutionResult> {
    const { sourceCode, testCases, timeLimit = 3, memoryLimit = 128, onlyPublic = false } = params;
    const overallStartTime = Date.now();

    const targetCases = onlyPublic
      ? testCases.filter((tc) => tc.caseType === 'PUBLIC')
      : testCases;

    const maxScore = targetCases.reduce((sum, tc) => sum + tc.points, 0);

    // 1. Basic validation for empty code
    if (!sourceCode || sourceCode.trim().length === 0) {
      return {
        status: 'COMPILATION_ERROR',
        compilationError: 'error: empty source file',
        totalTestCases: targetCases.length,
        passedTestCases: 0,
        totalScore: 0,
        maxScore,
        executionTimeMs: 10,
        results: [],
        phase: 'PHASE_3_DOCKER_SANDBOX',
      };
    }

    // 2. Create isolated workspace directory for this execution
    let workDir: string | null = null;
    try {
      workDir = await this.dockerService.createWorkspace();

      // 3. Compile source code
      const compileResult = await this.compilerService.compile(workDir, sourceCode);

      if (!compileResult.success) {
        return {
          status: 'COMPILATION_ERROR',
          compilationError: compileResult.error || 'Compilation failed',
          totalTestCases: targetCases.length,
          passedTestCases: 0,
          totalScore: 0,
          maxScore,
          executionTimeMs: compileResult.durationMs,
          results: [],
          phase: 'PHASE_3_DOCKER_SANDBOX',
        };
      }

      // 4. Run test cases
      const testResults = await this.testRunnerService.runTests(workDir, targetCases, {
        timeoutSeconds: timeLimit,
        memoryLimitMb: memoryLimit,
      });

      // 5. Evaluate aggregate results
      let passedCount = 0;
      let earnedScore = 0;
      let totalExecutionDuration = 0;

      for (const res of testResults) {
        totalExecutionDuration += res.executionTimeMs;
        if (res.passed) {
          passedCount++;
          const matchedCase = targetCases.find((tc) => tc.id === res.testCaseId);
          if (matchedCase) earnedScore += matchedCase.points;
        }
      }

      let overallStatus: ExecutionStatus = 'WRONG_ANSWER';
      if (passedCount === targetCases.length && targetCases.length > 0) {
        overallStatus = 'PASSED';
      } else if (passedCount > 0) {
        overallStatus = 'PARTIALLY_PASSED';
      } else {
        // If all failed, check if any threw runtime/timeout errors
        const hasTle = testResults.some((r) => r.status === 'TIME_LIMIT_EXCEEDED');
        const hasOom = testResults.some((r) => r.status === 'MEMORY_LIMIT_EXCEEDED');
        const hasRuntime = testResults.some((r) => r.status === 'RUNTIME_ERROR');

        if (hasTle) overallStatus = 'TIME_LIMIT_EXCEEDED';
        else if (hasOom) overallStatus = 'MEMORY_LIMIT_EXCEEDED';
        else if (hasRuntime) overallStatus = 'RUNTIME_ERROR';
        else overallStatus = 'FAILED';
      }

      return {
        status: overallStatus,
        totalTestCases: targetCases.length,
        passedTestCases: passedCount,
        totalScore: earnedScore,
        maxScore,
        executionTimeMs: Date.now() - overallStartTime,
        results: testResults,
        phase: 'PHASE_3_DOCKER_SANDBOX',
      };
    } catch (error: any) {
      console.error('Fatal execution error:', error);
      return {
        status: 'SYSTEM_ERROR',
        compilationError: 'System error during execution sandbox invocation.',
        totalTestCases: targetCases.length,
        passedTestCases: 0,
        totalScore: 0,
        maxScore,
        executionTimeMs: Date.now() - overallStartTime,
        results: [],
        phase: 'PHASE_3_DOCKER_SANDBOX',
      };
    } finally {
      // 6. Guaranteed workspace cleanup
      if (workDir) {
        await this.dockerService.cleanupWorkspace(workDir);
      }
    }
  }
}
