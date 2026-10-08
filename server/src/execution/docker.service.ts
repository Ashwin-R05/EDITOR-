import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import { ProgramExecutionResult, CompilationResult } from './execution.types';

export class DockerService {
  private static BASE_TEMP_DIR = '/tmp/tech-auction-runs';
  private static DOCKER_IMAGE = 'tech-auction-c-runner:latest';
  private static MAX_OUTPUT_BYTES = 64 * 1024; // 64 KB max stdout/stderr

  constructor() {
    if (!fs.existsSync(DockerService.BASE_TEMP_DIR)) {
      fs.mkdirSync(DockerService.BASE_TEMP_DIR, { recursive: true, mode: 0o777 });
    }
  }

  /**
   * Creates an isolated workspace directory with permissions for non-root container user.
   */
  async createWorkspace(): Promise<string> {
    const id = uuidv4();
    const workDir = path.join(DockerService.BASE_TEMP_DIR, `exec-${id}`);
    await fs.promises.mkdir(workDir, { recursive: true, mode: 0o777 });
    // Ensure permissions allow non-root container user (UID 10001) to read/write
    try {
      fs.chmodSync(workDir, 0o777);
    } catch (e) {
      // quiet catch on permissions
    }
    return workDir;
  }

  /**
   * Cleans up the temporary execution workspace.
   */
  async cleanupWorkspace(workDir: string): Promise<void> {
    try {
      if (fs.existsSync(workDir)) {
        await fs.promises.rm(workDir, { recursive: true, force: true });
      }
    } catch (error) {
      console.error(`Failed to cleanup workspace ${workDir}:`, error);
    }
  }

  /**
   * Compiles source code inside an isolated Docker container using GCC.
   */
  async compile(workDir: string, timeoutMs: number = 10000): Promise<CompilationResult> {
    const startTime = Date.now();
    const containerName = `compile-${path.basename(workDir)}`;

    const args = [
      'run',
      '--rm',
      `--name=${containerName}`,
      '--network=none',
      '--memory=256m',
      '--memory-swap=256m',
      '--cpus=1.0',
      '--pids-limit=64',
      '--cap-drop=ALL',
      '--security-opt=no-new-privileges:true',
      '--user=10001:10001',
      '-v', `${workDir}:/sandbox/work`,
      '-w', '/sandbox/work',
      DockerService.DOCKER_IMAGE,
      'gcc', '-O2', '-std=c11', '-Wall', 'solution.c', '-o', 'solution', '-lm'
    ];

    const result = await this.runProcess('docker', args, '', timeoutMs);
    const durationMs = Date.now() - startTime;

    if (result.exitCode === 0) {
      return { success: true, durationMs };
    }

    // Sanitize compilation output (strip full paths, keep only clean file references)
    let sanitizedError = result.stderr || result.stdout || 'Compilation failed';
    sanitizedError = sanitizedError
      .replace(/\/sandbox\/work\//g, '')
      .replace(/\/sandbox\//g, '')
      .trim();

    return {
      success: false,
      error: sanitizedError,
      durationMs,
    };
  }

  /**
   * Executes the compiled binary inside an isolated Docker sandbox with resource limits.
   */
  async executeBinary(
    workDir: string,
    input: string,
    timeoutMs: number = 5000,
    memoryLimitMb: number = 128
  ): Promise<ProgramExecutionResult> {
    const startTime = Date.now();
    const containerName = `run-${path.basename(workDir)}-${Date.now()}`;

    const args = [
      'run',
      '--rm',
      '-i',
      `--name=${containerName}`,
      '--network=none',
      `--memory=${memoryLimitMb}m`,
      `--memory-swap=${memoryLimitMb}m`,
      '--cpus=1.0',
      '--pids-limit=64',
      '--cap-drop=ALL',
      '--security-opt=no-new-privileges:true',
      '--user=10001:10001',
      '-v', `${workDir}:/sandbox/work`,
      '-w', '/sandbox/work',
      DockerService.DOCKER_IMAGE,
      './solution'
    ];

    return await this.runProcess('docker', args, input, timeoutMs, containerName);
  }

  /**
   * Spawns a process with stdin input piping, strict timeout enforcement, and output buffering.
   */
  private runProcess(
    command: string,
    args: string[],
    stdinInput: string,
    timeoutMs: number,
    containerToKillOnTimeout?: string
  ): Promise<ProgramExecutionResult> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      let stdout = '';
      let stderr = '';
      let timedOut = false;
      let outputExceeded = false;
      let settled = false;

      const proc = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'] });

      const timeoutTimer = setTimeout(() => {
        timedOut = true;
        try {
          proc.kill('SIGKILL');
        } catch (e) {
          // quiet
        }
        // If container name is known, ensure Docker removes it
        if (containerToKillOnTimeout) {
          spawn('docker', ['rm', '-f', containerToKillOnTimeout], { stdio: 'ignore' });
        }
      }, timeoutMs);

      // Handle stdin input
      if (stdinInput) {
        try {
          proc.stdin.write(stdinInput);
          proc.stdin.end();
        } catch (e) {
          // quiet
        }
      } else {
        proc.stdin.end();
      }

      // Collect stdout
      proc.stdout.on('data', (data: Buffer) => {
        if (stdout.length + data.length <= DockerService.MAX_OUTPUT_BYTES) {
          stdout += data.toString();
        } else {
          outputExceeded = true;
          // Truncate to limit
          const remaining = DockerService.MAX_OUTPUT_BYTES - stdout.length;
          if (remaining > 0) {
            stdout += data.subarray(0, remaining).toString();
          }
          // Terminate excessive output producer
          try {
            proc.kill('SIGKILL');
          } catch (e) {
            // quiet
          }
        }
      });

      // Collect stderr
      proc.stderr.on('data', (data: Buffer) => {
        if (stderr.length + data.length <= DockerService.MAX_OUTPUT_BYTES) {
          stderr += data.toString();
        }
      });

      const finish = (exitCode: number) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutTimer);
        const durationMs = Date.now() - startTime;

        const memoryExceeded = exitCode === 137 && !timedOut; // 137 indicates OOM killer

        resolve({
          exitCode: timedOut ? 124 : exitCode,
          stdout,
          stderr,
          durationMs,
          timedOut,
          memoryExceeded,
          outputExceeded,
        });
      };

      proc.on('close', (code) => finish(code ?? 1));
      proc.on('error', (err) => {
        stderr += err.message;
        finish(1);
      });
    });
  }
}
