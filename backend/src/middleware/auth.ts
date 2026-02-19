import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "./errorHandler";

export type JwtPayload = {
  userId: string;
  email: string;
  role: string;
  tenantId: string;
  type: "access" | "refresh";
};

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    tenantId: string;
  };
  correlationId?: string;
}

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "access-secret-change-in-production";
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "refresh-secret-change-in-production";

export function signAccessToken(payload: Omit<JwtPayload, "type">): string {
  return jwt.sign({ ...payload, type: "access" }, ACCESS_SECRET, { expiresIn: "15m" });
}

export function signRefreshToken(payload: Omit<JwtPayload, "type">): string {
  return jwt.sign({ ...payload, type: "refresh" }, REFRESH_SECRET, { expiresIn: "7d" });
}

export function verifyAccessToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, ACCESS_SECRET) as JwtPayload;
  if (decoded.type !== "access") throw new AppError(401, "Invalid token type");
  return decoded;
}

export function verifyRefreshToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, REFRESH_SECRET) as JwtPayload;
  if (decoded.type !== "refresh") throw new AppError(401, "Invalid token type");
  return decoded;
}

export async function authMiddleware(req: AuthRequest, _res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    throw new AppError(401, "Missing or invalid authorization header");
  }
  const token = authHeader.slice(7);
  const payload = verifyAccessToken(token);
  const tenantId = payload.tenantId;
  if (!tenantId) throw new AppError(401, "Invalid token: tenant required. Please log in again.");
  req.user = {
    id: payload.userId,
    email: payload.email,
    role: payload.role,
    tenantId,
  };
  next();
}

export async function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    next();
    return;
  }
  try {
    const token = authHeader.slice(7);
    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.userId,
      email: payload.email,
      role: payload.role,
      tenantId: payload.tenantId,
    };
  } catch {
    // ignore invalid token for optional auth
  }
  next();
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) throw new AppError(401, "Authentication required");
    if (!roles.includes(req.user.role)) {
      throw new AppError(403, "Insufficient permissions");
    }
    next();
  };
}
