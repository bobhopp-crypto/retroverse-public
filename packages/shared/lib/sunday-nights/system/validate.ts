import { access } from "fs/promises";
import { join } from "path";

import { isOpsEnabled } from "@/lib/ops/ops-gate";
import { redisCommand, redisLiveStateConfigured } from "../redis-live-state";

import { loadSundayAssetLibrary } from "../load-assets";
import { loadSundayEventSongs } from "../load-playlist";
import { loadSundayEventMode } from "../event-mode";
import { loadSundayNightsState } from "../state";
import { SUNDAY_EVENT_YEARS } from "../playlist-types";
import { useRemoteSundayNightsState } from "../storage-mode";

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

  if (useRemoteSundayNightsState()) {
    try {
      const pong = redisLiveStateConfigured() ? await redisCommand(["PING"]) : null;
      record("remote state store", pong === "PONG", pong === "PONG" ? undefined : "Redis unavailable");
    } catch (err) {
      record("remote state store", false, err instanceof Error ? err.message : "request failed");
    }
  } else {
    record("local state", true, "JSON mode");
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
