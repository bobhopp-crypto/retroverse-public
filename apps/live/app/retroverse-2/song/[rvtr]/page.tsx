import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PublicSongExperience } from "@/components/retroverse/PublicSongExperience";
import { Rv2PublicShell } from "@/components/retroverse-2/Rv2PublicShell";
import {
  isPublicSongPayloadRenderable,
  loadPublicSongPayload,
} from "@/lib/retroverse/experience/load-public-song-payload";
import { localPublicTraceEnabled } from "@/lib/public/local-trace";

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
      title: `${payload.title} — Retroverse`,
      description: `${payload.title} by ${payload.artist} — chart journey, story, and discovery.`,
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
      <Rv2PublicShell className="rv2-song" yearsHref="/search">
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
    <Rv2PublicShell className="rv2-song" yearsHref={yearHref}>
      <PublicSongExperience payload={payload} traceEnabled={traceEnabled} />
    </Rv2PublicShell>
  );
}
