import { scanPass } from "./store";
import { normalizePassSerial, type PassScanResult } from "./types";

type Scan = typeof scanPass;

export type PassScanResolveResult =
  | { type: "ok"; scan: PassScanResult }
  | { type: "error"; message: string; status: 400 | 404 | 503 };

/** Resolve a pass credential for a page render — no Route Handler rewrite. */
export async function resolvePassScan(
  encoded: string,
  lookup: Scan = scanPass,
): Promise<PassScanResolveResult> {
  let raw: string;
  try {
    raw = decodeURIComponent(encoded).trim();
  } catch {
    return {
      type: "error",
      message: "The pass credential is malformed. Please scan the QR code again.",
      status: 400,
    };
  }
  const credential = normalizePassSerial(raw);
  if (!credential) {
    return {
      type: "error",
      message: "The pass credential is malformed. Please scan the QR code again.",
      status: 400,
    };
  }

  try {
    const scan =
      (await lookup(credential)) ?? {
        state: "unclaimed" as const,
        pass: { serial: credential, claimed: false, visitorId: null, claimedAt: null },
      };
    return { type: "ok", scan };
  } catch {
    return {
      type: "error",
      message: "Pass lookup is temporarily unavailable. Please try again.",
      status: 503,
    };
  }
}
