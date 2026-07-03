import "server-only";

import { existsSync } from "node:fs";
import { mkdir, readFile, stat, unlink, writeFile } from "fs/promises";
import { dirname } from "path";

import type { IsoTimestamp } from "./types";

/** Disk-backed queue store metadata shared by Studio queue adapters. */
export type JsonQueueStoreMeta = {
  version: number;
  paused: boolean;
  updatedAt: IsoTimestamp;
};

/** Options for a single-runner lock file on disk. */
export type RunnerLockOptions = {
  lockPath: string;
  staleMs: number;
};

/** Adapter interface — department queues implement this in later phases. */
export type StudioQueueAdapter<TJob> = {
  enqueue(job: TJob): Promise<TJob>;
  list(limit?: number): Promise<TJob[]>;
  setPaused(paused: boolean): Promise<void>;
};

export type JsonQueueStoreOptions<TStore extends JsonQueueStoreMeta> = {
  filePath: string;
  /** Key on `globalThis` used for the in-memory cache. */
  cacheKey: string;
  createEmpty: () => TStore;
  normalize: (parsed: Partial<TStore>, now: IsoTimestamp) => TStore;
};

export type JsonQueueStore<TStore extends JsonQueueStoreMeta> = {
  load: () => Promise<TStore>;
  save: (store: TStore) => Promise<void>;
  peekCache: () => TStore | undefined;
};

export type InProcessSingleFlight = {
  isRunning: () => boolean;
  tryAcquire: () => boolean;
  release: () => void;
};

export type RunnerLock = {
  acquire: () => Promise<boolean>;
  release: () => Promise<void>;
};

/** ISO timestamp helper for queue persistence. */
export function queueNow(): IsoTimestamp {
  return new Date().toISOString();
}

/** Disk-backed JSON queue with optional in-process cache on `globalThis`. */
export function createJsonQueueStore<TStore extends JsonQueueStoreMeta>(
  options: JsonQueueStoreOptions<TStore>,
): JsonQueueStore<TStore> {
  type GlobalWithCache = typeof globalThis & Record<string, TStore | undefined>;
  const globalStore = globalThis as GlobalWithCache;

  async function load(): Promise<TStore> {
    const cached = globalStore[options.cacheKey];
    if (cached) return cached;

    try {
      const raw = await readFile(options.filePath, "utf8");
      const parsed = JSON.parse(raw) as Partial<TStore>;
      const store = options.normalize(parsed, queueNow());
      globalStore[options.cacheKey] = store;
      return store;
    } catch {
      const store = options.createEmpty();
      globalStore[options.cacheKey] = store;
      return store;
    }
  }

  async function save(store: TStore): Promise<void> {
    store.updatedAt = queueNow();
    globalStore[options.cacheKey] = store;
    await mkdir(dirname(options.filePath), { recursive: true });
    await writeFile(options.filePath, `${JSON.stringify(store, null, 2)}\n`, "utf8");
  }

  function peekCache(): TStore | undefined {
    return globalStore[options.cacheKey];
  }

  return { load, save, peekCache };
}

/** In-process single-flight guard (one drain loop per process). */
export function createInProcessSingleFlight(runningKey: string): InProcessSingleFlight {
  type GlobalWithFlag = typeof globalThis & Record<string, boolean | undefined>;
  const globalStore = globalThis as GlobalWithFlag;

  return {
    isRunning(): boolean {
      return globalStore[runningKey] === true;
    },
    tryAcquire(): boolean {
      if (globalStore[runningKey]) return false;
      globalStore[runningKey] = true;
      return true;
    },
    release(): void {
      globalStore[runningKey] = false;
    },
  };
}

/** File-backed runner lock with stale recovery (for detached worker processes). */
export function createRunnerLock(options: RunnerLockOptions): RunnerLock {
  const { lockPath, staleMs } = options;

  return {
    async acquire(): Promise<boolean> {
      if (existsSync(lockPath)) {
        try {
          const { mtimeMs } = await stat(lockPath);
          if (Date.now() - mtimeMs < staleMs) return false;
          await unlink(lockPath);
        } catch {
          return false;
        }
      }
      await writeFile(lockPath, `${process.pid}\n${queueNow()}\n`, "utf8");
      return true;
    },
    async release(): Promise<void> {
      try {
        await unlink(lockPath);
      } catch {
        // ignore missing lock
      }
    },
  };
}

/** Default stale window used by existing ops job runners (15 minutes). */
export const RUNNER_LOCK_STALE_MS = 15 * 60 * 1000;
