"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const http_1 = require("http");
const config_1 = require("./config");
const db_1 = require("./models/db");
const socketManager_1 = require("./websocket/socketManager");
const auth_1 = __importDefault(require("./routes/auth"));
const participant_1 = __importDefault(require("./routes/participant"));
const admin_1 = __importDefault(require("./routes/admin"));
const coding_1 = __importDefault(require("./routes/coding"));
const security_1 = __importDefault(require("./routes/security"));
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
// Security middleware
app.use((0, helmet_1.default)({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
}));
// CORS configuration supporting single or multiple origins
const corsOptions = {
    origin: (origin, callback) => {
        // Allow non-browser requests (e.g. mobile, curl, server-to-server)
        if (!origin)
            return callback(null, true);
        if (config_1.config.clientUrls.includes('*') || config_1.config.clientUrls.includes(origin)) {
            return callback(null, true);
        }
        // In development mode, allow localhost origins
        if (config_1.config.nodeEnv === 'development' && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
            return callback(null, true);
        }
        return callback(new Error(`Origin ${origin} not allowed by CORS policy`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use((0, cors_1.default)(corsOptions));
// Rate limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 30,
    message: { error: 'Too many authentication attempts. Please try again later.' },
});
app.use('/api/auth/login', authLimiter);
// Body parsing
app.use(express_1.default.json({ limit: '1mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
// Standard production health checks
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});
// API routes
app.use('/api/auth', auth_1.default);
app.use('/api/admin', admin_1.default);
app.use('/api/participant', participant_1.default);
app.use('/api/security', security_1.default);
app.use('/api', coding_1.default);
// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});
// Error handler (never exposes stack traces in production)
app.use((err, req, res, next) => {
    console.error('Unhandled server error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
});
// Initialize Socket.IO
(0, socketManager_1.initializeWebSocket)(httpServer);
// Start server
async function start() {
    console.log('');
    console.log('╔══════════════════════════════════════╗');
    console.log('║       TECH AUCTION - Server          ║');
    console.log('╚══════════════════════════════════════╝');
    console.log('');
    await (0, db_1.testConnection)();
    httpServer.listen(config_1.config.port, () => {
        console.log(`🚀 Server listening on port ${config_1.config.port} (env: ${config_1.config.nodeEnv})`);
        console.log(`📡 WebSocket server initialized`);
        console.log(`🌐 Allowed CORS origins: ${config_1.config.clientUrls.join(', ')}`);
        console.log('');
    });
}
start().catch(console.error);
//# sourceMappingURL=index.js.map