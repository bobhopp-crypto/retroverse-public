import "server-only";

import type { Page } from "playwright";

export type CapturePageKind = "pin-gate" | "access-denied" | "app" | "unknown";

/**
 * Detect whether the loaded page is the BobOS / ops PIN gate vs real content.
 * Photograph-only — never interacts.
 */
export async function detectPageKind(page: Page): Promise<CapturePageKind> {
  const url = page.url();
  if (/\/internal\/ops-pin(?:\?|$)/i.test(url)) return "pin-gate";

  const signals = await page.evaluate(() => {
    const text = (document.body?.innerText || "").toLowerCase();
    const hasPinInput = Boolean(document.querySelector("#ops-pin"));
    const hasPinCard = Boolean(document.querySelector(".ops-pin-card, .ops-pin-page"));
    const hasPinTitle = Boolean(
      document.querySelector(".ops-pin-card__title") ||
        Array.from(document.querySelectorAll("h1")).some((el) =>
          /ops access/i.test(el.textContent || ""),
        ),
    );
    const accessDenied =
      /access denied|unauthorized|forbidden|not authorized/i.test(text) &&
      !hasPinInput;
    const loginForm =
      hasPinInput ||
      hasPinCard ||
      hasPinTitle ||
      (/enter pin|access code|ops access/i.test(text) &&
        Boolean(document.querySelector('input[type="password"]')));
    return { hasPinInput, hasPinCard, hasPinTitle, accessDenied, loginForm };
  });

  if (signals.loginForm || signals.hasPinInput || signals.hasPinCard || signals.hasPinTitle) {
    return "pin-gate";
  }
  if (signals.accessDenied) return "access-denied";
  if (url && !url.startsWith("about:")) return "app";
  return "unknown";
}

export function isInvalidThumbnailKind(kind: CapturePageKind): boolean {
  return kind === "pin-gate" || kind === "access-denied";
}
