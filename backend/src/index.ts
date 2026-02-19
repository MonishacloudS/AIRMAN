import "express-async-errors";
import express from "express";
import cors from "cors";
import { correlationIdMiddleware } from "./middleware/correlationId";
import { rateLimit } from "./middleware/rateLimit";
import { authRouter } from "./routes/auth";
import { usersRouter } from "./routes/users";
import { coursesRouter } from "./routes/courses";
import { schedulingRouter } from "./routes/scheduling";
import { telemetryRouter } from "./routes/telemetry";
import { featureFlagsRouter } from "./routes/featureFlags";
import { errorHandler } from "./middleware/errorHandler";
import { startScheduler } from "./jobs/scheduler";

const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:3000", credentials: true }));
app.use(express.json());
app.use(correlationIdMiddleware);

// Rate limit: auth endpoints (20 per 15 min per IP)
app.use("/api/auth", rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: "Too many auth attempts" }), authRouter);
app.use("/api/users", usersRouter);
app.use("/api/courses", coursesRouter);
app.use("/api/scheduling", schedulingRouter);
app.use("/api/telemetry", telemetryRouter);
app.use("/api/feature-flags", featureFlagsRouter);

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use(errorHandler);

const PORT = process.env.PORT || 4000;
if (require.main === module) {
  startScheduler();
  app.listen(PORT, () => console.log(`AIRMAN API listening on ${PORT}`));
}

export default app;
