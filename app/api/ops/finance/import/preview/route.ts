import { NextResponse } from "next/server";

import { parseAndStageUpload } from "@/lib/ops/finance/import-batch-service";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 404 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  const form = await request.formData();
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    const single = form.get("file");
    if (single instanceof File) files.push(single);
  }
  if (files.length === 0) {
    return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
  }

  const previews = [];
  for (const file of files) {
    if (file.size <= 0) continue;
    const buffer = Buffer.from(await file.arrayBuffer());
    previews.push(
      await parseAndStageUpload({
        fileName: file.name,
        buffer,
        mimeType: file.type || "application/octet-stream",
      }),
    );
  }

  return NextResponse.json({ ok: true, previews });
}
