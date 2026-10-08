/**
 * Execution Service Interface & Phase 3 Production Docker Sandbox
 */
import { ExecutionService as RealDockerExecutionService } from './execution.service';
import {
  ExecutionTestCase,
  TestCaseExecutionResult,
  BatchExecutionResult,
  ExecutionStatus,
  ExecutionOptions
} from './execution.types';

export { ExecutionTestCase };

export interface TestCaseResult extends TestCaseExecutionResult {}

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
  execute(
    sourceCode: string,
    language: string,
    testCases: ExecutionTestCase[],
    options?: { timeoutSeconds?: number; memoryLimitMb?: number; onlyPublic?: boolean }
  ): Promise<ExecutionResult>;
}

/**
 * Production Phase 3 Docker Execution Service Adapter
 */
export class DockerExecutionEngineAdapter implements IExecutionService {
  private engine: RealDockerExecutionService;

  constructor(engine?: RealDockerExecutionService) {
    this.engine = engine || new RealDockerExecutionService();
  }

  async execute(
    sourceCode: string,
    language: string,
    testCases: ExecutionTestCase[],
    options: { timeoutSeconds?: number; memoryLimitMb?: number; onlyPublic?: boolean } = {}
  ): Promise<ExecutionResult> {
    const res = await this.engine.executeCCode({
      sourceCode,
      testCases,
      timeLimit: options.timeoutSeconds,
      memoryLimit: options.memoryLimitMb,
      onlyPublic: options.onlyPublic,
    });

    return {
      status: res.status,
      compilationError: res.compilationError,
      totalTestCases: res.totalTestCases,
      passedTestCases: res.passedTestCases,
      totalScore: res.totalScore,
      maxScore: res.maxScore,
      executionTimeMs: res.executionTimeMs,
      results: res.results,
      phase: 'PHASE_3_DOCKER_SANDBOX',
    };
  }
}

// Default to real Phase 3 Docker Engine
let executionServiceInstance: IExecutionService = new DockerExecutionEngineAdapter();

export function getExecutionService(): IExecutionService {
  return executionServiceInstance;
}

export function setExecutionService(service: IExecutionService): void {
  executionServiceInstance = service;
}
