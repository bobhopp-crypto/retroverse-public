import { randomUUID } from "crypto";
import { mkdir, open, readFile, rename, rm, writeFile } from "fs/promises";
import { dirname } from "path";

import { applyRegistrationById, resolveExactPass } from "./serials";
import type { GeneratedPass, PassLibraryFile, PassRegistration } from "./types";
import type { NormalizedPassSerial } from "@/lib/retroverse-pass/types";

const LOCK_RETRY_MS = 10;
const LOCK_TIMEOUT_MS = 5_000;

async function wait(milliseconds: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function withExclusiveFileLock<T>(path: string, operation: () => Promise<T>): Promise<T> {
  const lockPath = `${path}.lock`;
  const deadline = Date.now() + LOCK_TIMEOUT_MS;
  let lock: Awaited<ReturnType<typeof open>> | null = null;

  while (!lock) {
    try {
      lock = await open(lockPath, "wx");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST" || Date.now() >= deadline) throw error;
      await wait(LOCK_RETRY_MS);
    }
  }

  try {
    return await operation();
  } finally {
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
