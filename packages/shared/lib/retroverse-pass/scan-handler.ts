import { NextResponse } from "next/server";

import { encodeResolvedPass, RESOLVED_PASS_HEADER } from "./resolved-payload";
import { scanPass } from "./store";
import { normalizePassSerial, parsePassCredential, type PassScanResult } from "./types";

type Scan = typeof scanPass;

/**
 * Self-contained error page (no CSS/JS dependency) for pass scans that never
 * reach the claim overlay — malformed links, unrecognized formats, or a
 * database outage. Styled inline so it still feels like Retroverse even
 * when nothing else on the page can load.
 */
function publicError(message: string, status: number): NextResponse {
  return new NextResponse(
    `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Retroverse Pass</title><style>
body{margin:0;min-height:100dvh;display:flex;align-items:center;justify-content:center;padding:1.25rem;background:#171f22;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;}
main{max-width:420px;width:100%;background:#fffaf0;color:#2d3e46;border:3px solid #2d3e46;border-radius:18px;padding:1.75rem;box-shadow:8px 8px 0 rgba(18,52,58,0.35);}
p.kicker{margin:0;font-size:0.78rem;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:#e07a4f;}
h1{margin:0.3rem 0 0.75rem;font-size:1.6rem;font-weight:900;line-height:1.15;}
p.msg{margin:0;font-size:1.05rem;line-height:1.5;}
</style></head><body><main><p class="kicker">Retroverse Pass</p><h1>Hold up</h1><p class="msg">${message}</p></main></body></html>`,
    { status, headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

export async function handlePassScan(request: Request, encoded: string, lookup: Scan = scanPass) {
  let raw: string;
  try {
    raw = decodeURIComponent(encoded).trim();
  } catch {
    return publicError("The pass credential is malformed. Please scan the QR code again.", 400);
  }
  if (!parsePassCredential(raw)) {
    return publicError("The pass credential is malformed. Please scan the QR code again.", 400);
  }
  const credential = normalizePassSerial(raw);
  if (!credential) {
    return publicError(
      "This doesn&rsquo;t look like a valid Retroverse pass. Double-check the QR code or web address and try again.",
      404,
    );
  }

  let scan: PassScanResult;
  try {
    scan = (await lookup(credential)) ?? {
      state: "unclaimed",
      pass: { serial: credential, claimed: false, visitorId: null, claimedAt: null },
    };
  } catch {
    return publicError("Pass lookup is temporarily unavailable. Please try again.", 503);
  }

  const target = new URL(`/pass-resolved/postgres/${encodeURIComponent(credential)}`, request.url);
  const headers = new Headers(request.headers);
  headers.set("x-retroverse-pass-rewrite", "1");
  headers.set(RESOLVED_PASS_HEADER, encodeResolvedPass(scan));
  return NextResponse.rewrite(target, { request: { headers } });
}
