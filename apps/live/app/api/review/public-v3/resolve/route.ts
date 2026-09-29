import { NextResponse } from "next/server";

/** This development-only database review endpoint is retired. */
export async function GET() {
  return NextResponse.json({ ok: false, error: "Review endpoint retired." }, { status: 404 });
}
