"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const rawClientUrl = process.env.CLIENT_URL || process.env.CORS_ORIGIN || 'http://localhost:5173';
const clientUrls = rawClientUrl.split(',').map((u) => u.trim()).filter(Boolean);
// Production security check for JWT secret
const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-do-not-use';
if (process.env.NODE_ENV === 'production') {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'fallback-secret-do-not-use') {
        console.error('FATAL ERROR: JWT_SECRET environment variable must be set to a secure secret in production mode.');
        process.exit(1);
    }
}
exports.config = {
    port: parseInt(process.env.PORT || '3001', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    db: {
        url: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_SSL === 'true' || process.env.NODE_ENV === 'production' && Boolean(process.env.DATABASE_URL),
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        name: process.env.DB_NAME || 'tech_auction',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
    },
    jwt: {
        secret: jwtSecret,
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    },
    clientUrl: clientUrls[0] || 'http://localhost:5173',
    clientUrls,
    execution: {
        dockerEnabled: process.env.DOCKER_ENABLED !== 'false',
        serviceUrl: process.env.EXECUTION_SERVICE_URL,
        serviceToken: process.env.EXECUTION_SERVICE_TOKEN,
        timeout: parseInt(process.env.EXECUTION_TIMEOUT || '10000', 10),
        memoryLimit: process.env.EXECUTION_MEMORY_LIMIT || '128m',
        cpuLimit: process.env.EXECUTION_CPU_LIMIT || '1',
    },
};
//# sourceMappingURL=index.js.map