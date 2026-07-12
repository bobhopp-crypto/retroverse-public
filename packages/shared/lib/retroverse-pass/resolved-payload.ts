import type { PassScanResult } from "./types";

export const RESOLVED_PASS_HEADER = "x-retroverse-resolved-pass";

export function encodeResolvedPass(scan: PassScanResult): string {
  return Buffer.from(JSON.stringify(scan), "utf8").toString("base64url");
}

export function decodeResolvedPass(value: string | null): PassScanResult | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as PassScanResult;
    if (parsed?.state !== "claimed" && parsed?.state !== "unclaimed") return null;
    if (!parsed.pass || typeof parsed.pass.serial !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}
