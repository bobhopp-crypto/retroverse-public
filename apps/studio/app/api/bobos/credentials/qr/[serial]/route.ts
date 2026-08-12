import { NextResponse } from "next/server";

import { passQrUrl, renderPassQrSvg } from "@/lib/bobos/pass-studio/qr";
import { normalizePassSerial } from "@/lib/retroverse-pass/types";
import { shouldAllowOpsRoutes } from "@/lib/runtime/site-mode";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ serial: string }> },
) {
  if (!shouldAllowOpsRoutes(request.headers.get("host"))) {
    return NextResponse.json({ error: "Not available." }, { status: 403 });
  }
  const { serial: encoded } = await context.params;
  const serial = normalizePassSerial(decodeURIComponent(encoded));
  if (!serial) return NextResponse.json({ error: "Invalid serial." }, { status: 400 });
  const svg = await renderPassQrSvg(passQrUrl(serial));
  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
