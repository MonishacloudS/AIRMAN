# Postmortem (Level 1 + Level 2)

## What went wrong

- **Seed in Docker**: Still not automatic; users must run `prisma db push` and `prisma db seed` after first up. Could add an init container or documented one-liner.
- **Frontend and tenantId**: Login/register now require tenantId; frontend was not updated to call GET /api/auth/tenants and pass tenantId. Demo credentials and API docs are updated; frontend would need a tenant dropdown or default tenant for demo.
- **Coverage threshold**: 40% may be tight for some runs; if CI flakes, threshold can be lowered or coverage limited to critical paths.
- **Escalation job and multiple instances**: In-process job runs on every backend instance; in production with multiple replicas, escalation could run multiple times (still idempotent). Prefer a single worker or Redis-backed queue for strict once-per-run.
- **Cache and res.send**: Cache middleware wraps res.send; if a route uses res.json(), Express stringifies and calls send. Only string bodies are cached; Buffer or other types could be passed through without caching.

## Technical challenges

- **Prisma unique on (tenantId, email)**: User uniqueness is per-tenant; Prisma’s `@@unique([tenantId, email])` and `findUnique({ where: { tenantId_email: { tenantId, email } } })` required schema and call-site updates everywhere.
- **Booking workflow**: Aligning REQUESTED → APPROVED → ASSIGNED → COMPLETED with “approve and assign” in one step: admin PATCH sets instructorId and status ASSIGNED in one update; no separate APPROVED state when instructor is set.
- **hasBookingConflict signature**: Adding tenantId as first parameter and including ASSIGNED in status list for conflict check; all call sites and tests updated.
- **Integration tests with tenants**: New tenant isolation test creates two tenants and verifies Admin B cannot see Course A. Booking and auth integration tests create a tenant and use tenantId in register/login and booking creation.

## What would be improved with one more week

- **Frontend**: Tenant selector on login/register (GET /api/auth/tenants); show tenant name in dashboard; optional tenant switch for super-admin.
- **Audit**: Query API (GET /api/audit?tenantId=&userId=&action=&from=&to=) with pagination; retention policy doc.
- **Background job**: Move escalation to BullMQ or Agenda with Redis; single worker in deployment; configurable retry backoff.
- **Redis**: Optional Redis for cache and rate limit when REDIS_URL is set; fallback to in-memory when not set.
- **Deployment**: One-click Render/Railway config files or repo templates; health check that includes DB and optional job status.
- **Tests**: E2E for login → list courses → request booking → admin approve (with tenant context); more audit assertions in integration tests.
