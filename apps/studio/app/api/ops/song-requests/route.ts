import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function retired() {
  return NextResponse.json(
    { error: "The moderation queue is retired. Video Jukebox requests are inserted automatically." },
    { status: 410 },
  );
}

export const GET = retired;
export const PATCH = retired;
export const POST = retired;
