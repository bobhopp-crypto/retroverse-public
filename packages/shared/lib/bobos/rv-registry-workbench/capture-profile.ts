import "server-only";

import { existsSync } from "fs";
import { mkdir, readFile, rename, writeFile } from "fs/promises";
import { join } from "path";

import type { BrowserContext } from "playwright";

import { workbenchDir, workbenchScreenshotsDir } from "./store";

export type ScreenshotMetaEntry = {
  valid: boolean;
  authenticated: boolean;
  pageKind: string;
  finalUrl: string | null;
  attemptedUrl: string | null;
  capturedAt: string;
  reason?: string;
};

export type ScreenshotMetaFile = {
  version: 1;
  entries: Record<string, ScreenshotMetaEntry>;
};

export type CaptureSessionStatus = "locked" | "ready" | "expired" | "unknown";

export type CaptureSessionStateFile = {
  version: 1;
  status: CaptureSessionStatus;
  headedOpen: boolean;
  lastCheckedAt: string | null;
  lastReadyAt: string | null;
  lastMessage: string | null;
  testRoute: string | null;
};

export type CaptureRuntime = {
  context: BrowserContext | null;
  headed: boolean;
};

declare global {
  // eslint-disable-next-line no-var
  var __rvRegistryWorkbenchCapture: CaptureRuntime | undefined;
}

export function captureProfileDir(): string {
  return join(workbenchDir(), "playwright-profile");
}

export function screenshotMetaPath(): string {
  return join(workbenchDir(), "screenshot-meta.json");
}

export function captureSessionStatePath(): string {
  return join(workbenchDir(), "capture-session.json");
}

export function invalidScreenshotsDir(): string {
  return join(workbenchScreenshotsDir(), "invalid");
}

export function getCaptureRuntime(): CaptureRuntime {
  if (!globalThis.__rvRegistryWorkbenchCapture) {
    globalThis.__rvRegistryWorkbenchCapture = { context: null, headed: false };
  }
  return globalThis.__rvRegistryWorkbenchCapture;
}

export async function ensureCaptureDirs(): Promise<void> {
  await mkdir(workbenchDir(), { recursive: true });
  await mkdir(workbenchScreenshotsDir(), { recursive: true });
  await mkdir(captureProfileDir(), { recursive: true });
  await mkdir(invalidScreenshotsDir(), { recursive: true });
}

export async function loadScreenshotMeta(): Promise<ScreenshotMetaFile> {
  try {
    const raw = await readFile(screenshotMetaPath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<ScreenshotMetaFile>;
    if (!parsed?.entries || typeof parsed.entries !== "object") {
      return { version: 1, entries: {} };
    }
    return { version: 1, entries: parsed.entries };
  } catch {
    return { version: 1, entries: {} };
  }
}

export async function saveScreenshotMeta(file: ScreenshotMetaFile): Promise<void> {
  await ensureCaptureDirs();
  await writeFile(screenshotMetaPath(), `${JSON.stringify(file, null, 2)}\n`, "utf8");
}

export async function upsertScreenshotMeta(
  rvId: string,
  entry: ScreenshotMetaEntry,
): Promise<void> {
  const file = await loadScreenshotMeta();
  file.entries[rvId] = entry;
  await saveScreenshotMeta(file);
}

export async function loadCaptureSessionState(): Promise<CaptureSessionStateFile> {
  try {
    const raw = await readFile(captureSessionStatePath(), "utf8");
    const parsed = JSON.parse(raw) as Partial<CaptureSessionStateFile>;
    return {
      version: 1,
      status: normalizeStatus(parsed.status),
      headedOpen: Boolean(parsed.headedOpen),
      lastCheckedAt: typeof parsed.lastCheckedAt === "string" ? parsed.lastCheckedAt : null,
      lastReadyAt: typeof parsed.lastReadyAt === "string" ? parsed.lastReadyAt : null,
      lastMessage: typeof parsed.lastMessage === "string" ? parsed.lastMessage : null,
      testRoute: typeof parsed.testRoute === "string" ? parsed.testRoute : null,
    };
  } catch {
    return {
      version: 1,
      status: "unknown",
      headedOpen: false,
      lastCheckedAt: null,
      lastReadyAt: null,
      lastMessage: null,
      testRoute: null,
    };
  }
}

export async function saveCaptureSessionState(
  patch: Partial<CaptureSessionStateFile>,
): Promise<CaptureSessionStateFile> {
  await ensureCaptureDirs();
  const current = await loadCaptureSessionState();
  const next: CaptureSessionStateFile = {
    ...current,
    ...patch,
    version: 1,
  };
  await writeFile(captureSessionStatePath(), `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return next;
}

export async function markScreenshotInvalid(rvId: string, reason: string): Promise<boolean> {
  const { screenshotPathFor } = await import("./store");
  const src = screenshotPathFor(rvId);
  if (!existsSync(src)) return false;
  await ensureCaptureDirs();
  const dest = join(invalidScreenshotsDir(), `${rvId.trim().toUpperCase()}.png`);
  await rename(src, dest).catch(async () => {
    // Cross-device fallback
    const { copyFile, unlink } = await import("fs/promises");
    await copyFile(src, dest);
    await unlink(src);
  });
  const meta = await loadScreenshotMeta();
  meta.entries[rvId] = {
    valid: false,
    authenticated: false,
    pageKind: "pin-gate",
    finalUrl: meta.entries[rvId]?.finalUrl ?? null,
    attemptedUrl: meta.entries[rvId]?.attemptedUrl ?? null,
    capturedAt: meta.entries[rvId]?.capturedAt ?? new Date().toISOString(),
    reason,
  };
  await saveScreenshotMeta(meta);
  return true;
}

export function studioCaptureBase(): string {
  return (
    process.env.RV_WORKBENCH_STUDIO_URL?.trim() ||
    process.env.RETROVERSE_STUDIO_URL?.trim() ||
    "http://127.0.0.1:3000"
  );
}

export function liveCaptureBase(): string {
  return (
    process.env.RV_WORKBENCH_LIVE_URL?.trim() ||
    process.env.RETROVERSE_LIVE_ORIGIN?.trim() ||
    "http://127.0.0.1:3100"
  );
}

/** Known protected Studio route used for session probes. */
export const CAPTURE_SESSION_TEST_ROUTE = "/ops/map";

function normalizeStatus(value: unknown): CaptureSessionStatus {
  if (value === "locked" || value === "ready" || value === "expired" || value === "unknown") {
    return value;
  }
  return "unknown";
}
