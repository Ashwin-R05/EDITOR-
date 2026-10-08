import fs from 'fs';
import path from 'path';
import { DockerService } from './docker.service';
import { CompilationResult } from './execution.types';

export class CompilerService {
  constructor(private dockerService: DockerService) {}

  /**
   * Writes C source code to the workspace and compiles it inside Docker.
   */
  async compile(workDir: string, sourceCode: string): Promise<CompilationResult> {
    const sourceFilePath = path.join(workDir, 'solution.c');

    // 1. Write the source code
    await fs.promises.writeFile(sourceFilePath, sourceCode, { encoding: 'utf8', mode: 0o666 });

    // 2. Perform compilation in Docker container
    const result = await this.dockerService.compile(workDir);

    return result;
  }
}
