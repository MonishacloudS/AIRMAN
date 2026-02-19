import { Router } from "express";
import { z } from "zod";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";
import { prisma } from "../lib/prisma";

const router = Router();

const flightEventSchema = z.object({
  eventType: z.string().min(1),
  payload: z.record(z.unknown()).or(z.array(z.unknown())),
  timestamp: z.union([z.string(), z.number()]).optional(),
  source: z.string().optional(),
});

const ingestSchema = z.object({
  events: z.array(flightEventSchema),
}).or(flightEventSchema);

/**
 * Telemetry ingestion stub: accept JSON flight event logs.
 * Stores events with tenantId from auth; correlationId from request.
 * Single event or { events: [...] } batch.
 */
router.post("/events", authMiddleware, async (req: AuthRequest, res) => {
  const tenantId = req.user!.tenantId;
  const correlationId = req.correlationId ?? undefined;
  const body = ingestSchema.parse(req.body);

  const events = "events" in body ? body.events : [body];
  if (events.length === 0) {
    throw new AppError(400, "At least one event required");
  }
  if (events.length > 100) {
    throw new AppError(400, "Max 100 events per request");
  }

  const created = await prisma.flightEventLog.createManyAndReturn({
    data: events.map((e) => ({
      tenantId,
      eventType: e.eventType,
      payload: e.payload as object,
      correlationId,
      source: e.source ?? undefined,
    })),
  });

  res.status(202).json({
    accepted: created.length,
    ids: created.map((c) => c.id),
  });
});

export { router as telemetryRouter };
