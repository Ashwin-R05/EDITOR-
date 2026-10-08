import { ProgramExecutionResult, CompilationResult } from './execution.types';
export declare class DockerService {
    private static BASE_TEMP_DIR;
    private static DOCKER_IMAGE;
    private static MAX_OUTPUT_BYTES;
    constructor();
    /**
     * Creates an isolated workspace directory with permissions for non-root container user.
     */
    createWorkspace(): Promise<string>;
    /**
     * Cleans up the temporary execution workspace.
     */
    cleanupWorkspace(workDir: string): Promise<void>;
    /**
     * Compiles source code inside an isolated Docker container using GCC.
     */
    compile(workDir: string, timeoutMs?: number): Promise<CompilationResult>;
    /**
     * Executes the compiled binary inside an isolated Docker sandbox with resource limits.
     */
    executeBinary(workDir: string, input: string, timeoutMs?: number, memoryLimitMb?: number): Promise<ProgramExecutionResult>;
    /**
     * Spawns a process with stdin input piping, strict timeout enforcement, and output buffering.
     */
    private runProcess;
}
//# sourceMappingURL=docker.service.d.ts.map