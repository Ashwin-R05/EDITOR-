export type ExecutionStatus =
  | 'PASSED'
  | 'FAILED'
  | 'WRONG_ANSWER'
  | 'PARTIALLY_PASSED'
  | 'COMPILATION_ERROR'
  | 'RUNTIME_ERROR'
  | 'TIME_LIMIT_EXCEEDED'
  | 'MEMORY_LIMIT_EXCEEDED'
  | 'OUTPUT_LIMIT_EXCEEDED'
  | 'SYSTEM_ERROR';

export interface ExecutionTestCase {
  id: string;
  testNumber: number;
  input: string;
  expectedOutput: string;
  caseType: 'PUBLIC' | 'HIDDEN';
  points: number;
}

export interface TestCaseExecutionResult {
  testCaseId: string;
  testNumber: number;
  caseType: 'PUBLIC' | 'HIDDEN';
  passed: boolean;
  actualOutput?: string;
  expectedOutput?: string; // Only provided for PUBLIC test cases
  input?: string;          // Only provided for PUBLIC test cases
  status: 'PASSED' | 'FAILED' | 'WRONG_ANSWER' | 'RUNTIME_ERROR' | 'TIME_LIMIT_EXCEEDED' | 'MEMORY_LIMIT_EXCEEDED' | 'OUTPUT_LIMIT_EXCEEDED';
  executionTimeMs: number;
  errorMessage?: string;
}

export interface CompilationResult {
  success: boolean;
  error?: string;
  durationMs: number;
}

export interface ProgramExecutionResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
  timedOut: boolean;
  memoryExceeded: boolean;
  outputExceeded: boolean;
  error?: string;
}

export interface ExecutionOptions {
  timeoutSeconds?: number;
  memoryLimitMb?: number;
  onlyPublic?: boolean;
}

export interface BatchExecutionResult {
  status: ExecutionStatus;
  compilationError?: string;
  totalTestCases: number;
  passedTestCases: number;
  totalScore: number;
  maxScore: number;
  executionTimeMs: number;
  results: TestCaseExecutionResult[];
  phase: 'PHASE_3_DOCKER_SANDBOX';
}
