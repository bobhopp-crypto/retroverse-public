import type { Metadata } from "next";

import { PublicSongExperience } from "@/components/retroverse/PublicSongExperience";
import { Rv2PublicShell } from "@/components/retroverse-2/Rv2PublicShell";
import { UniversalRenderer } from "@/components/universal-renderer/UniversalRenderer";
import { rvtrFromNowPlayingRvba } from "@/lib/broadcast/rvba";
import { playheadStageKey } from "@/lib/broadcast/normalize-playhead";
import { buildPlayheadPayload } from "@/lib/bobos/presentation/store";
import { resolveCanonicalSongExperience } from "@/lib/retroverse/experience/resolve-canonical-song";
import { loadTrackPage } from "@/lib/track/load-track-page";
import type { UniversalPackagePayload } from "@/lib/universal-renderer/load-package";

import { AudiencePlayheadRefresh } from "./live-audience/AudiencePlayheadRefresh";
import { RetroverseLivePlayer } from "./retroverse-live/player";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export const metadata: Metadata = {
  title: "Retroverse Live",
  description: "Press Play for the Past.",
};

/** retroverse.live — the one audience experience published by Broadcast Mixer. */
export default async function HomePage() {
  const playhead = await buildPlayheadPayload();
  const rvtr = playhead.rvba
    ? rvtrFromNowPlayingRvba(playhead.rvba, playhead.broadcast)
    : null;
  let track: Awaited<ReturnType<typeof loadTrackPage>> = null;
  let fallbackPayload: UniversalPackagePayload | null = null;
  if (rvtr) {
    try {
      const song = await resolveCanonicalSongExperience(rvtr);
      if (song.tier === "graph") {
        track = song.track;
      } else if (song.tier === "package" || song.tier === "vdj") {
        track = await loadTrackPage(song.payload.rvtr);
        fallbackPayload = track ? null : song.payload;
      }
    } catch {
      track = null;
    }
  }
  const refresh = <AudiencePlayheadRefresh initialKey={playheadStageKey(playhead)} />;

  if (track) {
    const year = track.releaseYear ??
      (track.firstChartDate ? Number(track.firstChartDate.slice(0, 4)) : null) ??
      track.albums[0]?.releaseYear ?? null;
    return (
      <>
        {refresh}
        <Rv2PublicShell
          className="rv2-song"
          yearsHref={track.rvYearHref ?? (year ? `/rv/${year}` : "/search")}
        >
          <PublicSongExperience rvtr={track.rvtr} trackData={track} />
        </Rv2PublicShell>
      </>
    );
  }

  if (fallbackPayload) {
    return (
      <>
        {refresh}
        <UniversalRenderer
          artist={fallbackPayload.artist}
          title={fallbackPayload.title}
          cards={fallbackPayload.cards}
          theme={fallbackPayload.theme}
        />
      </>
    );
  }

  if (playhead.rvba?.type === "now-playing" && !rvtr) {
    console.error("[retroverse-live] Published now-playing output is missing canonical RVTR", {
      rvbaId: playhead.rvba.id,
      linkId: playhead.rvba.link?.id ?? null,
    });
    return (
      <>
        {refresh}
        <main aria-live="polite">
          <h1>Unable to display Song Journey</h1>
          <p>Published Output is missing its canonical RVTR identity.</p>
        </main>
      </>
    );
  }

  return (
    <>
      {refresh}
      <RetroverseLivePlayer initial={playhead} />
    </>
  );
}
