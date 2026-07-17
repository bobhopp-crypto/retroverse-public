import type { Metadata } from "next";

import { loadPublicCurrentSongPayload } from "@/lib/home/public-current-song";
import { CanonicalPublicTrace } from "@/components/public/CanonicalPublicTrace";
import { discoverySourcesForPage } from "@/lib/public/discovery-contract";
import { localPublicTraceEnabled, timePublicLoader } from "@/lib/public/local-trace";

import { RetroverseLive2View } from "./retroverse-2/live/retroverse-live-2-view";

import "./retroverse-2/live/retroverse-live-2.css";
import "./live-home.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export const metadata: Metadata = {
  title: "Retroverse Live",
  description: "Press Play for the Past.",
};

/**
 * retroverse.live — public exploration homepage.
 * Live VDJ track when on air; recommended rotation when off air.
 */
export default async function HomePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const traceEnabled = localPublicTraceEnabled(searchParams ? await searchParams : undefined);
  const currentLoad = await timePublicLoader("home-current-song", loadPublicCurrentSongPayload);
  const current = currentLoad.value;
  const track = current.track;

  return (
    <>
    <RetroverseLive2View
      initial={current}
      shellClassName="rv2-live-home"
      activeNav="live"
      minimalHome
    />
    <CanonicalPublicTrace
      enabled={traceEnabled}
      rvtr={track?.rvtr ?? current.currentTrackId}
      artistId={track?.artistId ?? null}
      albumId={track?.primaryAlbum?.albumId ?? null}
      primaryAlbum={track?.primaryAlbum?.title ?? null}
      resolverPath={track?.resolverPath ?? ["Channel Zero", "no canonical RVTR resolved"]}
      discoverySources={discoverySourcesForPage("home")}
      loaderTimings={[...(track?.loaderTimings ?? []), currentLoad.timing]}
    />
    </>
  );
}
