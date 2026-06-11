import { readFile } from "fs/promises";
import { join } from "path";
import { NextResponse } from "next/server";

import { buildPrintScanTestHtml } from "@/lib/ops/creative-lab/print-scan-test-sheet";
import { creativeLabVNextRunDir } from "@/lib/ops/creative-lab/paths";
import { loadVNextManifest } from "@/lib/ops/content-creator/vnext-run";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function bufferToDataUrl(buf: Buffer, mime = "image/png"): string {
  return `data:${mime};base64,${buf.toString("base64")}`;
}

export async function POST(req: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 403 });
  }

  const body = (await req.json()) as { runId?: string };
  const runId = typeof body.runId === "string" ? body.runId : "";
  if (!runId) return NextResponse.json({ error: "runId required" }, { status: 400 });

  try {
    const manifest = await loadVNextManifest(runId);
    const runDir = creativeLabVNextRunDir(runId);
    const frontBuf = await readFile(join(runDir, manifest.frontFilename));
    const backBuf = await readFile(join(runDir, manifest.backFilename));
    const title = manifest.frontFields.event || manifest.backFields.event || runId;

    const html = buildPrintScanTestHtml({
      title,
      frontImageDataUrl: bufferToDataUrl(frontBuf),
      backImageDataUrl: bufferToDataUrl(backBuf),
      qrVerification: manifest.qrVerification ?? null,
    });

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="retroverse-scan-test-${runId}.html"`,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "print_scan_test_failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
