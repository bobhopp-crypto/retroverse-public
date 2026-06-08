import { readFile } from "node:fs/promises";
import { readdir } from "node:fs/promises";
import { join } from "node:path";

import { coverFsRoot } from "@/lib/covers/backfill/paths";
import type { BackfillQueueRow } from "@/lib/covers/backfill/types";

const IMAGE_EXT = /\.(jpe?g|png|webp|gif)$/i;

function ts(): string {
  return new Date().toISOString();
}

function logAcquireStage(
  rval: string,
  stage: "START" | "SEARCH" | "DOWNLOAD" | "WRITE" | "PROMOTE" | "COMPLETE",
  detail = "",
): void {
  const suffix = detail ? ` ${detail}` : "";
  process.stderr.write(`[cover-backfill][${ts()}][${rval}] ${stage}${suffix}\n`);
}

export type DirectAcquireResult =
  | "FOUND"
  | "DOWNLOADED"
  | "NOT_FOUND";

function parseDirectResult(stdout: string): DirectAcquireResult | null {
  const match = stdout.match(/itunes_fill_direct_result=(FOUND|DOWNLOADED|NOT_FOUND)/);
  return (match?.[1] as DirectAcquireResult | undefined) ?? null;
}

async function loadWelcomeDotEnv(welcomeRootPath: string): Promise<Record<string, string>> {
  const envPath = join(welcomeRootPath, ".env.local");
  try {
    const text = await readFile(envPath, "utf8");
    const out: Record<string, string> = {};
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      out[key] = value;
    }
    return out;
  } catch {
    return {};
  }
}

