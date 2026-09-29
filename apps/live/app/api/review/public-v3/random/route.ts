import { NextResponse } from "next/server";

/** The retired public-v3 review endpoint was never available in production. */
export async function GET() {
  return NextResponse.json({ ok: false, error: "Review endpoint retired." }, { status: 404 });
}
