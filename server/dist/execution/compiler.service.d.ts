import { DockerService } from './docker.service';
import { CompilationResult } from './execution.types';
export declare class CompilerService {
    private dockerService;
    constructor(dockerService: DockerService);
    /**
     * Writes C source code to the workspace and compiles it inside Docker.
     */
    compile(workDir: string, sourceCode: string): Promise<CompilationResult>;
}
//# sourceMappingURL=compiler.service.d.ts.map