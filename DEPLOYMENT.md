# TECH AUCTION — Production Deployment Guide

This guide details the complete production deployment procedure for the **TECH AUCTION** platform.

---

## Architecture Overview

```
                      ┌───────────────────────────────────────┐
                      │    Client Browser (React 19 / Vite)   │
                      └──────────────────┬────────────────────┘
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 │ HTTPS (REST API)                              │ WSS (Socket.IO)
                 ▼                                               ▼
   ┌───────────────────────────┐                   ┌───────────────────────────┐
   │      Vercel / Netlify     │                   │  Persistent Node.js Host  │
   │  - Static SPA Deployment  │                   │  (Railway / Render / VPS) │
   │  - vercel.json rewrites   │                   │  - Express REST APIs      │
   │  - Fast CDN distribution  │                   │  - Socket.IO Server       │
   └───────────────────────────┘                   └─────────────┬─────────────┘
                                                                 │
                                         ┌───────────────────────┴───────────────────────┐
                                         ▼                                               ▼
                          ┌─────────────────────────────┐                 ┌─────────────────────────────┐
                          │     Managed PostgreSQL      │                 │   Docker Execution Engine   │
                          │  (Neon / Supabase / RDS)    │                 │  - Local Docker on Host     │
                          │  - 15 relational tables     │                 │    OR                       │
                          │  - SSL Connection Pooling   │                 │  - Remote EXECUTION_SERVICE │
                          └─────────────────────────────┘                 └─────────────────────────────┘
```

---

## 1. Prerequisites

- **Node.js**: v18.0.0+ or v20.0.0+ LTS
- **PostgreSQL**: v14, v15, or v16
- **Docker Engine**: Installed on the backend host (or dedicated execution runner)
- **Package Manager**: npm v9+

---

## 2. Environment Variables Reference

### Backend (`server/.env`)

| Variable | Description | Example / Default | Required in Production |
| :--- | :--- | :--- | :---: |
| `PORT` | HTTP/WS server listen port | `3001` | Yes |
| `NODE_ENV` | Runtime environment | `production` | Yes |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db?sslmode=require` | Yes |
| `DATABASE_SSL` | Enable TLS/SSL for database | `true` | Yes (for cloud DBs) |
| `JWT_SECRET` | 256-bit cryptographic secret | *(Random 32+ character hex string)* | **Yes (Fails if default)** |
| `JWT_EXPIRES_IN` | Token duration | `24h` | No (default `24h`) |
| `CLIENT_URL` | Allowed frontend origin(s) for CORS | `https://techauction.vercel.app` | **Yes** |
| `CORS_ORIGIN` | Alias for `CLIENT_URL` | `https://techauction.vercel.app` | Optional |
| `DOCKER_ENABLED` | Toggle Docker sandbox | `true` | Yes |
| `EXECUTION_SERVICE_URL` | Remote execution microservice URL | `https://runner.internal.domain.com` | Optional (if decoupled) |
| `EXECUTION_SERVICE_TOKEN` | Auth token for remote execution | `sec_tok_xyz123` | Optional |
| `EXECUTION_TIMEOUT` | Max execution time in ms | `10000` | No (default `10000`) |
| `EXECUTION_MEMORY_LIMIT`| Container RAM constraint | `128m` | No (default `128m`) |
| `EXECUTION_CPU_LIMIT` | Container CPU constraint | `1` | No (default `1`) |

### Frontend (`client/.env`)

| Variable | Description | Example | Required in Production |
| :--- | :--- | :--- | :---: |
| `VITE_API_URL` | Full URL to backend REST API | `https://api.techauction.com/api` | **Yes** |
| `VITE_SOCKET_URL` | Full URL to Socket.IO backend | `https://api.techauction.com` | **Yes** |

---

## 3. Database Setup & Migrations

### 3.1 Provision PostgreSQL
Use any standard cloud PostgreSQL provider (Neon, Supabase, Railway, AWS RDS, DigitalOcean). Obtain your `DATABASE_URL`.

### 3.2 Run Database Migrations
Execute the sequential SQL migrations to create all 15 required tables and indexes:

```bash
cd server
export DATABASE_URL="postgresql://user:password@host:5432/tech_auction?sslmode=require"
npm run migrate:prod
```

Or in development:
```bash
npm run migrate
```

