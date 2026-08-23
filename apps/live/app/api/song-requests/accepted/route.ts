import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    { error: "The legacy accepted-request bridge is retired." },
    { status: 410, headers: { "Cache-Control": "no-store" } },
  );
}
