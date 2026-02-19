# 72-hour schedule breakdown (Level 1 + Level 2)

## What was shipped

### Level 1 (Core)
- Authentication & RBAC (Argon2, JWT access + refresh, route guards, backend RBAC).
- Learning: Course → Module → Lesson (TEXT, QUIZ), quiz attempts and scoring, pagination and search.
- Scheduling: availability, booking requests, admin approve/assign, weekly calendar, conflict detection, status flow.
- Docker Compose, CI (lint, unit tests, build), backend unit + 2 integration tests, README/PLAN/CUTS/POSTMORTEM.

### Level 2 (Skynet Multi-Tenant Ops + Audit-Grade Workflow)

**A) Multi-tenancy**
- **Decision**: Shared DB + `tenant_id` on every row (documented in README and DEPLOYMENT.md).
- Tenant model; User, Course, InstructorAvailability, Booking, AuditLog scoped by tenantId.
- User unique on (tenantId, email). All list/create/update/delete queries filter by tenantId.
- JWT includes tenantId; login/register require tenantId. Backend rejects cross-tenant access (404 on resource from other tenant).
- Two tenants in seed: Alpha Flight School, Bravo Academy. Integration tests verify tenant isolation.

**B) Audit logs**
- AuditLog model: userId, tenantId, action, resourceType, resourceId, beforeState, afterState (JSON), correlationId, createdAt.
- Correlation ID: per-request (header or generated). Middleware sets req.correlationId.
- Logged: user.login, user.register, user.role_change (approve student, create instructor), course.create, schedule.availability.create/delete, schedule.booking.create/approve/assign/complete/cancel/escalate.

**C) Workflow engine**
- Booking statuses: REQUESTED → APPROVED → ASSIGNED → COMPLETED (and CANCELLED). Admin approve+assign sets status to ASSIGNED.
- Escalation: background job (setInterval 5 min) finds REQUESTED bookings older than BOOKING_ESCALATION_HOURS (default 24), sets escalatedAt, writes audit, sends email stub (console) to tenant admins. Safe retry (idempotent).

**D) Performance & scalability**
- In-memory TTL cache (1 min) for GET courses list, GET course by id, GET calendar. Key includes tenantId.
- Rate limiting: auth 20/15 min per IP; booking mutations 30/1 min per IP.
- Pagination on all list endpoints. DB indexes documented in README (tenantId, title, date, instructorId, etc.).

**E) Deployment**
- docs/DEPLOYMENT.md: cloud option (Render + Vercel or Railway), environment separation (dev/staging/prod), secrets management, basic rollback strategy.

**F) CI/CD & quality gates**
- CI: lint, unit tests (with coverage threshold 40%), integration tests with Postgres service, migration check (prisma db push), build backend + frontend.
- Quality gate: fail if coverage drops below threshold.

## What was intentionally cut

- Separate schema or separate DB per tenant (chose shared DB + tenant_id).
- Redis (used in-memory cache and in-memory rate limit).
- BullMQ/Agenda (used setInterval for escalation job).
- Real email sending (stub logs to console).
- Audit log API (logs are write-only; query API omitted for time).
- Course update audit (only course.create logged; PATCH course not implemented).
- Frontend changes for tenant selection (login/register need tenantId; frontend can call GET /api/auth/tenants and show dropdown—left as API-only for Level 2 focus).

## Why certain features were deprioritized

- Redis: Kept single-node friendly; in-memory cache and rate limit sufficient for assessment scope.
- Real email: Stub satisfies “email notification stub” requirement.
- Audit query API: Write path and metadata correctness were priority; read API can be added later.
- Frontend tenant UX: Backend contract is complete; UI for tenant picker is straightforward.
