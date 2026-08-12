import { NextResponse } from "next/server";
import { applyIdentityReviewDecision } from "@/lib/bobos/identity-review-store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { videoPath?: string; decision?: "APPROVE" | "WRONG_MATCH" | "SPECIAL_CASE" | "SKIP" | "UNDO"; candidateRvtr?: string | null; specialCase?: string | null; note?: string | null };
    if (!body.videoPath || !body.decision) return NextResponse.json({ error: "videoPath and decision are required" }, { status: 400 });
    const result = await applyIdentityReviewDecision({ videoPath: body.videoPath, decision: body.decision, candidateRvtr: body.candidateRvtr, specialCase: body.specialCase, note: body.note });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Identity review action failed" }, { status: 400 });
  }
}
