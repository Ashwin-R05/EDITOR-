"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RemoteExecutionEngineAdapter = exports.DockerExecutionEngineAdapter = void 0;
exports.getExecutionService = getExecutionService;
exports.setExecutionService = setExecutionService;
/**
 * Execution Service Interface & Production Docker Sandbox Architecture
 * Supports both local Docker execution and remote decoupled Execution Microservice.
 */
const config_1 = require("../config");
const execution_service_1 = require("./execution.service");
/**
 * Local Docker Execution Service Adapter
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
/**
 * Remote Decoupled Execution Service Adapter
 * Communicates with a dedicated Docker Execution worker service over HTTPS.
 */
class RemoteExecutionEngineAdapter {
    serviceUrl;
    token;
    constructor(serviceUrl, token) {
        this.serviceUrl = serviceUrl.replace(/\/$/, '');
        this.token = token;
    }
    async execute(sourceCode, language, testCases, options = {}) {
        const endpoint = `${this.serviceUrl}/api/execute`;
        const headers = {
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
            const data = await response.json();
            return {
                ...data,
                phase: 'REMOTE_DOCKER_SERVICE',
            };
        }
        catch (err) {
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
exports.RemoteExecutionEngineAdapter = RemoteExecutionEngineAdapter;
// Select active execution service based on environment configuration
let executionServiceInstance = config_1.config.execution.serviceUrl
    ? new RemoteExecutionEngineAdapter(config_1.config.execution.serviceUrl, config_1.config.execution.serviceToken)
    : new DockerExecutionEngineAdapter();
function getExecutionService() {
    if (config_1.config.execution.serviceUrl && !(executionServiceInstance instanceof RemoteExecutionEngineAdapter)) {
        executionServiceInstance = new RemoteExecutionEngineAdapter(config_1.config.execution.serviceUrl, config_1.config.execution.serviceToken);
    }
    return executionServiceInstance;
}
function setExecutionService(service) {
    executionServiceInstance = service;
}
//# sourceMappingURL=executionService.js.map