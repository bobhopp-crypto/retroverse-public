import { existsSync } from "node:fs";
import { join } from "path";
import { NextResponse } from "next/server";

import { buildPrintScanTestHtml } from "@/lib/ops/creative-lab/print-scan-test-sheet";
import { creativeLabVNextRunDir } from "@/lib/ops/creative-lab/paths";
import { loadVNextManifest, vNextFileUrl } from "@/lib/ops/content-creator/vnext-run";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
    const exportBack = join(runDir, "export", "final-back.png");
    const exportFront = join(runDir, "export", "final-front.png");
    const exportedBack = existsSync(exportBack);
    const exportedFront = existsSync(exportFront);

    const frontImageUrl = vNextFileUrl(
      runId,
      exportedFront ? "export/final-front.png" : manifest.frontFilename,
    );
    const backImageUrl = vNextFileUrl(
      runId,
      exportedBack ? "export/final-back.png" : manifest.backFilename,
    );
    const title = manifest.frontFields.event || manifest.backFields.event || runId;

    const html = buildPrintScanTestHtml({
      title,
      frontImageUrl,
      backImageUrl,
      exportedBack,
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
    console.error("[print-scan-test]", message, e);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
