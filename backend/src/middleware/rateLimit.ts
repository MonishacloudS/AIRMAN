/**
 * In-memory rate limiter (no Redis dependency).
 * For production at scale, use Redis-backed rate limiting.
 */
const store = new Map<string, { count: number; resetAt: number }>();

function getKey(identifier: string, windowKey: string): string {
  return `${identifier}:${windowKey}`;
}

export function rateLimit(options: {
  windowMs: number;
  max: number;
  message?: string;
}) {
  const { windowMs, max, message = "Too many requests" } = options;
  return (req: { ip?: string; headers: { [k: string]: string | string[] | undefined } }, res: { status: (n: number) => { json: (o: object) => void } }, next: () => void) => {
    const ip = (req.ip ?? (req.headers["x-forwarded-for"] as string)?.split(",")[0] ?? "unknown").trim();
    const now = Date.now();
    const windowKey = Math.floor(now / windowMs).toString();
    const key = getKey(ip, windowKey);
    let entry = store.get(key);
    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      store.set(key, entry);
    }
    entry.count++;
    if (entry.count > max) {
      res.status(429).json({ error: message });
      return;
    }
    next();
  };
}
