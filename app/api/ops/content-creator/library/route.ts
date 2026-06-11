import { NextResponse } from "next/server";

import {
  backfillLibraryFromVNext,
  computeLibraryStats,
  libraryFileUrl,
  listGenerations,
  loadGenerationManifest,
} from "@/lib/ops/content-creator/library";
import { isOpsEnabled } from "@/lib/ops/ops-gate";
import { listRvbrProfiles } from "@/lib/ops/rvbr/profiles";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 403 });
  }

  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? undefined;
  const eraSlug = url.searchParams.get("era") ?? undefined;
  const creativeDirection = url.searchParams.get("direction") ?? undefined;
  const favoriteOnly = url.searchParams.get("favorite") === "1";
  const ratingRaw = url.searchParams.get("rating");
  const rating = ratingRaw ? Number(ratingRaw) : undefined;
  const tagsRaw = url.searchParams.get("tags");
  const tags = tagsRaw ? tagsRaw.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean) : undefined;
  const dateFrom = url.searchParams.get("from") ?? undefined;
  const dateTo = url.searchParams.get("to") ?? undefined;
  const backfill = url.searchParams.get("backfill") === "1";
  const statsOnly = url.searchParams.get("stats") === "1";

  if (backfill) {
    const profiles = await listRvbrProfiles();
    const bySlug = new Map(profiles.map((p) => [p.slug, p]));
    const added = await backfillLibraryFromVNext((slug) => bySlug.get(slug));
    return NextResponse.json({ ok: true, backfilled: added });
  }

  if (statsOnly) {
    const stats = await computeLibraryStats();
    return NextResponse.json({ ok: true, stats });
  }

  const generations = await listGenerations({
    q,
    eraSlug,
    creativeDirection,
    favoriteOnly,
    rating: rating && rating >= 1 && rating <= 5 ? rating : undefined,
    tags,
    dateFrom,
    dateTo,
  });

  const stats = await computeLibraryStats();
  const items = generations.map((g) => ({
    ...g,
    thumbnailUrl: libraryFileUrl(g.thumbnailPath),
  }));

  return NextResponse.json({ ok: true, stats, generations: items });
}

export async function POST(req: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ error: "Ops disabled" }, { status: 403 });
  }

  const body = (await req.json()) as { id?: string };
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const manifest = await loadGenerationManifest(id);
  if (!manifest) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.json({
    ok: true,
    generation: {
      ...manifest,
      frontUrl: libraryFileUrl(manifest.frontImagePath),
      backUrl: libraryFileUrl(manifest.backImagePath),
      thumbnailUrl: libraryFileUrl(manifest.thumbnailPath),
      exportZipUrl: manifest.exportZipPath ? libraryFileUrl(manifest.exportZipPath) : null,
    },
  });
}
