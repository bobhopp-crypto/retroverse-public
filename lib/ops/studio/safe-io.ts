import "server-only";

import { readFile } from "fs/promises";

const DEFAULT_JSON_TIMEOUT_MS = 2500;

export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  fallback: T,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => {
        timer = setTimeout(() => resolve(fallback), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Parse JSON safely — returns fallback on empty file, partial write, or parse error. */
export async function readJsonFileSafe<T>(
  path: string,
  fallback: T,
  timeoutMs = DEFAULT_JSON_TIMEOUT_MS,
): Promise<T> {
  return withTimeout(
    (async () => {
      try {
        const raw = await readFile(path, "utf8");
        if (!raw.trim()) return fallback;
        return JSON.parse(raw) as T;
      } catch {
        return fallback;
      }
    })(),
    timeoutMs,
    fallback,
  );
}
