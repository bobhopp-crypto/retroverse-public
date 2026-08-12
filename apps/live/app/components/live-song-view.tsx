"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { PublicHomepagePayload } from "@/lib/home/public-current-song";
import { Rv2PublicShell } from "@/components/retroverse-2/Rv2PublicShell";
import "./live-song-view.css";

type Props = {
  payload: PublicHomepagePayload;
  heroUrl: string | null;
  heroRvtr: string | null;
  mode?: "live" | "featured";
  preparedExperience?: ReactNode;
};

export function LiveSongView({ payload, heroUrl, heroRvtr, mode = "live", preparedExperience }: Props) {
  const [current, setCurrent] = useState(payload);
  const [imageFailed, setImageFailed] = useState(false);
  const pollMs = current.channel?.running ? 3000 : 7000;

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const response = await fetch(`/api/sunday-nights/current?ts=${Date.now()}`, { cache: "no-store", headers: { "Cache-Control": "no-cache" } });
        if (!response.ok) return;
        const next = (await response.json()) as PublicHomepagePayload;
        if (!cancelled && next.publicState?.version === 2) {
          const remainsLiveSong = !next.manualOverride && Boolean(next.live?.title?.trim() && next.live?.artist?.trim()) && (next.live?.source === "bridge" || next.live?.source === "channel");
          if (mode === "featured") {
            if (remainsLiveSong) window.location.reload();
            return;
          }
          if (preparedExperience && next.currentTrackId !== current.currentTrackId) {
            window.location.reload();
            return;
          }
          if (!remainsLiveSong) { window.location.reload(); return; }
          setCurrent(next);
        }
      } catch { /* retain the last good live song */ }
    }
    const id = window.setInterval(poll, pollMs);
    poll();
    return () => { cancelled = true; window.clearInterval(id); };
  }, [mode, pollMs]);

  const song = current.publicSong;
  const track = current.track;
  const live = current.live;
  const title = song?.title || track?.title || live?.title || "Now playing";
  const artist = song?.artist || track?.artistName || live?.artist || "VirtualDJ";
  const year = song?.year ?? track?.releaseYear ?? live?.year ?? null;
  const rvtr = song?.rvtr ?? track?.rvtr ?? live?.rvtr ?? null;
  const image = rvtr && heroRvtr === rvtr ? heroUrl : song?.coverUrl ?? track?.coverUrl ?? live?.coverUrl ?? null;
  const showImage = Boolean(image) && !imageFailed;
  const links = song?.links;
  const actions = [
    ["Song", links?.songHref ?? (rvtr ? `/song/${rvtr}` : null)],
    ["Artist", links?.artistHref ?? track?.artistHref ?? null],
    ["Album", links?.albumHref ?? track?.primaryAlbum?.href ?? null],
    ["Year", links?.yearHref ?? track?.rvYearHref ?? (year ? `/rv/${year}` : null)],
  ] as const;

  if (preparedExperience) return <>{preparedExperience}</>;

  return (
    <Rv2PublicShell className="live-song" activeNav="live" minimalNavigation broadcastChrome={false}>
      <main className="live-song__page" aria-label="Current live song">
        <section className="live-song__hero" aria-label="Now playing">
          {showImage ? <img className="live-song__image" src={image!} alt="" onError={() => setImageFailed(true)} /> : <div className="live-song__fallback" aria-hidden="true" />}
          <div className="live-song__veil" />
          <div className="live-song__copy">
            <p className="live-song__status">● Live / Now Playing</p>
            <h1>{title}</h1>
            <p className="live-song__artist">{artist}</p>
            <p className="live-song__year">{year ? `Released ${year}` : "Year unavailable"}</p>
            <nav className="live-song__links" aria-label="Explore current song">
              {actions.map(([label, href]) => href ? <Link key={label} href={href}>{label}</Link> : <span key={label} className="live-song__link-disabled">{label}</span>)}
            </nav>
          </div>
        </section>
      </main>
    </Rv2PublicShell>
  );
}
