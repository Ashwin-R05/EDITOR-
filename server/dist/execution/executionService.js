"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DockerExecutionEngineAdapter = void 0;
exports.getExecutionService = getExecutionService;
exports.setExecutionService = setExecutionService;
/**
 * Execution Service Interface & Phase 3 Production Docker Sandbox
 */
const execution_service_1 = require("./execution.service");
/**
 * Production Phase 3 Docker Execution Service Adapter
 */
class DockerExecutionEngineAdapter {
    engine;
    constructor(engine) {
        this.engine = engine || new execution_service_1.ExecutionService();
    }
    async execute(sourceCode, language, testCases, options = {}) {
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
exports.DockerExecutionEngineAdapter = DockerExecutionEngineAdapter;
// Default to real Phase 3 Docker Engine
let executionServiceInstance = new DockerExecutionEngineAdapter();
function getExecutionService() {
    return executionServiceInstance;
}
function setExecutionService(service) {
    executionServiceInstance = service;
}
//# sourceMappingURL=executionService.js.map