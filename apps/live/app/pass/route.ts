import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return new NextResponse(
    "Invalid Retroverse pass: the pass number is missing. Please scan the QR code again.",
    { status: 400, headers: { "content-type": "text/plain; charset=utf-8" } },
  );
}
