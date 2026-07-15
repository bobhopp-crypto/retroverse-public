import { handlePassClaim, handlePassUpdate } from "@/lib/retroverse-pass/claim-handler";

export const dynamic = "force-dynamic";

export function POST(req: Request) {
  return handlePassClaim(req);
}

/** Edit path for a visitor correcting their own already-registered pass. */
export function PATCH(req: Request) {
  return handlePassUpdate(req);
}
