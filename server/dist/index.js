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
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
// Security middleware
app.use((0, helmet_1.default)({
    contentSecurityPolicy: false, // Allow for dev
    crossOriginEmbedderPolicy: false,
}));
app.use((0, cors_1.default)({
    origin: config_1.config.clientUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
// Rate limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // generous for dev
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { error: 'Too many login attempts. Please try again later.' },
});
app.use('/api/auth/login', authLimiter);
// Body parsing
app.use(express_1.default.json({ limit: '1mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});
const security_1 = __importDefault(require("./routes/security"));
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
// Error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
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
        console.log(`🚀 Server running on http://localhost:${config_1.config.port}`);
        console.log(`📡 Socket.IO ready`);
        console.log(`🌐 CORS origin: ${config_1.config.clientUrl}`);
        console.log('');
    });
}
start().catch(console.error);
//# sourceMappingURL=index.js.map