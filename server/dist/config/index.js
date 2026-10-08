"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.config = {
    port: parseInt(process.env.PORT || '3001', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    db: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        name: process.env.DB_NAME || 'tech_auction',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
    },
    jwt: {
        secret: process.env.JWT_SECRET || 'fallback-secret-do-not-use',
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    },
    clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
    execution: {
        dockerEnabled: process.env.DOCKER_ENABLED === 'true',
        timeout: parseInt(process.env.EXECUTION_TIMEOUT || '10000', 10),
        memoryLimit: process.env.EXECUTION_MEMORY_LIMIT || '128m',
        cpuLimit: process.env.EXECUTION_CPU_LIMIT || '1',
    },
};
//# sourceMappingURL=index.js.map