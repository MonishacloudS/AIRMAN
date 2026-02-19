/**
 * Simple cron-like scheduler for background jobs.
 * Uses setInterval; for production consider BullMQ/Agenda with Redis.
 */
import { runEscalationJob } from "./escalationJob";

const INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

let intervalId: ReturnType<typeof setInterval> | null = null;

export function startScheduler(): void {
  if (intervalId) return;
  async function tick() {
    try {
      const result = await runEscalationJob();
      if (result.escalated > 0) {
        console.log(`[Scheduler] Escalation job: ${result.escalated} booking(s) escalated`);
      }
    } catch (err) {
      console.error("[Scheduler] Escalation job error:", err);
      // Safe retry: next tick will run again; no destructive state
    }
  }
  intervalId = setInterval(tick, INTERVAL_MS);
  console.log(`[Scheduler] Started (interval ${INTERVAL_MS / 1000}s)`);
}

export function stopScheduler(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
