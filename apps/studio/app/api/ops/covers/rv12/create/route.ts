import { NextResponse } from "next/server";

import { isOpsEnabled } from "@/lib/ops/ops-gate";
import { createRv12Asset } from "@/lib/rv12/create-asset";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ ok: false, error: "disabled" }, { status: 404 });
  }

  const contentType = request.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      const sourceUrl = String(form.get("sourceUrl") ?? "").trim() || null;
      const sourceType = (String(form.get("sourceType") ?? "upload") as "upload" | "url" | "discogs");
      const notes = String(form.get("curatorNotes") ?? "").trim() || null;
      const actor = String(form.get("actor") ?? "ops/covers-ui");

      if (file instanceof File && file.size > 0) {
        const buf = Buffer.from(await file.arrayBuffer());
        const asset = await createRv12Asset({
          sourceType: "upload",
          fileBuffer: buf,
          sourceUrl,
          curatorNotes: notes,
          actor,
        });
        return NextResponse.json({ ok: true, asset });
      }
      if (sourceUrl) {
        const asset = await createRv12Asset({
          sourceType: sourceType === "discogs" ? "discogs" : "url",
          sourceUrl,
          curatorNotes: notes,
          actor,
        });
        return NextResponse.json({ ok: true, asset });
      }
      return NextResponse.json({ ok: false, error: "file_or_url_required" }, { status: 400 });
    }

    const body = (await request.json()) as {
      sourceUrl?: string;
      sourceType?: "upload" | "url" | "discogs";
      curatorNotes?: string;
      actor?: string;
    };
    if (!body.sourceUrl?.trim()) {
      return NextResponse.json({ ok: false, error: "sourceUrl required" }, { status: 400 });
    }
    const asset = await createRv12Asset({
      sourceType: body.sourceType ?? "url",
      sourceUrl: body.sourceUrl,
      curatorNotes: body.curatorNotes ?? null,
      actor: body.actor ?? "ops/covers-ui",
    });
    return NextResponse.json({ ok: true, asset });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
