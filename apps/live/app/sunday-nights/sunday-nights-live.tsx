"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { ExploreLiveAidCallout } from "@/components/live-experience/ExploreLiveAidCallout";
import { TrackPageEmbed } from "@/app/track/[id]/track-page-embed";
import type { LiveDestination } from "@/lib/sunday-nights/live-payload";
import type { SundayNightsLiveSelection } from "@/lib/sunday-nights/types";
import type { TrackPageData } from "@/lib/track/load-track-page";

type Props = {
  initialTrack: TrackPageData | null;
  initialLive: SundayNightsLiveSelection | null;
  initialDestination: LiveDestination;
  initialUpdatedAt: string;
};

type CurrentPayload = {
  currentTrackId: string | null;
  live: SundayNightsLiveSelection | null;
  updatedAt: string;
  track: TrackPageData | null;
  destination: LiveDestination;
};

const POLL_MS = 8000;

function FallbackExhibit({ live }: { live: SundayNightsLiveSelection }) {
  return (
    <section className="sn-live__fallback" aria-label="Now playing">
      <p className="sn-live__fallback-label">Now playing</p>
      {live.coverUrl ? (
        <div className="sn-live__fallback-cover-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={live.coverUrl}
            alt=""
            className="sn-live__fallback-cover"
            width={280}
            height={280}
          />
        </div>
      ) : null}
      <p className="sn-live__fallback-artist">{live.artist}</p>
      <p className="sn-live__fallback-title">{live.title}</p>
      {live.year ? <p className="sn-live__fallback-year">[{live.year}]</p> : null}
      <p className="sn-live__fallback-note">Not yet indexed in Retroverse</p>
    </section>
  );
}

function DestinationCta({ destination }: { destination: LiveDestination }) {
  if (!destination.href || destination.kind === "TRACK") return null;

  const label = destination.kind === "EXPERIENCE" ? "Open Song" : "Open Research";
  const detail =
    destination.kind === "EXPERIENCE"
      ? "Song Experience is ready for this track."
      : "Story package is ready for this song.";

  return (
    <div className="sn-live__destination">
      <p className="sn-live__destination-label">Tonight&apos;s live asset</p>
      <Link href={destination.href} className="sn-live__destination-btn">
        {label}
      </Link>
      <p className="sn-live__destination-note">{detail}</p>
    </div>
  );
}

export function SundayNightsLive({
  initialTrack,
  initialLive,
  initialDestination,
  initialUpdatedAt,
}: Props) {
  const [track, setTrack] = useState<TrackPageData | null>(initialTrack);
  const [live, setLive] = useState<SundayNightsLiveSelection | null>(initialLive);
  const [destination, setDestination] = useState<LiveDestination>(initialDestination);
  const updatedAtRef = useRef(initialUpdatedAt);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch("/api/sunday-nights/current", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as CurrentPayload;
        if (cancelled || data.updatedAt === updatedAtRef.current) return;
        updatedAtRef.current = data.updatedAt;
        setTrack(data.track);
        setLive(data.live);
        setDestination(data.destination);
      } catch {
        /* ignore transient network errors */
      }
    }

    const id = window.setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  return (
    <div className="sn-live" aria-live="polite" aria-atomic="true">
      {track ? (
        <>
          <DestinationCta destination={destination} />
          <TrackPageEmbed data={track} />
        </>
      ) : live ? (
        <FallbackExhibit live={live} />
      ) : (
        <section className="sn-live__waiting">
          <p className="sn-live__waiting-label">Now playing</p>
          <p className="sn-live__waiting-text">Tonight&apos;s exploration begins soon.</p>
          <ExploreLiveAidCallout />
        </section>
      )}
    </div>
  );
}