/** Invoke retroverse-welcome iTunes fill for one album — direct RVAL mode (no Supabase queue slice). */
export async function acquireCoverViaWelcome(row: BackfillQueueRow): Promise<{
  ok: boolean;
  reason: string;
  directResult?: DirectAcquireResult;
  deployRel?: string | null;
  deployAbs?: string | null;
  searchTerm?: string | null;
}> {
  const { spawn } = await import("node:child_process");
  const { welcomeRoot } = await import("@/lib/covers/backfill/paths");

  const welcome = welcomeRoot();
  const welcomeEnv = await loadWelcomeDotEnv(welcome);
  let stdout = "";
  const acquireTimeoutMs = Number(process.env.COVER_BACKFILL_ACQUIRE_TIMEOUT_MS ?? "180000");

  logAcquireStage(row.rval, "SEARCH", `launching run_itunes_artwork_fill.ts timeout_ms=${acquireTimeoutMs}`);

  try {
    stdout = await new Promise<string>((resolve, reject) => {
      const proc = spawn("npx", ["tsx", "scripts/run_itunes_artwork_fill.ts"], {
        cwd: welcome,
        env: {
          ...welcomeEnv,
          ...process.env,
          ITUNES_FILL_RVAL: row.rval.trim().toUpperCase(),
          ITUNES_FILL_ARTIST: row.artist,
          ITUNES_FILL_ALBUM: row.album,
          ITUNES_FILL_RELEASE_YEAR: row.releaseYear != null ? String(row.releaseYear) : "",
          ITUNES_FILL_SCOPE: process.env.ITUNES_FILL_SCOPE ?? "all",
          ITUNES_FILL_REQUEST_DELAY_MS: process.env.ITUNES_FILL_REQUEST_DELAY_MS ?? "60",
          ITUNES_FILL_SEARCH_TIMEOUT_MS: process.env.ITUNES_FILL_SEARCH_TIMEOUT_MS ?? "15000",
          ITUNES_FILL_DOWNLOAD_TIMEOUT_MS: process.env.ITUNES_FILL_DOWNLOAD_TIMEOUT_MS ?? "20000",
          ITUNES_FILL_OVERALL_TIMEOUT_MS:
            process.env.ITUNES_FILL_OVERALL_TIMEOUT_MS ?? String(acquireTimeoutMs),
        },
        stdio: ["ignore", "pipe", "pipe"],
        detached: true,
      });

      let out = "";
      let err = "";
      let settled = false;
      const tryFinalizeFromOutput = () => {
        if (settled) return;
        if (!/itunes_fill_direct_result=(FOUND|DOWNLOADED|NOT_FOUND)/.test(out + "\n" + err)) return;
        settled = true;
        clearTimeout(timer);
        try {
          process.kill(-proc.pid!, "SIGKILL");
        } catch {
          // best-effort
        }
        resolve([out, err].filter(Boolean).join("\n"));
      };
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        try {
          process.kill(-proc.pid!, "SIGKILL");
        } catch {
          // best-effort group kill
        }
        reject(new Error(`acquire_timeout:${acquireTimeoutMs}ms`));
      }, acquireTimeoutMs);

      proc.stdout.on("data", (c: Buffer) => {
        const s = c.toString();
        out += s;
        if (s.includes("[itunes-fill]")) {
          process.stderr.write(s);
        }
        tryFinalizeFromOutput();
      });
      proc.stderr.on("data", (c: Buffer) => {
        const s = c.toString();
        err += s;
        if (s.includes("[itunes-fill]")) {
          process.stderr.write(s);
        }
        tryFinalizeFromOutput();
      });
      proc.on("error", (e) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(e);
      });
      proc.on("close", (code) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        const merged = [out, err].filter(Boolean).join("\n");
        if (code === 0) resolve(merged);
        else reject(new Error(merged || `itunes_fill_exit_${code ?? "null"}`));
      });
    });
  } catch (e) {
    const err = e as { message?: string };
    stdout = [stdout, err.message].filter(Boolean).join("\n");
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("Supabase") || msg.includes("ENOENT")) {
      return { ok: false, reason: msg.slice(0, 240) };
    }
    // iTunes fill may exit non-zero while still writing file — verify below
  }

  const directResult = parseDirectResult(stdout);
  const deployRel =
    stdout.match(/itunes_fill_direct_deploy_rel=(.+)/)?.[1]?.trim() ??
    (await findAcquiredCoverRelPath(row.rval));
  const deployAbs = stdout.match(/itunes_fill_direct_deploy_abs=(.+)/)?.[1]?.trim() ?? null;
  const searchTerm = stdout.match(/itunes_fill_direct_search=(.+)/)?.[1]?.trim() ?? null;

  if (directResult === "NOT_FOUND" || (!directResult && !deployRel)) {
    const reason =
      stdout.match(/itunes_fill_direct_reason=(.+)/)?.[1]?.trim() ??
      stdout.match(/itunes_fill_direct_rejection=(.+)/)?.[1]?.trim() ??
      directResult ??
      "itunes_no_file_on_disk";
    return {
      ok: false,
      reason,
      directResult: directResult ?? "NOT_FOUND",
      deployRel,
      deployAbs,
      searchTerm,
    };
  }

  const resolved = deployRel ?? (await findAcquiredCoverRelPath(row.rval));
  if (!resolved) {
    return {
      ok: false,
      reason: "itunes_no_file_on_disk",
      directResult: directResult ?? "NOT_FOUND",
      deployRel: null,
      deployAbs,
      searchTerm,
    };
  }

  return {
    ok: true,
    reason: directResult === "FOUND" ? "itunes_found_on_disk" : "itunes_acquired",
    directResult: directResult ?? "DOWNLOADED",
    deployRel: resolved,
    deployAbs,
    searchTerm,
  };
}

/** Find cover file under RVAL folder — canonical ID in filename, no title matching. */
export async function findAcquiredCoverRelPath(rval: string): Promise<string | null> {
  const id = rval.trim().toUpperCase();
  const fsRoot = coverFsRoot();
  const dir = join(fsRoot, "retroverse/covers", id);
  let files: string[];
  try {
    files = await readdir(dir);
  } catch {
    return null;
  }
  const match = files.find(
    (f) => IMAGE_EXT.test(f) && f.toUpperCase().startsWith(`${id}__`),
  );
  if (!match) return null;
  return `retroverse/covers/${id}/${match}`;
}
