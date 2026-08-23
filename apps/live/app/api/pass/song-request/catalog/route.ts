import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    { error: "The pass-based request catalog is retired." },
    { status: 410, headers: { "Cache-Control": "no-store" } },
  );
}
