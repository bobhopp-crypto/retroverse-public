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

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

function isFreshBridgePayload(current: { live?: { source?: string | null; bridgeTimestamp?: string | null } | null; updatedAt?: string | null }): boolean {
  if (current.live?.source !== "bridge") return true;
  const timestamp = current.live.bridgeTimestamp || current.updatedAt;
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
    Boolean(current.publicSong) &&
    Boolean(current.live?.title?.trim() && current.live?.artist?.trim()) &&
    (current.live?.source === "bridge" || current.live?.source === "channel") &&
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
  const pilotHero = pilotRecord
    ? await resolveHeroForRvtr(pilotRecord.rvtr).catch(() => ({ url: null, tier: null }))
    : null;
  const featuredHero = !hasValidVirtualDjSong
    ? songPayload.heroUrl || (await resolveHeroForRvtr(songPayload.rvtr).catch(() => ({ url: null, tier: null }))).url
    : null;
  const featuredStory = !hasValidVirtualDjSong && songPayload.storyCards?.length
    ? { headline: songPayload.storyCards[0].headline, paragraphs: songPayload.storyCards.map((card) => card.body) }
    : null;

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
      heroUrl={pilotHero?.url ?? featuredHero ?? null}
      heroRvtr={pilotRecord?.rvtr ?? songPayload.rvtr}
      preparedExperience={hasValidVirtualDjSong && canUsePreparedExperience && !pilotRecord ? (
        <EditorialPageShell showSearch={false} fullBleed>
          <PublicSongExperience payload={songPayload} />
        </EditorialPageShell>
      ) : undefined}
      pilotStory={pilotRecord ? { headline: pilotRecord.headline, paragraphs: pilotRecord.paragraphs } : featuredStory}
      pilotIdentity={pilotRecord ? { rvtr: pilotRecord.rvtr, artist: pilotRecord.artist, title: pilotRecord.title, year: pilotRecord.year } : null}
      mode={hasValidVirtualDjSong ? "live" : "featured"}
    />
  );
}
