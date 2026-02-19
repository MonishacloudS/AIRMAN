# Intentionally not built (Level 1 + Level 2)

## Level 1 (unchanged)
- Multi-tenant isolation (later added in Level 2).
- Email verification / password reset.
- Video or embed lessons.
- Recurring availability, time zones.
- Redis/caching (Level 2 added in-memory cache).
- E2E tests (Playwright/Cypress).
- In-app or push notifications.
- Cloud deployment (Level 2 added docs only).
- Demo video.
- Rate limiting (Level 2 added).

## Level 2 specific

| Feature | Reason |

| **Separate schema or separate DB per tenant** | Chose shared DB + tenant_id; documented; simpler ops and cost. |
| **Redis for cache/rate limit/jobs** | In-memory cache, in-memory rate limit, and setInterval job keep the stack single-node; Redis optional for scale. |
| **BullMQ / Agenda** | setInterval escalation job with safe retry is acceptable; job runner can be swapped later. |
| **Real email (SMTP/SendGrid)** | Spec allows console stub; real email requires secrets and provider setup. |
| **Audit log query API** | Audit writes and metadata are in place; read API (filter by tenant, user, date) not built for time. |
| **Course update (PATCH) + audit** | Only course.create audited; full CRUD + audit on courses deferred. |
| **Frontend tenant selector** | Backend supports tenantId on login/register and GET /tenants; frontend can add dropdown when needed. |
| **Offline-first quiz / telemetry** | Telemetry stub and role-based feature flags were implemented (see below). Offline quiz not implemented. |

**Bonus (implemented):**
- **Telemetry ingestion stub**: POST /api/telemetry/events accepts JSON flight event log(s) (eventType, payload, optional source/timestamp); stores in FlightEventLog with tenantId; returns 202 with accepted count and ids.
- **Role-based feature flags**: FeatureFlag model per tenant with name and enabledRoles; GET /api/feature-flags returns flags enabled for current user's role; Admin CRUD at /api/feature-flags and /dashboard/feature-flags; frontend shows Beta badge and Advanced analytics link based on flags.

Each cut keeps the Level 2 acceptance criteria while documenting what would be next.
