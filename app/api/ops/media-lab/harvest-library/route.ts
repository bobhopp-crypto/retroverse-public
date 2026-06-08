import { NextResponse } from "next/server";

import {
  groupManifestByType,
  readHarvestManifest,
} from "@/lib/ops/media-lab/harvest/manifest";
import { harvestLibraryRoot } from "@/lib/ops/media-lab/harvest/paths";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 403 });
  }

  try {
    const manifest = await readHarvestManifest();
    const groups = groupManifestByType(manifest);
    const totalClips = manifest.clips.length;

    return NextResponse.json({
      ok: true,
      libraryRoot: harvestLibraryRoot(),
      totalClips,
      groups,
      clips: manifest.clips,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not load harvest library";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
