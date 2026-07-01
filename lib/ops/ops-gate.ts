/** Local dev ops gate — cookie session after PIN entry. */
import { shouldAllowOpsRoutes } from "@/lib/runtime/site-mode";

export const OPS_GATE_COOKIE = "retroverse_ops_gate";

/** Temporary local PIN (override with RETROVERSE_OPS_PIN). */
export const OPS_DEFAULT_PIN = "6324";

export function opsGateCookieValue(request: { cookies: { get: (name: string) => { value: string } | undefined } }): boolean {
  return request.cookies.get(OPS_GATE_COOKIE)?.value === "ok";
}

export function isOpsEnabled(host?: string | null): boolean {
  if (!shouldAllowOpsRoutes(host)) return false;
  return process.env.RETROVERSE_OPS === "1";
}

/** True when ops PIN gate is configured (production or local). */
export function isOpsGateConfigured(): boolean {
  if (isOpsEnabled()) return true;
  const pin = process.env.RETROVERSE_OPS_PIN?.trim();
  return Boolean(pin && pin !== OPS_DEFAULT_PIN);
}

export function expectedOpsPin(): string {
  return process.env.RETROVERSE_OPS_PIN?.trim() || OPS_DEFAULT_PIN;
}
