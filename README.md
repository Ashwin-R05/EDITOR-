# TECH AUCTION

A collegiate competitive coding platform engineered for high-stakes programming events, featuring real-time telemetry, isolated C sandbox execution, server-authoritative round management, and anti-cheat monitoring.

---

## Key Features

- **Isolated C Execution Sandbox**: Hardened Docker containers running Alpine Linux with GCC C11 (`-O2 -Wall`), memory limits, CPU quotas, process limits, and no network access.
- **Server-Authoritative Round Orchestration**: Synchronized round timer broadcasts across all connected participants with pause, resume, and conclusion controls.
- **Immutable Submission Architecture**: Every code submission creates a permanent snapshot with test evaluations and scores preserved.
- **Anti-Cheat Telemetry**: Real-time detection of tab switching, window blurring, copy/paste attempts, and devtools access with automated console locking and admin arbitration.
- **Admin Mission Control**: Live surveillance dashboard with real-time candidate roster, activity feed, problem configuration, and anti-cheat incident reviews.
- **Monaco Code Editor**: VS Code-powered coding workspace with autosave synchronization.

---

## Architecture

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Monaco Editor, Lucide Icons.
- **Backend**: Node.js, Express, Socket.IO, TypeScript, Helmet, CORS, Rate Limiting.
- **Database**: PostgreSQL 15+ with connection pooling and relational migration schema.
- **Execution Engine**: Docker (Alpine + GCC 11/12).

---

## Quick Start (Development)

### 1. Prerequisites
- Node.js v18+
- PostgreSQL
- Docker

### 2. Database Migration & Seed
```bash
cd server
npm install
npm run migrate
npm run seed
```

### 3. Docker Runner Image
```bash
cd docker/c-runner
docker build -t tech-auction-c-runner:latest .
```

### 4. Run Servers
```bash
# Terminal 1 (Backend API & Socket.IO):
cd server
npm run dev

# Terminal 2 (Frontend Client):
cd client
npm run dev
```

Visit [http://localhost:5173](http://localhost:5173).

---

## Production Deployment

Refer to [`DEPLOYMENT.md`](file:///home/ashwinr/Downloads/EHEV/DEPLOYMENT.md) for full production deployment instructions on Vercel, Railway, Render, or a VPS.
