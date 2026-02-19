# AIRMAN Core (Level 2)

Production-minded **Auth**, **Learning (Maverick-lite)**, and **Scheduling (Skynet-lite)** with **multi-tenancy**, **audit logs**, **workflow engine**, **caching**, and **rate limiting**.

## Architecture (high level)

```
┌─────────────┐     ┌─────────────┐     ┌──────────────┐
│   Next.js   │────▶│  Express     │────▶│  PostgreSQL  │
│   Frontend  │     │  REST API    │     │  (Prisma)    │
│  (port 3000)│     │  (port 4000)│     │  (port 5432) │
└─────────────┘     └─────────────┘     └──────────────┘
       │                    │
       │  JWT (access +     │  RBAC + tenant_id on every query
       │  refresh, tenantId)│  Audit log, rate limit, cache
       └───────────────────┘
```

- **Multi-tenancy**: Shared DB + `tenant_id` on every row. All queries scoped by tenant; backend rejects cross-tenant access.
- **Audit**: All critical actions (login, course create, schedule create/approve/cancel, role changes) logged with user_id, tenant_id, before/after state, timestamp, correlation_id.
- **Workflow**: Booking states `requested → approved → assigned → completed`. Escalation job: if instructor not assigned within X hours, escalate to Admin (email stub).
- **Performance**: In-memory TTL cache for read-heavy endpoints (courses list, course by id, calendar). Rate limiting on auth and booking endpoints.
- **DB indexes**: See [Indexes](#db-indexes) below.
- **Bonus**: **Telemetry ingestion stub** (POST /api/telemetry/events for JSON flight event logs); **role-based feature flags** (per-tenant flags with enabled roles, GET /api/feature-flags, Admin UI at /dashboard/feature-flags).

## Setup

### Prerequisites

- Node.js 20+
- PostgreSQL 16+ (or use Docker only)
- Docker & Docker Compose (optional, to run the full stack)

### Option A: Docker Compose (one command)

```bash
# From repo root
docker-compose up --build
```

- Frontend: http://localhost:3000  
- Backend: http://localhost:4000  
- DB: postgresql://airman:airman_secret@localhost:5432/airman  

Seed data is **not** applied automatically. To seed (optional), run once the backend is up:

```bash
docker-compose exec backend npx prisma db push
docker-compose exec backend npx prisma db seed
```

Or run backend locally (see Option B) and seed there.

### Option B: Local development

**Backend**

```bash
cd backend
npm install
cp .env.example .env   # create .env with DATABASE_URL, JWT secrets
# DATABASE_URL="postgresql://user:pass@localhost:5432/airman"
npx prisma generate
npx prisma db push
npm run db:seed        # or: npx ts-node prisma/seed.ts
npm run dev
```

**Frontend**

```bash
cd frontend
npm install
# NEXT_PUBLIC_API_URL=http://localhost:4000 (default)
npm run dev
```

Open http://localhost:3000.

## Demo credentials (after seed) — two tenants

**Alpha Flight School** (tenant slug: `alpha`)

| Role       | Email                  | Password     |
|-----------|------------------------|--------------|
| Admin     | admin@alpha.demo      | admin123     |
| Instructor| instructor@alpha.demo | instructor123|
| Student   | student@alpha.demo    | student123   |

**Bravo Academy** (tenant slug: `bravo`)

| Role       | Email                  | Password     |
|-----------|------------------------|--------------|
| Admin     | admin@bravo.demo      | admin123     |
| Instructor| instructor@bravo.demo | instructor123|
| Student   | student@bravo.demo    | student123   |

Login/register require **tenantId** (from `GET /api/auth/tenants`).

## Key technical decisions

- **Multi-tenancy**: Shared DB + `tenant_id` on every row (documented in DEPLOYMENT.md). Chosen over separate schema/DB for simplicity and cost; all queries and mutations scoped by tenant; JWT includes tenantId.
- **Auth**: JWT access (15 min) + refresh (7 d), tenantId in token; refresh tokens in DB. Argon2 for password hashing. Login/register require tenantId.
- **Audit**: AuditLog table with user_id, tenant_id, action, resourceType, resourceId, beforeState, afterState (JSON), correlationId, createdAt. Correlation ID from header or generated per request.
- **Workflow**: Booking statuses REQUESTED → APPROVED → ASSIGNED → COMPLETED (and CANCELLED). Admin approve+assign sets ASSIGNED. Escalation job (cron every 5 min) finds REQUESTED bookings older than BOOKING_ESCALATION_HOURS (default 24), sets escalatedAt, writes audit, sends email stub to admins.
- **Caching**: In-memory TTL (default 1 min) for GET courses list, GET course by id, GET calendar. Key includes tenantId so tenants never share cache.
- **Rate limiting**: Auth endpoints 20 req/15 min per IP; booking mutations 30 req/1 min per IP.
- **Validation**: Zod on all API inputs; structured `AppError` and global error handler.

## DB indexes

| Table / use case | Index | Why |
|------------------|--------|-----|
| User by tenant + email | (tenantId, email) unique | Login and uniqueness per school |
| User by tenant | (tenantId) | List users per tenant |
| Course by tenant, list/search | (tenantId), (title) | List and search courses per tenant |
| Module by course | (courseId), (title) | List modules, search |
| Booking by tenant, date, instructor | (tenantId), (studentId), (instructorId), (date, status), (instructorId, date) | List and conflict checks |
| InstructorAvailability | (tenantId), (instructorId) | List slots per tenant/instructor |
| AuditLog | (tenantId), (userId), (createdAt), (correlationId) | Query by tenant, user, time, trace |

## API documentation (summary)

Base URL: `http://localhost:4000` (or your backend URL).

### Auth

| Method | Path             | Body / Notes                    |
|--------|------------------|----------------------------------|
| GET    | /api/auth/tenants| (public) List tenants for login/register |
| POST   | /api/auth/register | `{ email, password, role, tenantId }` |
| POST   | /api/auth/login  | `{ email, password, tenantId }`  |
| POST   | /api/auth/refresh| `{ refreshToken }`              |
| GET    | /api/auth/me     | Header: `Authorization: Bearer <accessToken>` |
| POST   | /api/auth/logout | Optional body: `{ refreshToken }`|

### Users (RBAC)

| Method | Path                          | Role    | Description           |
|--------|-------------------------------|---------|-----------------------|
| POST   | /api/users/instructors        | ADMIN   | Create instructor     |
| GET    | /api/users/students           | ADMIN   | List students         |
| PATCH  | /api/users/students/:id/approve | ADMIN | Approve student       |
| GET    | /api/users/instructors        | All     | List instructors      |

### Courses (Learning)

| Method | Path                                  | Role       | Description            |
|--------|---------------------------------------|------------|------------------------|
| GET    | /api/courses?page=1&limit=10&search=  | All        | List courses (paginated, search) |
| GET    | /api/courses/:id                      | All        | Get course + modules + lessons    |
| POST   | /api/courses                          | INSTRUCTOR | Create course          |
| POST   | /api/courses/:courseId/modules        | INSTRUCTOR | Create module          |
| GET    | /api/courses/:courseId/modules        | All        | List modules (paginated, search)  |
| POST   | /api/courses/:courseId/modules/:moduleId/lessons | INSTRUCTOR | Create lesson (TEXT/QUIZ) |
| GET    | /api/courses/lessons/:lessonId         | All        | Get lesson (content or quiz)     |
| POST   | /api/courses/lessons/:lessonId/quiz/attempt | STUDENT | Submit quiz answers    |
| GET    | /api/courses/lessons/:lessonId/quiz/attempts | STUDENT | My attempts           |

### Scheduling

| Method | Path                                | Role       | Description              |
|--------|-------------------------------------|------------|--------------------------|
| GET    | /api/scheduling/availability        | INSTRUCTOR | My availability slots    |
| POST   | /api/scheduling/availability        | INSTRUCTOR | Add slot (dayOfWeek, startTime, endTime) |
| DELETE | /api/scheduling/availability/:id    | INSTRUCTOR | Remove slot              |
| POST   | /api/scheduling/bookings            | STUDENT    | Request booking          |
| GET    | /api/scheduling/bookings            | All        | List my/all bookings     |
| GET    | /api/scheduling/calendar?weekStart=  | All        | Weekly calendar          |
| PATCH  | /api/scheduling/bookings/:id/approve | ADMIN    | Approve + assign instructor → status ASSIGNED (conflict check) |
| PATCH  | /api/scheduling/bookings/:id/status | Admin/Instr/Student | Set status (COMPLETED, CANCELLED) |

### Telemetry (flight event ingestion stub)

| Method | Path | Role | Description |
|--------|------|------|-------------|
| POST   | /api/telemetry/events | All (auth) | Ingest JSON flight event log(s). Body: single `{ eventType, payload, source?, timestamp? }` or `{ events: [...] }`. Max 100 per request. Returns 202 with `{ accepted, ids }`. |

### Feature flags (role-based)

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET    | /api/feature-flags | All | Returns `{ flags: string[] }` enabled for current user's role (tenant-scoped). |
| GET    | /api/feature-flags/all | ADMIN | List all flags for tenant with enabledRoles. |
| POST   | /api/feature-flags | ADMIN | Create flag: `{ name, enabledRoles }` (name: snake_case). |
| PATCH  | /api/feature-flags/:id | ADMIN | Update enabledRoles. |
| DELETE | /api/feature-flags/:id | ADMIN | Delete flag. |

### Sample requests

**Register student**

```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"student@test.com","password":"password123","role":"STUDENT"}'
```

**Login (with tenantId from GET /api/auth/tenants)**

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@alpha.demo","password":"admin123","tenantId":"<TENANT_ID>"}'
```

**List courses (with token)**

```bash
curl http://localhost:4000/api/courses?page=1&limit=5 \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

**Request booking (student)**

```bash
curl -X POST http://localhost:4000/api/scheduling/bookings \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"date":"2026-02-25","startTime":"10:00","endTime":"11:00"}'
```

**Approve booking and assign instructor (admin)**

```bash
curl -X PATCH http://localhost:4000/api/scheduling/bookings/<BOOKING_ID>/approve \
  -H "Authorization: Bearer <ADMIN_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"instructorId":"<INSTRUCTOR_USER_ID>"}'
```

**Ingest flight event (telemetry stub)**

```bash
curl -X POST http://localhost:4000/api/telemetry/events \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"eventType":"flight.land","payload":{"altitude":0,"duration_min":45,"tail":"N123"}}'
```

**Get feature flags for current user**

```bash
curl http://localhost:4000/api/feature-flags -H "Authorization: Bearer <ACCESS_TOKEN>"
```

## Testing

- **Backend unit tests**: `cd backend && npm run test` (auth, booking conflict). Exclude integration: `--testPathIgnorePatterns=integration`.
- **Integration tests** (tenant isolation, booking conflict, auth+RBAC): set `DATABASE_URL`, run `npm run test -- --testPathPattern=integration`.
- **CI**: Lint, unit tests with coverage threshold, integration tests with Postgres service, migration check (db push), build. See `.github/workflows/ci.yml`.

## Repository structure

```
AIRMAN/
├── backend/          # Express + Prisma API
│   ├── prisma/
│   ├── src/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── services/
│   │   └── lib/
│   └── Dockerfile
├── frontend/         # Next.js app
│   ├── src/app/
│   ├── src/components/
│   ├── src/context/
│   └── Dockerfile
├── docker-compose.yml
├── README.md
├── PLAN.md
├── CUTS.md
├── POSTMORTEM.md
└── docs/
    └── DEPLOYMENT.md   # Cloud deployment, envs, secrets, rollback
```
