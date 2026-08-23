import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function retired() {
  return NextResponse.json({ error: "The legacy request source workflow is retired." }, { status: 410 });
}

export const GET = retired;
export const POST = retired;
