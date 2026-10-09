# TECH AUCTION — Production Deployment Architecture & Audit Plan

## 1. System Overview & Technology Stack

| Component | Technology | Production Deployment Target |
| :--- | :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4, Monaco Editor, Lucide | **Vercel** (or Netlify / Cloudflare Pages / S3+CloudFront) |
| **Backend REST & WebSocket** | Node.js, Express, Socket.IO, TypeScript | **Persistent Server** (Railway, Render, Fly.io, DigitalOcean VPS, AWS ECS) |
| **Database** | PostgreSQL 15+ (pg connection pool) | **Managed PostgreSQL** (Supabase, Neon, Railway, AWS RDS, Render) |
| **Execution Sandbox** | Docker (Alpine 3.19 + GCC C11 isolated runner) | **Docker-capable Host** (Co-located on VPS/Railway or standalone execution worker) |

---

## 2. Decoupled Production Architecture

```
                          ┌─────────────────────────────┐
                          │   Client Browser / Monaco   │
                          └──────────────┬──────────────┘
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 │ HTTPS (REST API)                              │ WSS (Socket.IO)
                 ▼                                               ▼
   ┌───────────────────────────┐                   ┌───────────────────────────┐
   │    Vercel CDN (Static)    │                   │   Persistent Node.js App   │
   │  - React 19 SPA Bundle    │                   │  - Express REST APIs      │
   │  - vercel.json rewrites   │                   │  - Socket.IO Server       │
   │  - VITE_API_URL           │                   │  - JWT & Auth Middleware  │
   │  - VITE_SOCKET_URL        │                   │  - Anti-Cheat Telemetry   │
   └───────────────────────────┘                   └─────────────┬─────────────┘
                                                                 │
                                         ┌───────────────────────┴───────────────────────┐
                                         ▼                                               ▼
                          ┌─────────────────────────────┐                 ┌─────────────────────────────┐
                          │     Managed PostgreSQL      │                 │   Docker Execution Engine   │
                          │  - DATABASE_URL (SSL)       │                 │  - Local Docker on Host     │
                          │  - 15 Tables + Indexes      │                 │    OR                       │
                          │  - Connection Pooling (20)  │                 │  - Remote EXECUTION_SERVICE │
                          └─────────────────────────────┘                 └─────────────────────────────┘
```

---

## 3. Findings & Required Production Fixes

### A. Environment Configuration & Secret Hygiene
1. **Root & Server `.gitignore`**: Create root `.gitignore` and `server/.gitignore`, update `client/.gitignore` to ignore `.env`, `.env.*`, `dist`, `node_modules`, `build`.
2. **`.env.example`**: Create comprehensive `.env.example` files in root, `server/`, and `client/` documenting all required variables with zero secrets.
3. **`DATABASE_URL` Support**: Update `server/src/models/db.ts` and `server/src/config/index.ts` to natively support `process.env.DATABASE_URL` with optional `DATABASE_SSL=true`.
4. **JWT Security Guard**: Prevent starting in `NODE_ENV=production` if `JWT_SECRET` is missing or set to the fallback development secret.

### B. Client API & Socket.IO Centralization
1. **API Base URL**: Update `client/src/services/api.ts` to use `import.meta.env.VITE_API_URL || '/api'`.
2. **Socket.IO Server URL**: Update `client/src/context/SocketContext.tsx` to use `import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || undefined`.
3. **SPA Client Routing**: Create `client/vercel.json` with wildcard rewrite to `/index.html` so direct navigation and page reloads on routes like `/admin/dashboard` or `/participant/round/:id` resolve properly without 404.
4. **Alias Missing Admin Routes**: Ensure `/admin/scores` and `/admin/settings` route gracefully to their designated components in `App.tsx`.

### C. Backend Production Hardening
1. **Production Health Checks**: Provide both `/health` and `/api/health` returning `{"status": "ok"}` without exposing internal telemetry or paths.
2. **CORS Parsing**: Support comma-separated `CLIENT_URL` / `CORS_ORIGIN` for apex and www domains or staging preview domains.
3. **Execution Service Separation**: Update `server/src/execution/executionService.ts` to support `EXECUTION_SERVICE_URL` when Docker is hosted on a separate compute node.
4. **Clean Logging & Hardcoded Strings**: Remove hardcoded "PORT 3001" UI text in `AdminLayout.tsx` and standardize startup console messages.

---

## 4. Verification & Validation Steps
1. Client TypeScript type-checking and production bundle compilation (`npm run build`).
2. Server TypeScript compilation (`tsc`).
3. Migration validation against database.
4. Verification of endpoints (`/health`, `/api/health`, `/api/auth/login`).
5. Complete `DEPLOYMENT.md` production guide.
