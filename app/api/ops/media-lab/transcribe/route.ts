import { writeFile } from "fs/promises";
import { join } from "path";
import { NextResponse } from "next/server";

import { loadJobPreview } from "@/lib/ops/media-lab/read-job";
import { ensureJobOutputDir, slugFromVideoFilename } from "@/lib/ops/media-lab/paths";
import { runMediaLabTranscribe } from "@/lib/ops/media-lab/run-transcribe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 600;

function parseYear(value: FormDataEntryValue | null): number | null {
  const y = Number(String(value ?? "").trim());
  if (!Number.isFinite(y) || y < 1900 || y >= 2100) return null;
  return y;
}

function opsEnabled(): boolean {
  return process.env.RETROVERSE_OPS === "1";
}

function logTranscribeRequest(meta: Record<string, unknown>) {
  console.info("[media-lab/transcribe]", JSON.stringify(meta));
}

async function parseMultipartForm(req: Request): Promise<
  | { ok: true; form: FormData }
  | { ok: false; error: string; detail?: string; fields?: string[] }
> {
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return {
      ok: false,
      error: "Expected multipart/form-data upload",
      detail: contentType || "(missing content-type)",
    };
  }

  try {
    const form = await req.formData();
    const fields = [...form.keys()];
    logTranscribeRequest({
      stage: "form_parsed",
      fields,
      contentType: contentType.slice(0, 80),
      contentLength: req.headers.get("content-length"),
    });
    return { ok: true, form };
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    console.error("[media-lab/transcribe] formData() failed:", detail);
    return {
      ok: false,
      error: "Could not parse upload (multipart body may be truncated)",
      detail,
    };
  }
}

export async function POST(req: Request) {
  if (!opsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 403 });
  }

  const parsed = await parseMultipartForm(req);
  if (!parsed.ok) {
    return NextResponse.json(
      {
        error: parsed.error,
        detail: parsed.detail,
        fields: parsed.fields,
        hint: "If the video is large, restart dev after next.config middlewareClientMaxBodySize change.",
      },
      { status: 400 },
    );
  }

  const form = parsed.form;
  const yearRaw = form.get("year");
  const year = parseYear(yearRaw);

  const file = form.get("video");
  const fileMeta =
    file instanceof File
      ? { name: file.name, size: file.size, type: file.type }
      : { present: Boolean(file), type: file == null ? "null" : typeof file };

  logTranscribeRequest({
    stage: "fields",
    yearRaw: yearRaw == null ? null : String(yearRaw),
    year,
    video: fileMeta,
    fields: [...form.keys()],
  });

  if (year == null) {
    return NextResponse.json(
      {
        error: "Valid year required",
        detail: `year field: ${yearRaw == null ? "(missing)" : String(yearRaw)}`,
        fields: [...form.keys()],
      },
      { status: 400 },
    );
  }

  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      {
        error: "Video file required",
        detail: `video field: ${file == null ? "(missing)" : typeof file}`,
        fields: [...form.keys()],
      },
      { status: 400 },
    );
  }

  if (file.size === 0) {
    return NextResponse.json(
      { error: "Video file is empty", detail: file.name },
      { status: 400 },
    );
  }

  const jobSlug = slugFromVideoFilename(file.name);
  const outputDir = await ensureJobOutputDir(year, jobSlug);
  const tempVideo = join(outputDir, `_source_${file.name.replace(/[^\w.-]/g, "_")}`);

  const buf = Buffer.from(await file.arrayBuffer());
  await writeFile(tempVideo, buf);

  logTranscribeRequest({
    stage: "saved_source",
    year,
    jobSlug,
    outputDir,
    bytes: buf.length,
  });

  const result = await runMediaLabTranscribe({
    videoPath: tempVideo,
    outputDir,
    year,
    jobSlug,
    sourceFilename: file.name,
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: result.error ?? "Transcription failed",
        hint: "Install: brew install ffmpeg && pip install faster-whisper",
      },
      { status: 500 },
    );
  }

  const preview = await loadJobPreview(outputDir);

  return NextResponse.json({
    ok: true,
    outputDir,
    outputPath: outputDir,
    jobSlug,
    ...preview,
  });
}
