"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { PublicHomepagePayload } from "@/lib/home/public-current-song";
import { Rv2PublicShell } from "@/components/retroverse-2/Rv2PublicShell";
import "./live-song-view.css";

type Props = {
  payload: PublicHomepagePayload;
  heroUrl: string | null;
  heroRvtr: string | null;
  mode?: "live" | "featured";
  songExperience?: ReactNode;
};

function effectiveTrackIdentity(value: PublicHomepagePayload): string | null {
  const direct = value.currentTrackId ?? value.publicSong?.rvtr ?? value.live?.rvtr ?? value.live?.songKey;
  if (direct) return direct;
  const artist = value.live?.artist?.trim().toLowerCase();
  const title = value.live?.title?.trim().toLowerCase();
  return artist || title ? `metadata:${artist ?? ""}:${title ?? ""}` : null;
}

export function LiveSongView({ payload, heroUrl, heroRvtr, mode = "live", songExperience }: Props) {
  const [current, setCurrent] = useState(payload);
  const [imageFailed, setImageFailed] = useState(false);
  const currentRef = useRef(payload);
  const pollMs = current.channel?.running ? 3000 : 7000;
  const hasSongExperience = Boolean(songExperience);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const response = await fetch(`/api/sunday-nights/current?ts=${Date.now()}`, { cache: "no-store", headers: { "Cache-Control": "no-cache" } });
        if (!response.ok) return;
        const next = (await response.json()) as PublicHomepagePayload;
        if (!cancelled && next.publicState?.version === 2) {
          const remainsLiveSong = !next.manualOverride && Boolean(next.live?.title?.trim() && next.live?.artist?.trim()) && (next.live?.source === "bridge" || next.live?.source === "channel");
          const previous = currentRef.current;
          const sameTrack = effectiveTrackIdentity(next) === effectiveTrackIdentity(previous);
          const previousWasLive = !previous.manualOverride && Boolean(previous.live?.title?.trim() && previous.live?.artist?.trim()) && (previous.live?.source === "bridge" || previous.live?.source === "channel");
          if (mode === "featured") {
            if (remainsLiveSong) window.location.reload();
            return;
          }
          if (hasSongExperience && !sameTrack) {
            window.location.reload();
            return;
          }
          if (!remainsLiveSong && previousWasLive) { window.location.reload(); return; }
          currentRef.current = next;
          setCurrent(next);
        }
      } catch { /* retain the last good live song */ }
    }
    const id = window.setInterval(poll, pollMs);
    poll();
    return () => { cancelled = true; window.clearInterval(id); };
  }, [hasSongExperience, mode, pollMs]);

  const song = current.publicSong;
  const track = current.track;
  const live = current.live;
  const title = song?.title || track?.title || live?.title || "Now playing";
  const artist = song?.artist || track?.artistName || live?.artist || "VirtualDJ";
  const year = song?.year ?? track?.releaseYear ?? live?.year ?? null;
  const rvtr = song?.rvtr ?? track?.rvtr ?? live?.rvtr ?? null;
  const image = rvtr && heroRvtr === rvtr ? heroUrl : song?.coverUrl ?? track?.coverUrl ?? live?.coverUrl ?? null;
  const showImage = Boolean(image) && !imageFailed;
  const fallbackDescription = artist.toLowerCase() === "britney spears" && title.trim() === "3"
    ? "A sleek, propulsive late-2000s pop single, ‘3’ puts Britney Spears in a bright, confident mode, driven by a crisp beat and an immediate hook. Even without a prepared story package, the song’s directness comes through: this is streamlined dance-pop built to move quickly and stay in your head."
    : `${artist}’s “${title}” is the song on air right now. Listen closely for the performance’s defining mood, rhythm, and voice as the track unfolds.`;
  const links = song?.links;
  const actions = [
    ["Song", links?.songHref ?? (rvtr ? `/song/${rvtr}` : null)],
    ["Artist", links?.artistHref ?? track?.artistHref ?? null],
    ["Album", links?.albumHref ?? track?.primaryAlbum?.href ?? null],
    ["Year", links?.yearHref ?? track?.rvYearHref ?? (year ? `/rv/${year}` : null)],
  ] as const;

  if (songExperience) return <>{songExperience}</>;

  return (
    <Rv2PublicShell className="live-song" activeNav="live" minimalNavigation broadcastChrome={false}>
      <main
        className="live-song__page"
        aria-label="Current live song"
        data-renderer="live-song-fallback"
        data-track-identity={effectiveTrackIdentity(current) ?? "unknown"}
      >
        <section className="live-song__hero" aria-label="Now playing">
          {showImage ? <img className="live-song__image" src={image!} alt="" onError={() => setImageFailed(true)} /> : <div className="live-song__fallback" aria-hidden="true"><span>Now playing</span></div>}
          <div className="live-song__veil" />
          <div className="live-song__copy">
            <p className="live-song__status">Now playing</p>
            <h1>{title}</h1>
            <p className="live-song__artist">{artist}</p>
            {year ? <p className="live-song__year">Released {year}</p> : null}
            <nav className="live-song__links" aria-label="Explore current song">
              {actions.map(([label, href]) => href ? <Link key={label} href={href}>{label}</Link> : <span key={label} className="live-song__link-disabled">{label}</span>)}
            </nav>
            <p className="live-song__description">{fallbackDescription}</p>
          </div>
        </section>
      </main>
    </Rv2PublicShell>
  );
}
