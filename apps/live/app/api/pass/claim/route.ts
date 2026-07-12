import { handlePassClaim } from "@/lib/retroverse-pass/claim-handler";

export const dynamic = "force-dynamic";

export function POST(req: Request) {
  return handlePassClaim(req);
}
