import "server-only";

import { existsSync, readdirSync } from "fs";

import { RV_REGISTRY } from "@/lib/bobos/rv-registry";

import {
  loadScreenshotMeta,
  markScreenshotInvalid,
  saveScreenshotMeta,
} from "./capture-profile";
import { captureWorkbenchScreenshot } from "./screenshot";
import { resolveOpenHref } from "./routes";
import { workbenchScreenshotsDir } from "./store";

function listScreenshotIds(): string[] {
  const dir = workbenchScreenshotsDir();
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith(".png"))
    .map((name) => name.replace(/\.png$/i, "").toUpperCase());
}

function routeNeedsOpsGate(route: string | null): boolean {
  if (!route) return false;
  const href = resolveOpenHref(route) ?? route;
  return href.startsWith("/ops") || href.startsWith("/diagnostics");
}

/**
 * Find thumbnails that are (or were) PIN-gate captures.
 * Moves invalid files aside; does not delete valid thumbnails.
 */
export async function findInvalidScreenshots(): Promise<{
  scanned: number;
  invalidIds: string[];
  keptValid: number;
}> {
  const ids = listScreenshotIds();
  const metaFile = await loadScreenshotMeta();
  const invalidIds: string[] = [];

  for (const rvId of ids) {
    const entry = RV_REGISTRY.find((item) => item.id.toUpperCase() === rvId);
    const meta = metaFile.entries[rvId] ?? metaFile.entries[entry?.id ?? ""];
    const finalUrl = meta?.finalUrl ?? "";
    const kind = meta?.pageKind ?? "";

    let invalid = false;
    let reason = "";

    if (kind === "pin-gate" || /\/internal\/ops-pin/i.test(finalUrl)) {
      invalid = true;
      reason = "Metadata indicates PIN-gate capture";
    } else if (meta && meta.valid === false) {
      invalid = true;
      reason = meta.reason || "Marked invalid in metadata";
    } else if (routeNeedsOpsGate(entry?.route ?? null) && !meta?.authenticated) {
      // Legacy captures of /ops/* without an authenticated session flag are PIN-gate photos.
      invalid = true;
      reason = "Protected /ops route captured without authenticated session metadata";
    }

    if (invalid) {
      const moved = await markScreenshotInvalid(entry?.id ?? rvId, reason);
      if (moved) invalidIds.push(entry?.id ?? rvId);
    }
  }

  return {
    scanned: ids.length,
    invalidIds,
    keptValid: ids.length - invalidIds.length,
  };
}

export async function recaptureInvalidScreenshots(): Promise<{
  attempted: string[];
  succeeded: string[];
  failed: Array<{ rvId: string; error: string; sessionLocked?: boolean }>;
}> {
  const metaFile = await loadScreenshotMeta();
  const fromMeta = Object.entries(metaFile.entries)
    .filter(([, entry]) => entry.valid === false)
    .map(([id]) => id);

  const attempted = [...new Set(fromMeta)].filter((id) => {
    const entry = RV_REGISTRY.find((item) => item.id === id);
    return Boolean(entry?.route);
  });

  const succeeded: string[] = [];
  const failed: Array<{ rvId: string; error: string; sessionLocked?: boolean }> = [];

  for (const rvId of attempted) {
    const result = await captureWorkbenchScreenshot(rvId);
    if (result.ok) {
      succeeded.push(rvId);
      const meta = await loadScreenshotMeta();
      if (meta.entries[rvId]) {
        meta.entries[rvId] = { ...meta.entries[rvId], valid: true, reason: undefined };
        await saveScreenshotMeta(meta);
      }
    } else {
      failed.push({
        rvId,
        error: result.error || "Capture failed",
        sessionLocked: result.sessionLocked,
      });
    }
  }

  return { attempted, succeeded, failed };
}
