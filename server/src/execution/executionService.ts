/**
 * Execution Service Interface & Production Docker Sandbox Architecture
 * Supports both local Docker execution and remote decoupled Execution Microservice.
 */
import { config } from '../config';
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
  phase: 'PHASE_2_STUB' | 'PHASE_3_DOCKER_SANDBOX' | 'REMOTE_DOCKER_SERVICE';
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
 * Local Docker Execution Service Adapter
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

/**
 * Remote Decoupled Execution Service Adapter
 * Communicates with a dedicated Docker Execution worker service over HTTPS.
 */
export class RemoteExecutionEngineAdapter implements IExecutionService {
  private serviceUrl: string;
  private token?: string;

  constructor(serviceUrl: string, token?: string) {
    this.serviceUrl = serviceUrl.replace(/\/$/, '');
    this.token = token;
  }

  async execute(
    sourceCode: string,
    language: string,
    testCases: ExecutionTestCase[],
    options: { timeoutSeconds?: number; memoryLimitMb?: number; onlyPublic?: boolean } = {}
  ): Promise<ExecutionResult> {
    const endpoint = `${this.serviceUrl}/api/execute`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          sourceCode,
          language,
          testCases,
          options,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Remote execution service error (${response.status}): ${errorText}`);
      }

      const data = await response.json() as ExecutionResult;
      return {
        ...data,
        phase: 'REMOTE_DOCKER_SERVICE',
      };
    } catch (err: any) {
      console.error('Remote execution service failure:', err.message);
      return {
        status: 'RUNTIME_ERROR',
        compilationError: `Execution service unavailable: ${err.message}`,
        totalTestCases: testCases.length,
        passedTestCases: 0,
        totalScore: 0,
        maxScore: testCases.reduce((sum, tc) => sum + tc.points, 0),
        executionTimeMs: 0,
        results: [],
        phase: 'REMOTE_DOCKER_SERVICE',
      };
    }
  }
}

// Select active execution service based on environment configuration
let executionServiceInstance: IExecutionService = config.execution.serviceUrl
  ? new RemoteExecutionEngineAdapter(config.execution.serviceUrl, config.execution.serviceToken)
  : new DockerExecutionEngineAdapter();

export function getExecutionService(): IExecutionService {
  if (config.execution.serviceUrl && !(executionServiceInstance instanceof RemoteExecutionEngineAdapter)) {
    executionServiceInstance = new RemoteExecutionEngineAdapter(
      config.execution.serviceUrl,
      config.execution.serviceToken
    );
  }
  return executionServiceInstance;
}

export function setExecutionService(service: IExecutionService): void {
  executionServiceInstance = service;
}
