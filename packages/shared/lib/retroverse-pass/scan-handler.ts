import { NextResponse } from "next/server";

import { encodeResolvedPass, RESOLVED_PASS_HEADER } from "./resolved-payload";
import { scanPass } from "./store";
import { parsePassCredential, type PassScanResult } from "./types";

type Scan = typeof scanPass;

function publicError(message: string, status: number): NextResponse {
  return new NextResponse(
    `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Retroverse Pass</title></head><body><main><h1>Retroverse Pass</h1><p>${message}</p></main></body></html>`,
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
  const credential = parsePassCredential(raw);
  if (!credential) {
    return publicError("The pass credential is malformed. Please scan the QR code again.", 400);
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
