import { randomUUID } from "crypto";
import { mkdir, open, readFile, rename, rm, stat, writeFile } from "fs/promises";
import { hostname } from "os";
import { dirname } from "path";

import { applyRegistrationById, resolveExactPass } from "./serials";
import type { GeneratedPass, PassLibraryFile, PassRegistration } from "./types";
import type { NormalizedPassSerial } from "@/lib/retroverse-pass/types";

const LOCK_RETRY_MS = 10;
const LOCK_TIMEOUT_MS = 5_000;
const LOCK_STALE_MS = 60_000;

type LockOptions = {
  retryMs?: number;
  timeoutMs?: number;
  staleMs?: number;
};

type LockOwner = { pid: number; hostname: string; createdAt: string };

async function wait(milliseconds: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function processIsAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

async function recoverStaleLock(lockPath: string, staleMs: number): Promise<boolean> {
  let lockStat: Awaited<ReturnType<typeof stat>>;
  let owner: LockOwner | null = null;
  try {
    lockStat = await stat(lockPath);
    if (Date.now() - lockStat.mtimeMs < staleMs) return false;
    try {
      owner = JSON.parse(await readFile(lockPath, "utf8")) as LockOwner;
    } catch {
      owner = null;
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return true;
    throw error;
  }

  if (owner?.hostname === hostname() && Number.isSafeInteger(owner.pid) && processIsAlive(owner.pid)) {
    return false;
  }
  const verified = await stat(lockPath);
  if (verified.ino !== lockStat.ino || verified.mtimeMs !== lockStat.mtimeMs) return false;
  await rm(lockPath);
  return true;
}

export async function withExclusiveFileLock<T>(
  path: string,
  operation: () => Promise<T>,
  options: LockOptions = {},
): Promise<T> {
  const lockPath = `${path}.lock`;
  const retryMs = options.retryMs ?? LOCK_RETRY_MS;
  const deadline = Date.now() + (options.timeoutMs ?? LOCK_TIMEOUT_MS);
  const staleMs = options.staleMs ?? LOCK_STALE_MS;
  let lock: Awaited<ReturnType<typeof open>> | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;

  while (!lock) {
    try {
      lock = await open(lockPath, "wx");
      const owner: LockOwner = { pid: process.pid, hostname: hostname(), createdAt: new Date().toISOString() };
      await lock.writeFile(`${JSON.stringify(owner)}\n`, "utf8");
      const heartbeatMs = Math.max(1, Math.floor(staleMs / 3));
      heartbeat = setInterval(() => {
        const now = new Date();
        void lock?.utimes(now, now).catch(() => undefined);
      }, heartbeatMs);
      heartbeat.unref();
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      if (await recoverStaleLock(lockPath, staleMs)) continue;
      if (Date.now() >= deadline) throw error;
      await wait(retryMs);
    }
  }

  try {
    return await operation();
  } finally {
    if (heartbeat) clearInterval(heartbeat);
    await lock.close();
    await rm(lockPath, { force: true });
  }
}

async function readLibrary(path: string): Promise<PassLibraryFile> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as PassLibraryFile;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { version: 1, passes: [] };
    throw error;
  }
}

async function writeLibraryAtomically(path: string, value: PassLibraryFile): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporaryPath = `${path}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    await rename(temporaryPath, path);
  } finally {
    await rm(temporaryPath, { force: true });
  }
}

/** Re-read and update the library while holding a cross-process exclusive lock. */
export type LibraryRegistrationResult =
  | { state: "registered"; pass: GeneratedPass; changed: boolean }
  | { state: "not_found" | "ambiguous" | "mismatch" };

export async function appendPassesInLibraryFile(path: string, passes: GeneratedPass[]): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await withExclusiveFileLock(path, async () => {
    const file = await readLibrary(path);
    const existingIds = new Set(file.passes.map((pass) => pass.id));
    const additions = passes.filter((pass) => !existingIds.has(pass.id));
    if (additions.length > 0) {
      await writeLibraryAtomically(path, { version: 1, passes: [...file.passes, ...additions] });
    }
  });
}

export async function registerPassInLibraryFile(
  path: string,
  normalized: NormalizedPassSerial,
  passId: string,
  registration: PassRegistration,
): Promise<LibraryRegistrationResult> {
  await mkdir(dirname(path), { recursive: true });
  return withExclusiveFileLock(path, async () => {
    const file = await readLibrary(path);
    const resolution = resolveExactPass(file.passes, normalized);
    if (resolution.state !== "found") return resolution;
    if (resolution.pass.id !== passId) return { state: "mismatch" };
    const result = applyRegistrationById(file.passes, passId, registration);
    if (!result) return { state: "not_found" };
    const changed = result.passes !== file.passes;
    if (changed) {
      await writeLibraryAtomically(path, { version: 1, passes: result.passes });
    }
    return { state: "registered", pass: result.pass, changed };
  });
}
