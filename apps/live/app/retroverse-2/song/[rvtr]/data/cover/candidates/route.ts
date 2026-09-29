import { NextResponse } from "next/server";

/** Retired with the database-backed song editor. */
export async function GET() {
  return NextResponse.json({ candidates: [], error: "Song editor archived." }, { status: 410 });
}
