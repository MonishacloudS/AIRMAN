# Level 2: Deployment & Release Discipline

## Cloud deployment option

Recommended: **Render** (backend + Postgres) + **Vercel** (frontend), or **Railway** for all.

### Option A: Render (Backend + DB) + Vercel (Frontend)

**Backend (Render Web Service)**

1. Create a Render account; create a **PostgreSQL** database (internal URL).
2. Create a **Web Service** from the repo; root directory: `backend`.
3. Build: `npm install && npx prisma generate && npm run build`.
4. Start: `npx prisma migrate deploy && node dist/index.js` (or use `prisma db push` for dev).
5. Environment: `DATABASE_URL` (from Render Postgres), `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `FRONTEND_URL` (Vercel URL).

**Frontend (Vercel)**

1. Import repo; root directory: `frontend`.
2. Env: `NEXT_PUBLIC_API_URL` = Render backend URL.
3. Build and deploy.

### Option B: Railway

1. Create project; add **PostgreSQL** plugin.
2. Add **backend** service (root `backend`, build: `npm install && npx prisma generate && npm run build`, start: `node dist/index.js`).
3. Add **frontend** service (root `frontend`, build: `npm run build`, start: `npm start` or use Vercel for frontend).
4. Set `DATABASE_URL`, JWT secrets, and `NEXT_PUBLIC_API_URL` (backend URL) for frontend.

## Environment separation

| Env     | Use case              | DATABASE_URL     | Secrets              |
|--------|------------------------|------------------|----------------------|
| dev    | Local / Docker         | local Postgres   | .env (not committed) |
| staging| Pre-production testing | Staging DB       | Platform secrets     |
| prod   | Live                   | Production DB    | Platform secrets     |

- **Secrets management**: Use the platform’s secret/env UI (Render, Vercel, Railway). Never commit secrets. Rotate JWT secrets per environment.
- **Backend**: Read `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `FRONTEND_URL` from env.
- **Frontend**: Only `NEXT_PUBLIC_API_URL` is needed at build time.

## Rollback strategy

1. **Application**: Redeploy the previous commit or previous build artifact from the platform (Render/Vercel/Railway “rollback” or redeploy last known good).
2. **Database**: Prisma migrations are forward-only. Rollback = deploy an older app version that is compatible with the current DB, or restore a DB snapshot if a migration must be reverted.
3. **Recommendation**: Tag releases (e.g. `v1.2.0`); keep last two versions deployable so you can roll back by redeploying the previous tag.

## Background jobs in production

The escalation job runs in-process (setInterval). For multi-instance deployments, either:

- Run a single worker instance that executes the job, or
- Replace with BullMQ/Agenda + Redis so only one worker processes the queue.
