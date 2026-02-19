import { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";

export interface CorrelationRequest extends Request {
  correlationId?: string;
}

export function correlationIdMiddleware(req: CorrelationRequest, _res: Response, next: NextFunction): void {
  const id = (req.headers["x-correlation-id"] as string) || randomUUID();
  req.correlationId = id;
  next();
}
