import { existsSync } from "node:fs";
import { join } from "node:path";

export const BACKFILL_BATCH_SIZE = 100;

export function welcomeRoot(): string {
  const fromEnv = process.env.RETROVERSE_WELCOME_ROOT?.trim();
  if (fromEnv && existsSync(fromEnv)) return fromEnv;
  const sibling = join(process.cwd(), "..", "RETROVERSE_v2", "apps", "retroverse-welcome");
  if (existsSync(sibling)) return sibling;
  return fromEnv || "/Users/bobhopp/RETROVERSE_v2/apps/retroverse-welcome";
}

export function coverFsRoot(): string {
  const fromEnv = process.env.RETROVERSE_COVER_FS_ROOT?.trim();
  if (fromEnv && existsSync(fromEnv)) return fromEnv;
  const welcomePublic = join(welcomeRoot(), "public");
  if (existsSync(welcomePublic)) return welcomePublic;
  return join(process.cwd(), "public");
}

export function backfillStatePath(): string {
  return join(process.cwd(), "reports/cover_backfill/state.json");
}

export function backfillBatchLogPath(batchId: string): string {
  return join(process.cwd(), "reports/cover_backfill", `batch_${batchId}.json`);
}

export function skipFailedRunStatePath(): string {
  return join(process.cwd(), "reports/cover_backfill/skip_failed_run_state.json");
}

export function skipFailedRunReportPath(): string {
  return join(process.cwd(), "reports/cover_backfill/skip_failed_run_report.json");
}

export function backfillRunReportPath(): string {
  return join(process.cwd(), "reports/cover_backfill/backfill_run_report.json");
}
