import { DockerService } from './docker.service';
import { ExecutionTestCase, TestCaseExecutionResult } from './execution.types';

export class TestRunnerService {
  constructor(private dockerService: DockerService) {}

  /**
   * Normalizes program output and expected output for fair comparison
   * (handles CRLF/LF and trailing whitespace differences).
   */
  private normalizeOutput(str: string): string {
    if (!str) return '';
    return str
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .split('\n')
      .map((line) => line.trimEnd())
      .join('\n')
      .trim();
  }

  /**
   * Runs the compiled binary in the isolated workspace against all provided test cases.
   */
  async runTests(
    workDir: string,
    testCases: ExecutionTestCase[],
    options: { timeoutSeconds?: number; memoryLimitMb?: number } = {}
  ): Promise<TestCaseExecutionResult[]> {
    const timeoutMs = (options.timeoutSeconds || 3) * 1000;
    const memoryLimitMb = options.memoryLimitMb || 128;

    const results: TestCaseExecutionResult[] = [];

    for (const tc of testCases) {
      const execResult = await this.dockerService.executeBinary(
        workDir,
        tc.input,
        timeoutMs,
        memoryLimitMb
      );

      let status: TestCaseExecutionResult['status'] = 'WRONG_ANSWER';
      let passed = false;
      let errorMessage: string | undefined;

      if (execResult.timedOut) {
        status = 'TIME_LIMIT_EXCEEDED';
        errorMessage = `Time Limit Exceeded (>${options.timeoutSeconds || 3}s)`;
      } else if (execResult.memoryExceeded) {
        status = 'MEMORY_LIMIT_EXCEEDED';
        errorMessage = `Memory Limit Exceeded (>${memoryLimitMb}MB)`;
      } else if (execResult.outputExceeded) {
        status = 'OUTPUT_LIMIT_EXCEEDED';
        errorMessage = 'Output Limit Exceeded (Output buffer capped at 64KB)';
      } else if (execResult.exitCode !== 0) {
        status = 'RUNTIME_ERROR';
        // Sanitize any stderr to avoid leaking paths
        const cleanStderr = (execResult.stderr || '')
          .replace(/\/sandbox\/work\//g, '')
          .replace(/\/sandbox\//g, '')
          .trim();
        errorMessage = cleanStderr || `Runtime Error (Exit Code ${execResult.exitCode})`;
      } else {
        const normActual = this.normalizeOutput(execResult.stdout);
        const normExpected = this.normalizeOutput(tc.expectedOutput);

        if (normActual === normExpected) {
          status = 'PASSED';
          passed = true;
        } else {
          status = 'WRONG_ANSWER';
          errorMessage = 'Output did not match expected output';
        }
      }

      // Security: Strictly protect HIDDEN test cases
      const isPublic = tc.caseType === 'PUBLIC';

      results.push({
        testCaseId: tc.id,
        testNumber: tc.testNumber,
        caseType: tc.caseType,
        passed,
        actualOutput: isPublic ? execResult.stdout : undefined,
        expectedOutput: isPublic ? tc.expectedOutput : undefined,
        input: isPublic ? tc.input : undefined,
        status,
        executionTimeMs: execResult.durationMs,
        errorMessage,
      });
    }

    return results;
  }
}
