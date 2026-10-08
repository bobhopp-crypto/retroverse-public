import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { magazineFontClass } from "@/components/theme/magazine-fonts";
import { PublicSongExperience } from "@/components/retroverse/PublicSongExperience";
import { Rv2PublicShell } from "@/components/retroverse-2/Rv2PublicShell";
import { heroColor } from "@/lib/theme/magazine-palette";

import "@/lib/theme/magazine-tokens.css";
import "@/lib/theme/magazine-site.css";
import {
  isPublicSongPayloadRenderable,
  loadPublicSongPayload,
} from "@/lib/retroverse/experience/load-public-song-payload";
import { localPublicTraceEnabled } from "@/lib/public/local-trace";
import { HomepageStageNavigation } from "@/app/components/homepage-stage-navigation";

import "./retroverse-song-empty.css";

type Props = {
  params: Promise<{ rvtr: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { rvtr } = await params;
  try {
    const payload = await loadPublicSongPayload(rvtr);
    if (!isPublicSongPayloadRenderable(payload)) {
      return { title: "Song — Retroverse" };
    }
    return {
      title: `${payload.title || payload.artist} — Retroverse`,
      description: payload.title && payload.artist
        ? `${payload.title} by ${payload.artist} — chart journey, story, and discovery.`
        : `${payload.title || payload.artist} — song discovery on Retroverse.`,
    };
  } catch {
    return { title: "Song — Retroverse" };
  }
}

/**
 * Canonical Song Experience — every live entry point resolves here.
 * One payload, one renderer, graph preferred over fallback metadata.
 */
export default async function Retroverse2SongPage({ params, searchParams }: Props) {
  const { rvtr } = await params;
  const traceEnabled = localPublicTraceEnabled(searchParams ? await searchParams : undefined);

  let payload;
  try {
    payload = await loadPublicSongPayload(rvtr);
  } catch (error) {
    console.error("[retroverse-song] song data temporarily unavailable", {
      rvtr,
      error: error instanceof Error ? error.message : String(error),
    });
    return (
      <Rv2PublicShell className="rv2-song" yearsHref="/search" showTopBroadcastBanner={false}>
        <main className="rv-song-empty">
          <p className="rv-song-empty__eyebrow">Retroverse</p>
          <h1 className="rv-song-empty__title">This song is temporarily unavailable</h1>
          <p className="rv-song-empty__body">
            Please try again in a moment or continue exploring Retroverse.
          </p>
          <a className="rv-song-empty__cta" href="/search">
            Search Retroverse
          </a>
        </main>
      </Rv2PublicShell>
    );
  }

  if (!isPublicSongPayloadRenderable(payload)) {
    notFound();
  }

  const yearHref = payload.links.yearHref ?? (payload.year ? `/rv/${payload.year}` : "/search");

  return (
    <Rv2PublicShell className={`rv2-song rv-mag rv-mag-song rv-mag-site ${magazineFontClass}`} yearsHref={yearHref} showTopBroadcastBanner={false}>
      <div style={{ ["--h" as string]: heroColor(payload.title || payload.artist || "Song") }}>
        <HomepageStageNavigation
          rvtr={payload.rvtr}
          relatedSongs={(payload.track?.relatedTracks ?? []).map((related) => ({ ...related }))}
          artistHref={payload.links.artistHref ?? payload.track?.artistHref ?? null}
          source="song"
        >
          <PublicSongExperience payload={payload} traceEnabled={traceEnabled} />
        </HomepageStageNavigation>
      </div>
    </Rv2PublicShell>
  );
}
