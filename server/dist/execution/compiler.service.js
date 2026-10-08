"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompilerService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class CompilerService {
    dockerService;
    constructor(dockerService) {
        this.dockerService = dockerService;
    }
    /**
     * Writes C source code to the workspace and compiles it inside Docker.
     */
    async compile(workDir, sourceCode) {
        const sourceFilePath = path_1.default.join(workDir, 'solution.c');
        // 1. Write the source code
        await fs_1.default.promises.writeFile(sourceFilePath, sourceCode, { encoding: 'utf8', mode: 0o666 });
        // 2. Perform compilation in Docker container
        const result = await this.dockerService.compile(workDir);
        return result;
    }
}
exports.CompilerService = CompilerService;
//# sourceMappingURL=compiler.service.js.map