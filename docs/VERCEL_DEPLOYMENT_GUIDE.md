# HireSense AI — Vercel Production Deployment Guide

This guide details how to deploy **HireSense AI** to Vercel production with zero friction.

---

## ⚡ Deployment Options

You can deploy HireSense AI to Vercel in either of two ways:
- **Option 1 (Recommended — Monorepo / Single Project)**: Deploy both the Frontend and Express API as a single project on Vercel using serverless functions.
- **Option 2 (Decoupled)**: Deploy the Frontend on Vercel, and deploy the Express API on a container host (Render, Railway, Fly.io, or AWS).

---

## 🚀 Option 1: Fullstack Monorepo Deployment (Single Vercel Project)

The repository includes a pre-configured root [`vercel.json`](file:///d:/HireSense/vercel.json) that automatically:
- Builds the Vite React 19 frontend into `frontend/dist`.
- Packages the Express 5 backend as a Vercel Serverless Function (`backend/server.js` and `api/index.js`).
- Routes `/api/*` requests to the Express serverless function.
- Routes all other traffic to static assets with full SPA client-side routing fallback to `/index.html`.

### Step 1: Import Project to Vercel
1. Push your repository to GitHub / GitLab / Bitbucket.
2. In the [Vercel Dashboard](https://vercel.com/dashboard), click **"Add New Project"** and import the repository.
3. Leave **Root Directory** as `./` (the repository root).
4. Vercel will automatically detect `vercel.json` and `package.json`.

### Step 2: Configure Environment Variables in Vercel
In the Vercel Project Settings under **Environment Variables**, add:

| Variable Name | Required | Description | Example Value |
|---|---|---|---|
| `MONGO_URI` | **Yes** | MongoDB Atlas connection string | `mongodb+srv://user:pass@cluster.mongodb.net/hiresense?retryWrites=true&w=majority` |
| `JWT_SECRET` | **Yes** | Secure random key for signing JWTs (min 32 chars) | `your-secure-jwt-production-secret-key-32-chars` |
| `GEMINI_API_KEY` | **Yes** | Google Gemini API Key for AI evaluation | `AIzaSy...` |
| `NODE_ENV` | **Yes** | Set to production | `production` |
| `INITIAL_ADMIN_EMAIL` | Optional | Email for initial administrator account | `admin@hiresense.ai` |
| `INITIAL_ADMIN_PASSWORD` | Optional | Password for initial administrator account | `SecurePass123!` |

> [!NOTE]
> You do **NOT** need to set `VITE_API_URL` for single-project deployments. The frontend automatically defaults to relative `/api` in production on the same domain.

### Step 3: Deploy
Click **"Deploy"**. Vercel will run the build and provide your production URL (e.g. `https://hiresense-ai.vercel.app`).

---

## 🌐 Option 2: Decoupled Deployment (Frontend on Vercel + Backend on External Host)

If you prefer hosting the Express backend continuously on Render, Railway, or AWS EC2:

### Backend Setup (e.g. Render / Railway)
1. Deploy `backend` to your server.
2. Set `MONGO_URI`, `JWT_SECRET`, `GEMINI_API_KEY`, and `PORT=5000`.
3. Set `CLIENT_URL=https://your-frontend-app.vercel.app`.

### Frontend Setup on Vercel
1. In Vercel, import the repository and set **Root Directory** to `frontend`.
2. Framework Preset: **Vite**.
3. In **Environment Variables**, add:
   ```env
   VITE_API_URL=https://your-backend-api.onrender.com/api
   ```
4. Click **"Deploy"**. The pre-configured [`frontend/vercel.json`](file:///d:/HireSense/frontend/vercel.json) handles SPA client-side route rewrites.

---

## 🛡️ Serverless Architecture Optimizations Included

The codebase has been engineered specifically for Vercel production:
1. **Serverless MongoDB Connection Pooling**: `backend/config/db.js` implements global connection promise caching, preventing connection exhaustion across warm serverless invocations.
2. **Writable Serverless Storage**: `backend/middleware/uploadMiddleware.js` detects `process.env.VERCEL` and writes uploads to `os.tmpdir()` (`/tmp`), bypassing Vercel's read-only root filesystem.
3. **Automatic CORS Support for Vercel**: `backend/server.js` automatically allows all `*.vercel.app` preview and production origins.
4. **Clean Route Aliasing**: All backend controllers are dual-mounted on both `/api/...` and `/...` so requests resolve regardless of whether the serverless gateway retains or strips the `/api` prefix.
5. **SPA Rewrites**: Deep links (e.g. `/candidate/jobs/123`, `/employer/dashboard`) rewrite cleanly to `/index.html` instead of returning 404s.
