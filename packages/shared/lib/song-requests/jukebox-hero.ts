import "server-only";

import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { createReadStream, existsSync } from "node:fs";
import { mkdir, rename, stat } from "node:fs/promises";
import { join } from "node:path";
import { Readable } from "node:stream";
import { promisify } from "node:util";

import { scanVdjDatabase, normVdjPath } from "@/lib/ops/intelligence/vdj-database";
import { retroverseDataRoot } from "@/lib/retroverse-data-root";

import { resolveJukeboxHeroTrack } from "./jukebox-local-store";

const execFileAsync = promisify(execFile);
const inFlight = new Map<string, Promise<string | null>>();

function repoRoot(): string {
  if (existsSync(join(process.cwd(), "data", "ops", "intelligence"))) return process.cwd();
  const candidate = join(process.cwd(), "..", "..");
  return existsSync(join(candidate, "data", "ops", "intelligence")) ? candidate : process.cwd();
}

function preparedHero(rvtr: string | null): string | null {
  if (!rvtr || !/^RVTR\d{6}$/i.test(rvtr)) return null;
  const base = join(repoRoot(), "data", "ops", "intelligence", "research-department", rvtr.toUpperCase(), "visual-assets");
  for (const filename of ["hero-video.jpg", "hero.jpg", "performance.jpg", "alternate.jpg"]) {
    const path = join(base, filename);
    if (existsSync(path)) return path;
  }
  return null;
}

async function extractFrame(mediaPath: string): Promise<string | null> {
  if (!existsSync(mediaPath)) return null;
  const mediaStat = await stat(mediaPath).catch(() => null);
  if (!mediaStat) return null;
  const key = createHash("sha256")
    .update(`${mediaPath}\0${mediaStat.mtimeMs}\0${mediaStat.size}`)
    .digest("hex")
    .slice(0, 32);
  const directory = join(retroverseDataRoot(), "cache", "video-jukebox", "heroes");
  const destination = join(directory, `${key}.jpg`);
  if (existsSync(destination)) return destination;
  const pending = inFlight.get(key);
  if (pending) return pending;
  const task = (async () => {
    await mkdir(directory, { recursive: true });
    const scan = await scanVdjDatabase();
    const entry = scan.entries.find((candidate) => candidate.filePathNorm === normVdjPath(mediaPath));
    const seek = Math.max(8, Math.min(45, Math.round((entry?.durationSeconds ?? 100) * 0.22)));
    const temporary = join(directory, `${key}.${process.pid}.jpg`);
    try {
      await execFileAsync(
        "/opt/homebrew/bin/ffmpeg",
        [
          "-hide_banner", "-loglevel", "error", "-y", "-ss", String(seek), "-i", mediaPath,
          "-frames:v", "1", "-vf", "scale=960:540:force_original_aspect_ratio=increase,crop=960:540",
          "-q:v", "3", temporary,
        ],
        { timeout: 25_000, maxBuffer: 1_000_000 },
      );
      await rename(temporary, destination);
      return destination;
    } catch {
      return null;
    }
  })().finally(() => inFlight.delete(key));
  inFlight.set(key, task);
  return task;
}

function streamToWeb(stream: Readable): ReadableStream<Uint8Array> {
  return Readable.toWeb(stream) as ReadableStream<Uint8Array>;
}

export async function loadJukeboxHeroResponse(trackKey: string): Promise<Response> {
  const track = await resolveJukeboxHeroTrack(trackKey);
  const path = preparedHero(track.rvtr) ?? (await extractFrame(track.mediaPath));
  if (!path || !existsSync(path)) return new Response(null, { status: 404 });
  return new Response(streamToWeb(createReadStream(path)), {
    status: 200,
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
