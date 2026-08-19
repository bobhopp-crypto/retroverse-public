import type { Metadata } from "next";

import { EditorialPageShell } from "@/app/components/editorial/editorial-primitives";
import { LiveSongView } from "@/app/components/live-song-view";
import { PublicSongExperience } from "@/components/retroverse/PublicSongExperience";
import { resolveHomepageSongOfHourRvtr } from "@/lib/home/homepage-rvtr";
import { loadPublicCurrentSongPayload } from "@/lib/home/public-current-song";
import { resolveHeroForRvtr } from "@/lib/visual-profile/resolve-hero-for-rvtr";
import { loadLiveStoryPilotRecord } from "@/lib/retroverse/experience/editorial-song-prototype";
import { isPublicSongPayloadRenderable, loadPublicSongPayload } from "@/lib/retroverse/experience/load-public-song-payload";
import { LIVE_BRIDGE_FRESHNESS_MS } from "@/lib/sunday-nights/live-freshness";
import { mergeExactVdjPresentation } from "@/lib/home/public-song-experience-resolution";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

function isFreshBridgePayload(current: { live?: { source?: string | null; bridgeTimestamp?: string | null } | null; updatedAt?: string | null }): boolean {
  if (current.live?.source !== "bridge") return false;
  const timestamp = current.live?.bridgeTimestamp || current.updatedAt;
  const parsed = timestamp ? Date.parse(timestamp) : NaN;
  return Number.isFinite(parsed) && Date.now() - parsed <= LIVE_BRIDGE_FRESHNESS_MS;
}

export const metadata: Metadata = {
  title: "Retroverse",
  description: "A song experience from across the decades.",
};

/** VirtualDJ has priority; otherwise every visitor shares the prepared Song of the Hour. */
export default async function HomePage() {
  const [current, songOfHourRvtr] = await Promise.all([
    loadPublicCurrentSongPayload(),
    resolveHomepageSongOfHourRvtr(),
  ]);

  const hasValidVirtualDjSong =
    Boolean(current.publicSong && isPublicSongPayloadRenderable(current.publicSong)) &&
    Boolean(current.live?.title?.trim() && current.live?.artist?.trim()) &&
    current.live?.source === "bridge" &&
    isFreshBridgePayload(current);

  const songPayload = hasValidVirtualDjSong
    ? current.publicSong
    : songOfHourRvtr
      ? await loadPublicSongPayload(songOfHourRvtr).catch(() => null)
      : null;

  if (!songPayload) return null;

  const canUsePreparedExperience = isPublicSongPayloadRenderable(songPayload);
  const pilotRecord = hasValidVirtualDjSong
    ? await loadLiveStoryPilotRecord(songPayload.rvtr, { artist: current.live?.artist, title: current.live?.title })
    : null;
  const [pilotHero, pilotPayload] = pilotRecord
    ? await Promise.all([
        resolveHeroForRvtr(pilotRecord.rvtr).catch(() => ({ url: null, tier: null })),
        loadPublicSongPayload(pilotRecord.rvtr).catch(() => null),
      ])
    : [null, null];
  const featuredHero = !hasValidVirtualDjSong
    ? songPayload.heroUrl || (await resolveHeroForRvtr(songPayload.rvtr).catch(() => ({ url: null, tier: null }))).url
    : null;
  const resolvedExperiencePayload = mergeExactVdjPresentation(pilotPayload, songPayload) ?? songPayload;
  const experiencePayload = pilotHero?.url
    ? { ...resolvedExperiencePayload, heroUrl: pilotHero.url, heroSource: "approved-song-hero" as const }
    : featuredHero && !resolvedExperiencePayload.heroUrl
      ? { ...resolvedExperiencePayload, heroUrl: featuredHero, heroSource: "fallback" as const }
      : resolvedExperiencePayload;
  const songExperience = canUsePreparedExperience ? (
    <EditorialPageShell showSearch={false} fullBleed>
      <PublicSongExperience
        payload={experiencePayload}
        editorialRecordOverride={pilotRecord}
        showSongLink
      />
    </EditorialPageShell>
  ) : undefined;

  const homepagePayload = hasValidVirtualDjSong
    ? current
    : {
        ...current,
        currentTrackId: songPayload.rvtr,
        live: null,
        publicSong: songPayload,
        track: songPayload.track,
      };
  return (
    <LiveSongView
      payload={homepagePayload}
      heroUrl={experiencePayload.heroUrl}
      heroRvtr={experiencePayload.rvtr}
      songExperience={songExperience}
      mode={hasValidVirtualDjSong ? "live" : "featured"}
    />
  );
}
