/**
 * Legacy Booth ownership locks — retired.
 * Experience Selector replaced Booth session authority.
 * These stubs keep old callers compiling; they never block.
 */

export class BoothAuthorityError extends Error {
  readonly code = "BOOTH_AUTHORITY" as const;

  constructor(message = "Booth authority is retired — use the Experience Selector") {
    super(message);
    this.name = "BoothAuthorityError";
  }
}

/** Always false — Experience Selector replaced Booth session ownership. */
export async function isBoothSessionActive(): Promise<boolean> {
  return false;
}

/** No-op — legacy mutations are always allowed. */
export async function assertBoothLegacyMutationAllowed(): Promise<void> {
  return;
}
