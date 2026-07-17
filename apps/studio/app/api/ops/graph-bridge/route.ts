import { NextResponse } from "next/server";
import { buildRepairProposal } from "@/lib/bobos/bridge/repair-engine";
import { loadRepairQueue, saveRepairQueue, updateRepairStatus } from "@/lib/bobos/bridge/repair-store";
import { loadTrackPage } from "@/lib/track/load-track-page";

export async function GET() { return NextResponse.json({ queue: await loadRepairQueue() }); }
export async function POST(request: Request) {
  const body = await request.json() as { action?: string; id?: string; rvtr?: string };
  if (body.action === "generate" && body.rvtr) { const track = await loadTrackPage(body.rvtr); if (!track) return NextResponse.json({ error: "Track not found" }, { status: 404 }); const proposal = buildRepairProposal(track); const queue = await loadRepairQueue(); queue.push(proposal); await saveRepairQueue(queue); return NextResponse.json({ proposal }); }
  if (["approve", "reject", "skip"].includes(body.action ?? "") && body.id) { const status = body.action === "approve" ? "Approved" : "Rejected"; return NextResponse.json({ proposal: await updateRepairStatus(body.id, status) }); }
  if (body.action === "apply" && body.id) return NextResponse.json({ error: "Database write adapter is intentionally disabled; approval is recorded but no bridge write was performed." }, { status: 409 });
  return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
}
