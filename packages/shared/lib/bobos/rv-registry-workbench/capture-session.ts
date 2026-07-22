import "server-only";

import type { BrowserContext, Page } from "playwright";

import {
  CAPTURE_SESSION_TEST_ROUTE,
  captureProfileDir,
  ensureCaptureDirs,
  getCaptureRuntime,
  loadCaptureSessionState,
  saveCaptureSessionState,
  studioCaptureBase,
  type CaptureSessionStateFile,
  type CaptureSessionStatus,
} from "./capture-profile";
import { detectPageKind } from "./page-kind";

export type CaptureSessionSnapshot = CaptureSessionStateFile & {
  profileDir: string;
};

async function launchPersistent(headless: boolean): Promise<BrowserContext> {
  await ensureCaptureDirs();
  const { chromium } = await import("playwright");
  return chromium.launchPersistentContext(captureProfileDir(), {
    headless,
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    acceptDownloads: false,
  });
}

async function probeSession(context: BrowserContext): Promise<{
  status: CaptureSessionStatus;
  message: string;
  finalUrl: string;
  pageKind: string;
}> {
  const page = context.pages()[0] ?? (await context.newPage());
  const url = `${studioCaptureBase().replace(/\/+$/, "")}${CAPTURE_SESSION_TEST_ROUTE}`;
  await page.goto(url, { waitUntil: "load", timeout: 45_000 });
  await page.waitForTimeout(800);
  const pageKind = await detectPageKind(page);
  const finalUrl = page.url();

  if (pageKind === "pin-gate") {
    return {
      status: "locked",
      message: "PIN gate is still visible on a protected BobOS route.",
      finalUrl,
      pageKind,
    };
  }
  if (pageKind === "access-denied") {
    return {
      status: "locked",
      message: "Access denied on protected BobOS route.",
      finalUrl,
      pageKind,
    };
  }
  if (pageKind === "app") {
    return {
      status: "ready",
      message: "Protected BobOS panel is visible.",
      finalUrl,
      pageKind,
    };
  }
  return {
    status: "unknown",
    message: "Could not classify the protected route response.",
    finalUrl,
    pageKind,
  };
}

export async function getCaptureSessionSnapshot(): Promise<CaptureSessionSnapshot> {
  const runtime = getCaptureRuntime();
  const state = await loadCaptureSessionState();
  return {
    ...state,
    headedOpen: Boolean(runtime.context && runtime.headed),
    profileDir: captureProfileDir(),
  };
}

/**
 * Open the dedicated headed Playwright profile so Bob can unlock BobOS once.
 * Browser stays open; cookies/local storage persist in the profile directory.
 */
export async function openCaptureBrowser(): Promise<CaptureSessionSnapshot> {
  const runtime = getCaptureRuntime();

  if (runtime.context && runtime.headed) {
    const page = runtime.context.pages()[0] ?? (await runtime.context.newPage());
    await page.goto(`${studioCaptureBase().replace(/\/+$/, "")}/ops`, {
      waitUntil: "load",
      timeout: 45_000,
    });
    const state = await saveCaptureSessionState({
      headedOpen: true,
      lastMessage: "Capture browser already open — navigate and enter PIN if needed.",
      lastCheckedAt: new Date().toISOString(),
    });
    return { ...state, headedOpen: true, profileDir: captureProfileDir() };
  }

  // Close any leftover headless handle (should not hold the profile open).
  if (runtime.context) {
    await runtime.context.close().catch(() => null);
    runtime.context = null;
    runtime.headed = false;
  }

  const context = await launchPersistent(false);
  runtime.context = context;
  runtime.headed = true;

  context.on("close", () => {
    const current = getCaptureRuntime();
    if (current.context === context) {
      current.context = null;
      current.headed = false;
    }
    void saveCaptureSessionState({
      headedOpen: false,
      lastMessage: "Capture browser closed. Session cookies remain in the local profile.",
      lastCheckedAt: new Date().toISOString(),
    });
  });

  const page = context.pages()[0] ?? (await context.newPage());
  await page.goto(`${studioCaptureBase().replace(/\/+$/, "")}/ops`, {
    waitUntil: "load",
    timeout: 45_000,
  });

  const state = await saveCaptureSessionState({
    status: "unknown",
    headedOpen: true,
    lastMessage:
      "Capture browser open. Enter the BobOS PIN manually, then run Test Capture Session.",
    lastCheckedAt: new Date().toISOString(),
    testRoute: "/ops",
  });

  return { ...state, headedOpen: true, profileDir: captureProfileDir() };
}

export async function testCaptureSession(): Promise<CaptureSessionSnapshot & {
  ok: boolean;
  pageKind: string;
  finalUrl: string;
}> {
  const runtime = getCaptureRuntime();
  let context = runtime.context;
  let temporary = false;

  if (!context) {
    temporary = true;
    context = await launchPersistent(true);
  }

  try {
    const previous = await loadCaptureSessionState();
    const probe = await probeSession(context);
    let status = probe.status;
    if (
      probe.status === "locked" &&
      (previous.status === "ready" || previous.lastReadyAt) &&
      previous.status !== "locked"
    ) {
      status = "expired";
    }
    const state = await saveCaptureSessionState({
      status,
      headedOpen: Boolean(runtime.context && runtime.headed),
      lastCheckedAt: new Date().toISOString(),
      ...(probe.status === "ready" ? { lastReadyAt: new Date().toISOString() } : {}),
      lastMessage:
        status === "expired"
          ? "Session expired — PIN gate returned. Open Capture Browser and unlock again."
          : probe.message,
      testRoute: CAPTURE_SESSION_TEST_ROUTE,
    });
    return {
      ...state,
      headedOpen: Boolean(runtime.context && runtime.headed),
      profileDir: captureProfileDir(),
      ok: probe.status === "ready",
      pageKind: probe.pageKind,
      finalUrl: probe.finalUrl,
    };
  } finally {
    if (temporary && context) {
      await context.close().catch(() => null);
    }
  }
}

export async function refreshCaptureSessionStatus(): Promise<CaptureSessionSnapshot> {
  const result = await testCaptureSession();
  const { ok: _ok, pageKind: _pk, finalUrl: _fu, ...snapshot } = result;
  return snapshot;
}

/**
 * Run work against the persistent capture profile.
 * Reuses an open headed browser when available; otherwise opens headless and closes after.
 */
export async function withCaptureContext<T>(
  fn: (context: BrowserContext, page: Page) => Promise<T>,
): Promise<T> {
  const runtime = getCaptureRuntime();
  if (runtime.context) {
    const page = runtime.context.pages()[0] ?? (await runtime.context.newPage());
    return fn(runtime.context, page);
  }

  const context = await launchPersistent(true);
  try {
    const page = context.pages()[0] ?? (await context.newPage());
    return await fn(context, page);
  } finally {
    await context.close().catch(() => null);
  }
}
