import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function retired() {
  return NextResponse.json(
    { error: "There is no moderation gate. Valid Jukebox requests enter the VirtualDJ list automatically." },
    { status: 410 },
  );
}

export const GET = retired;
export const PATCH = retired;
