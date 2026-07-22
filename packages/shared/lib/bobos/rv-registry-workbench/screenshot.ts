import "server-only";

import { existsSync } from "fs";
import { mkdir, readFile } from "fs/promises";

import { getRvEntry } from "@/lib/bobos/rv-registry";

import {
  liveCaptureBase,
  studioCaptureBase,
  upsertScreenshotMeta,
} from "./capture-profile";
import { withCaptureContext } from "./capture-session";
import { detectPageKind, isInvalidThumbnailKind } from "./page-kind";
import { resolveOpenHref } from "./routes";
import { screenshotPathFor, workbenchScreenshotsDir } from "./store";
import type { ScreenshotCaptureResult } from "./types";

export type { ScreenshotCaptureResult };

/** Short human reason for card UI — not a Playwright stack dump. */
export function shortenCaptureError(message: string): string {
  const text = message.trim();
  if (/Executable doesn't exist|playwright install/i.test(text)) {
    return "Playwright Chromium missing";
  }
  if (/Timeout|timed out|timeout/i.test(text)) {
    if (/Navigation|goto|net::/i.test(text)) return "Navigation timeout";
    return "Timeout";
  }
  if (/ERR_CONNECTION_REFUSED|ECONNREFUSED/i.test(text)) return "Server not reachable";
  if (/ENOTFOUND|getaddrinfo/i.test(text)) return "Host not found";
  if (/net::ERR_/i.test(text)) {
    const match = text.match(/net::ERR_[A-Z0-9_]+/);
    return match?.[0] ?? "Network error";
  }
  const firstLine = text.split("\n")[0]?.trim() ?? text;
  return firstLine.length > 80 ? `${firstLine.slice(0, 77)}…` : firstLine;
}

function fail(
  rvId: string,
  error: string,
  extras: Partial<ScreenshotCaptureResult> = {},
): ScreenshotCaptureResult {
  return {
    ok: false,
    rvId,
    path: null,
    url: null,
    attemptedUrl: extras.attemptedUrl ?? null,
    finalUrl: extras.finalUrl ?? null,
    consoleErrors: extras.consoleErrors ?? [],
    error: shortenCaptureError(error),
    detail: extras.detail ?? error,
    sessionLocked: extras.sessionLocked,
    pageKind: extras.pageKind,
  };
}

/** Public Live surfaces are captured against the Live app; everything else against Studio. */
export function resolveCaptureTarget(route: string): { base: string; href: string } {
  const openHref = resolveOpenHref(route);
  if (!openHref) {
    throw new Error(`Cannot resolve open href for route ${route}`);
  }

  const livePrefixes = [
    "/retroverse-live",
    "/sunday-nights",
    "/pass/",
    "/song/",
    "/artist/",
    "/album/",
    "/track/",
    "/experience/",
    "/giveaway/",
    "/retroverse-2/",
    "/retroverse/",
  ];

  const isRootLive = openHref === "/";
  const isLive =
    isRootLive ||
    livePrefixes.some((prefix) => openHref === prefix.slice(0, -1) || openHref.startsWith(prefix));

  return { base: isLive ? liveCaptureBase() : studioCaptureBase(), href: openHref };
}

export async function readWorkbenchScreenshot(rvId: string): Promise<Buffer | null> {
  const path = screenshotPathFor(rvId);
  if (!existsSync(path)) return null;
  return readFile(path);
}

/**
 * Photograph-only capture using the persistent authenticated profile.
 * Never clicks, fills forms, or submits the PIN.
 * Refuses to save PIN-gate / access-denied pages as panel thumbnails.
 */
export async function captureWorkbenchScreenshot(rvId: string): Promise<ScreenshotCaptureResult> {
  const entry = getRvEntry(rvId);
  if (!entry) {
    return fail(rvId, `Unknown RV ID: ${rvId}`);
  }
  if (!entry.route) {
    return fail(rvId, "No route to capture.");
  }

  let target: ReturnType<typeof resolveCaptureTarget>;
  try {
    target = resolveCaptureTarget(entry.route);
  } catch (err) {
    return fail(rvId, err instanceof Error ? err.message : "Could not resolve capture URL");
  }

  const attemptedUrl = `${target.base.replace(/\/+$/, "")}${target.href}`;
  await mkdir(workbenchScreenshotsDir(), { recursive: true });
  const outPath = screenshotPathFor(rvId);
  const hadValidScreenshot = existsSync(outPath);
  const consoleErrors: string[] = [];
  let finalUrl: string | null = null;

  try {
    return await withCaptureContext(async (_context, page) => {
      page.on("console", (msg) => {
        if (msg.type() === "error") {
          const text = msg.text().trim();
          if (text) consoleErrors.push(text);
        }
      });
      page.on("pageerror", (err) => {
        const text = err.message.trim();
        if (text) consoleErrors.push(text);
      });

      await page.goto(attemptedUrl, { waitUntil: "load", timeout: 45_000 });
      await page.waitForTimeout(1000);
      finalUrl = page.url();
      const pageKind = await detectPageKind(page);

      if (isInvalidThumbnailKind(pageKind)) {
        return fail(rvId, "Capture session locked", {
          attemptedUrl,
          finalUrl,
          consoleErrors: consoleErrors.slice(0, 20),
          sessionLocked: true,
          pageKind,
          detail:
            pageKind === "pin-gate"
              ? "Page shows the BobOS PIN gate. Open Capture Browser, unlock once, then retry. Existing valid thumbnails were not overwritten."
              : "Page shows an access-denied screen. Existing valid thumbnails were not overwritten.",
        });
      }

      await page.screenshot({ path: outPath, type: "png", fullPage: false });
      await upsertScreenshotMeta(rvId, {
        valid: true,
        authenticated: true,
        pageKind,
        finalUrl,
        attemptedUrl,
        capturedAt: new Date().toISOString(),
      });

      return {
        ok: true,
        rvId,
        path: outPath,
        url: `/api/bobos/rv-registry-workbench/screenshot?id=${encodeURIComponent(rvId)}&t=${Date.now()}`,
        attemptedUrl,
        finalUrl,
        consoleErrors: consoleErrors.slice(0, 20),
        pageKind,
      };
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Screenshot capture failed";
    // Preserve existing valid file on failure.
    if (hadValidScreenshot && !existsSync(outPath)) {
      // Should not happen — we only write after validation.
    }
    return fail(rvId, message, {
      attemptedUrl,
      finalUrl,
      consoleErrors: consoleErrors.slice(0, 20),
    });
  }
}
