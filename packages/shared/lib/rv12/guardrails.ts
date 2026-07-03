import { isPilotRval, RV12_PILOT_RVALS } from "@/lib/rv12/paths";

export function coverApplyEnabled(): boolean {
  return process.env.RETROVERSE_COVER_APPLY?.trim() === "1";
}

export type CoverApplyGuardResult =
  | { ok: true }
  | { ok: false; code: string; message: string };

export function validateCoverApplyTarget(
  rval: string,
  options?: { forceTrustedOverride?: boolean; trustTier?: string },
): CoverApplyGuardResult {
  const id = rval.trim().toUpperCase();
  if (!/^RVAL\d{6}$/.test(id)) {
    return { ok: false, code: "invalid_rval", message: "Invalid RVAL." };
  }
  if (!isPilotRval(id)) {
    return {
      ok: false,
      code: "not_pilot_rval",
      message: `Pilot limited to ${[...RV12_PILOT_RVALS].join(", ")} in this pass.`,
    };
  }
  const tier = (options?.trustTier ?? "").toUpperCase();
  if (tier === "TRUSTED" && !options?.forceTrustedOverride) {
    return {
      ok: false,
      code: "trusted_blocked",
      message: "TRUSTED cover requires force override + reason.",
    };
  }
  return { ok: true };
}
