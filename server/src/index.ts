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
import codingRoutes from './routes/coding';
import securityRoutes from './routes/security';

const app = express();
const httpServer = createServer(app);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration supporting single or multiple origins
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. mobile, curl, server-to-server)
    if (!origin) return callback(null, true);
    if (config.clientUrls.includes('*') || config.clientUrls.includes(origin)) {
      return callback(null, true);
    }
    // In development mode, allow localhost origins
    if (config.nodeEnv === 'development' && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
      return callback(null, true);
    }
    return callback(new Error(`Origin ${origin} not allowed by CORS policy`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Too many authentication attempts. Please try again later.' },
});
app.use('/api/auth/login', authLimiter);

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Standard production health checks
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/participant', participantRoutes);
app.use('/api/security', securityRoutes);
app.use('/api', codingRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler (never exposes stack traces in production)
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled server error:', err.message);
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
    console.log(`🚀 Server listening on port ${config.port} (env: ${config.nodeEnv})`);
    console.log(`📡 WebSocket server initialized`);
    console.log(`🌐 Allowed CORS origins: ${config.clientUrls.join(', ')}`);
    console.log('');
  });
}

start().catch(console.error);
