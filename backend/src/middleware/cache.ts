/**
 * In-memory TTL cache for read-heavy endpoints.
 * Key = method + path + sorted query string. Redis can replace this for multi-instance.
 */
const cache = new Map<string, { body: string; expiresAt: number }>();
const TTL_MS = Number(process.env.CACHE_TTL_MS) || 60 * 1000; // 1 min default

function cacheKey(
  req: { method: string; path: string; query: Record<string, unknown>; user?: { tenantId?: string } }
): string {
  const q = new URLSearchParams(req.query as Record<string, string>).toString();
  const tenant = req.user?.tenantId ?? "anon";
  return `${req.method}:${req.path}:${tenant}${q ? `?${q}` : ""}`;
}

export function cacheMiddleware(ttlMs: number = TTL_MS) {
  return (req: { method: string; path: string; query: Record<string, unknown> }, res: { setHeader: (k: string, v: string) => void; send: (s: string) => void; status: (n: number) => { send: () => void } }, next: () => void) => {
    if (req.method !== "GET") {
      next();
      return;
    }
    const key = cacheKey(req);
    const entry = cache.get(key);
    if (entry && Date.now() < entry.expiresAt) {
      res.setHeader("Content-Type", "application/json");
      res.setHeader("X-Cache", "HIT");
      res.send(entry.body);
      return;
    }
    const originalSend = res.send.bind(res);
    res.send = (body: string) => {
      cache.set(key, { body, expiresAt: Date.now() + ttlMs });
      res.setHeader("X-Cache", "MISS");
      originalSend(body);
    };
    next();
  };
}