### 3.3 Optional: Seed Default Rounds & Problems
To populate default competitive rounds (Round 1: Palindrome Check, Round 2: Pattern Printing) and problems:
```bash
npm run seed:prod
```

---

## 4. Docker C Sandbox Runner Setup

The isolated execution sandbox uses the hardened Alpine C runner image:

```bash
# Build the C sandbox runner image on the backend host
cd docker/c-runner
docker build -t tech-auction-c-runner:latest .
```

Verify that the image is built:
```bash
docker images | grep tech-auction-c-runner
```

Sandbox features:
- Dedicated unprivileged user (`UID 10001:10001`)
- No network access (`--network=none`)
- Memory ceiling (`--memory=256m --memory-swap=256m`)
- Process limit (`--pids-limit=64`)
- Dropped Linux capabilities (`--cap-drop=ALL --security-opt=no-new-privileges:true`)

---

## 5. Backend Server Deployment

> **Important**: The backend requires a persistent Node.js process to host the Socket.IO server and execute Docker commands. Do NOT deploy the backend to Vercel Serverless Functions.

Recommended platforms: **Railway**, **Render** (Docker/Web Service), **Fly.io**, or an **Ubuntu VPS**.

### Deployment Commands (Production Server)

```bash
cd server
npm ci --omit=dev
npm run build
npm run start
```

### Systemd Service Configuration (for Ubuntu / Debian VPS)

Create `/etc/systemd/system/tech-auction-api.service`:

```ini
[Unit]
Description=Tech Auction Backend API & Socket.IO
After=network.target docker.service

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/var/www/tech-auction/server
EnvironmentFile=/var/www/tech-auction/server/.env
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable tech-auction-api
sudo systemctl start tech-auction-api
```

---

## 6. Frontend Deployment (Vercel)

The frontend is a single-page React 19 application built with Vite and Tailwind CSS. It is ideally suited for **Vercel**.

### Step 1: Connect Repository to Vercel
1. Set **Root Directory** to `client`.
2. Framework Preset: **Vite**.
3. Build Command: `npm run build`.
4. Output Directory: `dist`.

### Step 2: Configure Environment Variables in Vercel
In the Vercel Project Settings &rarr; Environment Variables, add:
- `VITE_API_URL`: `https://api.yourdomain.com/api`
- `VITE_SOCKET_URL`: `https://api.yourdomain.com`

### Step 3: SPA Rewrites
The project includes [`client/vercel.json`](file:///home/ashwinr/Downloads/EHEV/client/vercel.json) configured with:
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```
This guarantees that direct navigation and browser reloads on routes like `/admin/dashboard` or `/participant/round/:id` resolve without 404 errors.

---

## 7. Production CORS & Security Headers

The backend validates all incoming requests against the `CLIENT_URL` / `CORS_ORIGIN` environment variable. Multiple comma-separated domains are supported:

```env
CLIENT_URL=https://techauction.vercel.app,https://admin.techauction.com
```

Both Express HTTP routes and Socket.IO handshakes enforce this policy.

---

## 8. Health Check Verification

After deployment, test server liveness:

```bash
curl -i https://api.yourdomain.com/health
```

Expected response (`200 OK`):
```json
{"status":"ok"}
```

---

## 9. Troubleshooting & FAQ

### Database connection fails with `self-signed certificate`
Add `DATABASE_SSL=true` to `server/.env`. The backend pool is configured with `rejectUnauthorized: false` for managed cloud certificates.

### Socket.IO shows `OFFLINE` on the frontend
1. Ensure `VITE_SOCKET_URL` points to the root backend domain (`https://api.yourdomain.com`), not with `/api`.
2. Check that the backend has `CLIENT_URL` matching the exact frontend domain (including protocol `https://` and no trailing slash).
3. If using Nginx as a reverse proxy, ensure `proxy_set_header Upgrade $http_upgrade;` and `proxy_set_header Connection "upgrade";` are enabled.

### Code run fails with `Cannot connect to the Docker daemon`
Ensure the user running the Node.js backend has permissions to invoke Docker:
```bash
sudo usermod -aG docker $USER
```
And verify that the image is built:
```bash
docker images | grep tech-auction-c-runner
```

### Direct route reload returns 404
Ensure [`client/vercel.json`](file:///home/ashwinr/Downloads/EHEV/client/vercel.json) is deployed in the client root directory to handle client-side routing rewrites.
