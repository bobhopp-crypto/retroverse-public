import { handlePassActivity } from "@/lib/retroverse-pass/activity-handler";
import { recordPassActivity } from "@/lib/retroverse-pass/store";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return handlePassActivity(req, recordPassActivity);
}
