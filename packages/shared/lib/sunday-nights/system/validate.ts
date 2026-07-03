import { access } from "fs/promises";
import { join } from "path";

import { inspectPing, inspectQuery } from "@/lib/inspect/pg";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

import { loadSundayAssetLibrary } from "../load-assets";
import { loadSundayEventSongs } from "../load-playlist";
import { loadSundayEventMode } from "../event-mode";
import { loadSundayNightsState } from "../state";
import { SUNDAY_EVENT_YEARS } from "../playlist-types";
import { usePostgresSundayNightsState } from "../storage-mode";

export type SundayValidationResult = {
  pass: boolean;
  failures: string[];
  checks: { name: string; ok: boolean; detail?: string }[];
};

export async function validateSundayNights(): Promise<SundayValidationResult> {
  const checks: SundayValidationResult["checks"] = [];
  const failures: string[] = [];

  function record(name: string, ok: boolean, detail?: string, critical = true) {
    checks.push({ name, ok, detail });
    if (!ok && critical) failures.push(detail ? `${name}: ${detail}` : name);
  }

  for (const year of SUNDAY_EVENT_YEARS) {
    const path = join(process.cwd(), "data", "sunday-nights", "snapshots", `${year}.json`);
    try {
      await access(path);
      record(`snapshot ${year}`, true);
    } catch {
      record(`snapshot ${year}`, false, "file missing");
    }
  }

  try {
    await access(join(process.cwd(), "data", "sunday-nights", "assets.json"));
    record("assets library", true);
  } catch {
    record("assets library", false, "assets.json missing");
  }

  const pg = await inspectPing();
  record("Postgres reachable", pg.ok, pg.error);

  if (usePostgresSundayNightsState() && pg.ok) {
    try {
      const rows = await inspectQuery<{ reg: string | null }>(
        `SELECT to_regclass('public.sunday_nights_state') AS reg`,
      );
      record(
        "state table",
        Boolean(rows[0]?.reg),
        rows[0]?.reg ? undefined : "sunday_nights_state missing",
      );
    } catch (err) {
      record(
        "state table",
        false,
        err instanceof Error ? err.message : "query failed",
      );
    }
  } else if (!usePostgresSundayNightsState()) {
    record("state table", true, "local JSON mode");
  }

  try {
    const event = await loadSundayEventSongs("all");
    record("playlists loaded", event.songs.length > 0, `${event.songs.length} items`);
  } catch (err) {
    record(
      "playlists loaded",
      false,
      err instanceof Error ? err.message : "load failed",
    );
  }

  try {
    const assets = await loadSundayAssetLibrary();
    record("assets loaded", true, `${assets.items.length} items`);
  } catch (err) {
    record(
      "assets loaded",
      false,
      err instanceof Error ? err.message : "load failed",
    );
  }

  try {
    const mode = await loadSundayEventMode();
    record("event mode readable", typeof mode.enabled === "boolean");
  } catch (err) {
    record(
      "event mode readable",
      false,
      err instanceof Error ? err.message : "read failed",
    );
  }

  try {
    await loadSundayNightsState();
    record("live state readable", true);
  } catch (err) {
    record(
      "live state readable",
      false,
      err instanceof Error ? err.message : "read failed",
    );
  }

  record("ops enabled", isOpsEnabled());

  const hook = process.env.VERCEL_DEPLOY_HOOK_URL?.trim();
  record(
    "deploy hook configured",
    Boolean(hook),
    hook ? undefined : "optional — set VERCEL_DEPLOY_HOOK_URL to enable Deploy",
    false,
  );

  return {
    pass: failures.length === 0,
    failures,
    checks,
  };
}
