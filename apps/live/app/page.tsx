import type { Metadata } from "next";

import { EditorialPageShell } from "@/app/components/editorial/editorial-primitives";
import { LiveSongView } from "@/app/components/live-song-view";
import { PublicSongExperience } from "@/components/retroverse/PublicSongExperience";
import { resolveHomepageSongOfHourRvtr } from "@/lib/home/homepage-rvtr";
import { loadPublicCurrentSongPayload } from "@/lib/home/public-current-song";
import { loadPublicSongPayload } from "@/lib/retroverse/experience/load-public-song-payload";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

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
    (current.live?.source === "bridge" || current.live?.source === "channel");

  const songPayload = hasValidVirtualDjSong
    ? current.publicSong
    : songOfHourRvtr
      ? await loadPublicSongPayload(songOfHourRvtr).catch(() => null)
      : null;

  if (!songPayload) return null;

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
      heroUrl={null}
      heroRvtr={songPayload.rvtr}
      preparedExperience={
        <EditorialPageShell showSearch={false} fullBleed>
          <PublicSongExperience payload={songPayload} />
        </EditorialPageShell>
      }
      mode={hasValidVirtualDjSong ? "live" : "featured"}
    />
  );
}
