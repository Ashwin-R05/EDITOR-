import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { config } from './config';
import { testConnection } from './models/db';
import { initializeWebSocket } from './websocket/socketManager';
import authRoutes from './routes/auth';
import participantRoutes from './routes/participant';
import adminRoutes from './routes/admin';

const app = express();
const httpServer = createServer(app);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Allow for dev
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: config.clientUrl,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // generous for dev
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many login attempts. Please try again later.' },
});
app.use('/api/auth/login', authLimiter);

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/participant', participantRoutes);
app.use('/api', participantRoutes); // Exposes /api/code-drafts, /api/code/run, /api/submissions, etc.
app.use('/api/admin', adminRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Initialize Socket.IO
initializeWebSocket(httpServer);

// Start server
async function start() {
  console.log('');
  console.log('╔══════════════════════════════════════╗');
  console.log('║       TECH AUCTION - Server          ║');
  console.log('╚══════════════════════════════════════╝');
  console.log('');

  await testConnection();

  httpServer.listen(config.port, () => {
    console.log(`🚀 Server running on http://localhost:${config.port}`);
    console.log(`📡 Socket.IO ready`);
    console.log(`🌐 CORS origin: ${config.clientUrl}`);
    console.log('');
  });
}

start().catch(console.error);
