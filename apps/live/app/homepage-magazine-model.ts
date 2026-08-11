import { access, readFile } from "node:fs/promises";
import { collectorVisualAssetsDir } from "@/lib/studio/package";
import { artistPublicHrefFromName } from "@/lib/search/entity-routes";
import { rvYearHref } from "@/lib/rv/rv-chronology-paths";
import { loadHomepageDocument } from "@/lib/home/load-homepage-document";
import { loadPublicSongPayload } from "@/lib/retroverse/experience/load-public-song-payload";
import { shouldUseMagazineTemplate } from "./components/magazine-editorial";
import type { MagazineHomeModel } from "./components/pre-1970-magazine-home";

export async function resolveHomepageMagazineModel(rvtr: string, liveLabel = "Archive selection"): Promise<MagazineHomeModel | null> {
  const [document, payload] = await Promise.all([
    loadHomepageDocument(rvtr).catch(() => null),
    loadPublicSongPayload(rvtr).catch(() => null),
  ]);
  const year = payload?.year ?? document?.year ?? null;
  if (!payload || !payload.title.trim() || !payload.artist.trim() || !shouldUseMagazineTemplate(year)) return null;
  const heroUrl = await productionHeroUrl(rvtr) ?? document?.heroUrl ?? await existingHeroUrl(rvtr);
  if (!heroUrl) return null;
  const chapter = document?.experience.chapters.find((item) => item.kind === "story" || item.kind === "timeline");
  return {
    title: payload.title,
    artist: payload.artist,
    album: payload.album ?? document?.albumTitle ?? null,
    year: year as number,
    heroUrl,
    songHref: payload.links.songHref,
    artistHref: payload.links.artistHref ?? artistPublicHrefFromName(payload.artist),
    albumHref: payload.links.albumHref ?? `/search?q=${encodeURIComponent(`${payload.artist} ${payload.title}`)}`,
    yearHref: payload.links.yearHref ?? rvYearHref(year as number),
    rvtr: payload.rvtr,
    editorial: {
      trivia: payload.trivia[0] ?? null,
      story: payload.storyCards[0]?.body ?? (chapter?.kind === "story" ? chapter.cards[0]?.body : chapter?.kind === "timeline" ? chapter.events[0]?.description : null),
      description: payload.localContent?.sections?.overview?.text ?? null,
    },
    feature: chapter ? { title: chapter.kind === "story" ? "The story behind the song" : "A moment in time", summary: payload.storyCards[0]?.headline ?? null, href: payload.links.songHref } : null,
    event: null,
    liveLabel,
  };
}

type ProductionHeroManifest = { records?: Array<{ rvtr?: string | null; url?: string | null }> };

async function productionHeroUrl(rvtr: string): Promise<string | null> {
  try {
    const manifest = JSON.parse(await readFile(`${process.cwd()}/data/ops/intelligence/homepage-production-hero-manifest.json`, "utf8")) as ProductionHeroManifest;
    const normalized = rvtr.trim().toUpperCase();
    return manifest.records?.find((record) => record.rvtr === normalized)?.url?.trim() ?? null;
  } catch {
    return null;
  }
}

async function existingHeroUrl(rvtr: string): Promise<string | null> {
  try {
    const file = (await access(`${collectorVisualAssetsDir(rvtr)}/hero.jpg`).then(() => "hero.jpg").catch(() => null))
      ?? (await access(`${collectorVisualAssetsDir(rvtr)}/hero-fallback.jpg`).then(() => "hero-fallback.jpg").catch(() => null));
    if (!file) return null;
    return `/api/experience/visual-asset?rvtr=${encodeURIComponent(rvtr.trim().toUpperCase())}&file=${file}`;
  } catch {
    return null;
  }
}
