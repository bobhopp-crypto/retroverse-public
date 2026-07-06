"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { ExploreLiveAidCallout } from "@/components/live-experience/ExploreLiveAidCallout";
import {
  LiveExperienceShell,
  type LiveExperienceAction,
  type LiveExperienceStatus,
} from "@/components/live-experience/LiveExperienceShell";
import { liveSongExperienceHref } from "@/lib/live-control/experience-route";
import { trackPageHref } from "@/lib/search/entity-routes";
import type { LiveDestinationKind, SundayNightsCurrentPayload } from "@/lib/sunday-nights/live-payload";
import type { SundayNightsLiveSelection } from "@/lib/sunday-nights/types";
import type { TrackPageData } from "@/lib/track/load-track-page";

type Props = {
  initial: SundayNightsCurrentPayload;
};

const DEFAULT_POLL_MS = 7000;
const CHANNEL_POLL_MS = 3000;

function displayFromTrack(
  track: TrackPageData | null,
  live: SundayNightsLiveSelection | null,
  destinationHref: string | null,
) {
  if (track) {
    return {
      title: track.title,
      artist: track.artistName,
      coverUrl: track.coverUrl,
      songHref: destinationHref,
      artistHref: track.artistHref,
      yearHref: track.rvYearHref,
      year: track.releaseYear,
    };
  }

  if (!live) return null;

  return {
    title: live.title,
    artist: live.artist,
    coverUrl: live.coverUrl ?? null,
    songHref: destinationHref,
    artistHref: null as string | null,
    yearHref: live.year ? `/rv/${live.year}` : null,
    year: live.year,
  };
}

function destinationLabel(kind: LiveDestinationKind): string {
  if (kind === "EXPERIENCE") return "Open Song Experience";
  if (kind === "PACKAGE") return "Open Research";
  return "Explore Song";
}

function statusFromDestination(kind: LiveDestinationKind, hasDisplay: boolean): LiveExperienceStatus {
  if (!hasDisplay) return "Fallback";
  if (kind === "EXPERIENCE") return "Experience";
  if (kind === "PACKAGE") return "Package";
  return "Track";
}

function shellActions(payload: SundayNightsCurrentPayload, display: ReturnType<typeof displayFromTrack>): LiveExperienceAction[] {
  const rvtr = payload.currentTrackId;
  const experienceHref = rvtr ? liveSongExperienceHref(rvtr) : null;
  return [
    { label: "Story", href: experienceHref },
    { label: "Song", href: experienceHref },
    { label: "Chart", href: rvtr ? trackPageHref(rvtr) : null },
    { label: "Artist", href: display?.artistHref ?? null },
    { label: "Live", href: "/live" },
  ];
}

export function LiveNowPlayingView({ initial }: Props) {
  const [payload, setPayload] = useState(initial);
  const updatedAtRef = useRef(initial.updatedAt);
  const pollMs = payload.channel?.running ? CHANNEL_POLL_MS : DEFAULT_POLL_MS;

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch("/api/sunday-nights/current", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as SundayNightsCurrentPayload;
        if (cancelled || data.updatedAt === updatedAtRef.current) return;
        updatedAtRef.current = data.updatedAt;
        setPayload(data);
      } catch {
        /* ignore transient network errors */
      }
    }

    const id = window.setInterval(poll, pollMs);
    poll();
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [pollMs]);

  const display = displayFromTrack(payload.track, payload.live, payload.destination.href);
  const status = statusFromDestination(payload.destination.kind, Boolean(display));

  return (
    <LiveExperienceShell
      identity={{
        rvtr: payload.currentTrackId,
        title: display?.title ?? "Waiting for the next song",
        artist: display?.artist ?? "Retroverse Live",
        year: display?.year ?? null,
        peakHot100: payload.track?.peakHot100 ?? null,
      }}
      status={status}
      activeTab="Live"
      actions={shellActions(payload, display)}
      primaryHref={display?.songHref ?? null}
      primaryLabel={display ? destinationLabel(payload.destination.kind) : undefined}
    >
      <div className="live-page" aria-live="polite" aria-atomic="true">
        {!display ? (
          <section className="live-page__waiting">
            <p className="live-page__waiting-text">Waiting for the next song…</p>
            <ExploreLiveAidCallout />
          </section>
        ) : (
          <section className="live-page__now">
            {display.coverUrl ? (
              <div className="live-page__cover-wrap">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={display.coverUrl}
                  alt=""
                  className="live-page__cover"
                  width={360}
                  height={360}
                />
              </div>
            ) : (
              <div className="live-page__cover-placeholder" aria-hidden>
                ♪
              </div>
            )}

            <nav className="live-page__actions" aria-label="Explore">
              {display.songHref ? (
                <Link href={display.songHref} className="live-page__btn live-page__btn--primary">
                  {destinationLabel(payload.destination.kind)}
                </Link>
              ) : null}
              {display.artistHref ? (
                <Link href={display.artistHref} className="live-page__btn">
                  Explore Artist
                </Link>
              ) : null}
              {display.yearHref ? (
                <Link href={display.yearHref} className="live-page__btn">
                  Explore Year
                </Link>
              ) : null}
            </nav>
            <ExploreLiveAidCallout />
          </section>
        )}
      </div>
    </LiveExperienceShell>
  );
}
