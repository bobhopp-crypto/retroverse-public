import { NextResponse } from "next/server";

import { isOpsEnabled } from "@/lib/ops/ops-gate";
import {
  bulkReviewQueueAction,
  getEnrichedReviewQueue,
  type BulkReviewAction,
} from "@/lib/ops/media-collections/midnight-special/performances";

export const dynamic = "force-dynamic";

const ACTIONS: BulkReviewAction[] = [
  "accept_exact_music",
  "reject_comedy",
  "reject_movie_clips",
  "reject_intros",
];

type BulkBody = {
  action?: BulkReviewAction;
  confirm?: boolean;
};

export async function POST(req: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ ok: false, error: "ops_disabled" }, { status: 404 });
  }

  let body: BulkBody;
  try {
    body = (await req.json()) as BulkBody;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (!body.action || !ACTIONS.includes(body.action)) {
    return NextResponse.json({ ok: false, error: "invalid_action" }, { status: 400 });
  }
  if (!body.confirm) {
    return NextResponse.json({ ok: false, error: "confirmation_required" }, { status: 400 });
  }

  const result = await bulkReviewQueueAction(body.action);
  const queue = await getEnrichedReviewQueue("review");

  return NextResponse.json({ ok: true, result, queue });
}
