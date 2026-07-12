import { NextResponse } from "next/server";

import { findPassByNormalizedSerial } from "@/lib/ops/event-studio/pass-studio/store";
import { resolvePublicPass, statusForPublicPassResolution } from "@/lib/retroverse-pass/resolution";
import { encodeResolvedPass, RESOLVED_PASS_HEADER } from "@/lib/retroverse-pass/resolved-payload";
import { scanPass } from "@/lib/retroverse-pass/store";
import { normalizePassSerial } from "@/lib/retroverse-pass/types";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ serial: string }> };

function publicError(message: string, status: number): NextResponse {
  return new NextResponse(
    `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Retroverse Pass</title></head><body><main><h1>Retroverse Pass</h1><p>${message}</p></main></body></html>`,
    { status, headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

export async function GET(request: Request, { params }: Context) {
  const { serial: encoded } = await params;
  let raw: string;
  try {
    raw = decodeURIComponent(encoded).trim();
  } catch {
    return publicError("The pass number is malformed. Please scan the QR code again.", 400);
  }

  const normalized = normalizePassSerial(raw);
  if (!normalized) {
    return publicError("The pass number is malformed. Please scan the QR code again.", 400);
  }

  const resolution = await resolvePublicPass(normalized, {
    scanCanonical: scanPass,
    scanFallback: findPassByNormalizedSerial,
  });

  if (resolution.state === "not_found") {
    return publicError("We couldn't find that pass. Please check the printed serial.", statusForPublicPassResolution(resolution));
  }
  if (resolution.state === "ambiguous") {
    return publicError("This number matches more than one pass. Please ask a Retroverse host for help.", statusForPublicPassResolution(resolution));
  }
  if (resolution.state === "unavailable") {
    return publicError("Pass lookup is temporarily unavailable. Please try again.", statusForPublicPassResolution(resolution));
  }

  const identity = resolution.state === "canonical" ? resolution.scan.pass.serial : resolution.pass.id;
  const source = resolution.state === "canonical" ? "postgres" : "studio";
  const target = new URL(
    `/pass-resolved/${source}/${encodeURIComponent(identity)}`,
    request.url,
  );
  const headers = new Headers(request.headers);
  headers.set("x-retroverse-pass-rewrite", "1");
  if (resolution.state === "canonical") {
    headers.set(RESOLVED_PASS_HEADER, encodeResolvedPass(resolution.scan));
  }
  return NextResponse.rewrite(target, { request: { headers } });
}
