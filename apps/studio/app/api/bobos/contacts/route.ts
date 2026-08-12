import { NextResponse } from "next/server";
import { deleteContact, saveContact, searchContacts } from "@/lib/retroverse-pass/contacts";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!isOpsEnabled()) return NextResponse.json({ error: "Ops disabled" }, { status: 404 });
  try { return NextResponse.json({ contacts: await searchContacts(new URL(req.url).searchParams.get("q") ?? "") }); }
  catch (err) { return NextResponse.json({ error: err instanceof Error ? err.message : "Load failed" }, { status: 500 }); }
}

export async function POST(req: Request) {
  if (!isOpsEnabled()) return NextResponse.json({ error: "Ops disabled" }, { status: 404 });
  try { return NextResponse.json({ contact: await saveContact(null, await req.json()) }, { status: 201 }); }
  catch (err) { return NextResponse.json({ error: err instanceof Error ? err.message : "Create failed" }, { status: 400 }); }
}

export async function PATCH(req: Request) {
  if (!isOpsEnabled()) return NextResponse.json({ error: "Ops disabled" }, { status: 404 });
  try { const body = await req.json(); return NextResponse.json({ contact: await saveContact(Number(body.id), body) }); }
  catch (err) { return NextResponse.json({ error: err instanceof Error ? err.message : "Update failed" }, { status: 400 }); }
}

export async function DELETE(req: Request) {
  if (!isOpsEnabled()) return NextResponse.json({ error: "Ops disabled" }, { status: 404 });
  try { await deleteContact(Number((await req.json()).id)); return NextResponse.json({ ok: true }); }
  catch (err) { return NextResponse.json({ error: err instanceof Error ? err.message : "Delete failed" }, { status: 400 }); }
}
