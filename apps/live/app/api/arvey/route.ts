import { NextResponse } from "next/server";

/** Retired endpoint: keeps callers from falling through to the former model API. */
export async function POST() {
  return NextResponse.json({ error: "This feature is no longer available." }, { status: 410 });
}
