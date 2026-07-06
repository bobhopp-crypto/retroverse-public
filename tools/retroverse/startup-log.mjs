/**
 * RV 00-00 Retroverse — startup logging.
 *
 * Appends one line per launch to logs/retroverse-startup.log:
 *   timestamp, duration, success/failure, failing service (if any).
 *
 * Plain append-only log — a future Diagnostics/Logs UI (RV 00-03 / RV 00-05)
 * can read this file directly.
 */
import { mkdirSync, appendFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const logDir = path.join(root, "logs");
export const STARTUP_LOG_PATH = path.join(logDir, "retroverse-startup.log");

/**
 * @param {{ startedAt: string; durationMs: number; success: boolean; failingService?: string | null; note?: string }} result
 */
export function logStartupResult(result) {
  mkdirSync(logDir, { recursive: true });
  const durationS = (result.durationMs / 1000).toFixed(1);
  const status = result.success ? "READY" : "FAILED";
  const parts = [
    `timestamp=${result.startedAt}`,
    `duration=${durationS}s`,
    `status=${status}`,
  ];
  if (!result.success && result.failingService) {
    parts.push(`failingService=${result.failingService}`);
  }
  if (result.note) {
    parts.push(`note=${result.note}`);
  }
  appendFileSync(STARTUP_LOG_PATH, `${parts.join(" ")}\n`, "utf8");
}
