import type { GeneratedPass, PassRegistration } from "./types";
import type { PassStudioResolution } from "./store";
import type { LibraryRegistrationResult } from "./library-file";
import { normalizePassSerial } from "./serials";

export type RegistrationBoundaryResult =
  | { ok: true; pass: GeneratedPass }
  | { ok: false; status: 400 | 404 | 409 | 503; error: string };

type RegistrationDependencies = {
  resolveSerial: (serial: string) => Promise<PassStudioResolution>;
  registerById: (
    normalized: NonNullable<ReturnType<typeof normalizePassSerial>>,
    passId: string,
    registration: PassRegistration,
  ) => Promise<LibraryRegistrationResult>;
};

/** Re-resolve the public serial before trusting the immutable UUID sent by the form. */
export async function registerResolvedPass(
  serial: string,
  expectedPassId: string,
  registration: PassRegistration,
  dependencies: RegistrationDependencies,
): Promise<RegistrationBoundaryResult> {
  try {
    const normalized = normalizePassSerial(serial);
    if (!normalized) return { ok: false, status: 400, error: "Invalid pass serial." };
    const resolution = await dependencies.resolveSerial(serial);
    if (resolution.state === "not_found") {
      return { ok: false, status: 404, error: "Pass not found." };
    }
    if (resolution.state === "ambiguous") {
      return { ok: false, status: 409, error: "Pass serial is ambiguous." };
    }
    if (resolution.pass.id !== expectedPassId) {
      return { ok: false, status: 409, error: "Pass identity does not match the scanned serial." };
    }

    const mutation = await dependencies.registerById(normalized, resolution.pass.id, registration);
    if (mutation.state === "ambiguous") {
      return { ok: false, status: 409, error: "Pass serial is ambiguous." };
    }
    if (mutation.state !== "registered") {
      return { ok: false, status: 409, error: "Pass changed before registration." };
    }
    return { ok: true, pass: mutation.pass };
  } catch {
    return { ok: false, status: 503, error: "Pass registration is temporarily unavailable." };
  }
}
