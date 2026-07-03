"use client";

import { useEffect, useState } from "react";

import type { PresentationItem } from "@/lib/bobos/presentation/types";

import "./presentation-stage.css";

/**
 * The one renderer for Retroverse Live.
 *
 * The Studio preview and the public player both render this component, so
 * "what you see in the preview" is exactly what the audience sees. It is a
 * pure function of the current Playhead item — no editing UI, no data
 * fetching, no awareness of queues.
 */

type Props = {
  item: PresentationItem | null;
  /** Shown when there is no published presentation on air. */
  offAirTitle?: string;
};

function formatCountdown(totalSeconds: number): string {
  const clamped = Math.max(0, totalSeconds);
  const hours = Math.floor(clamped / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  const seconds = Math.floor(clamped % 60);
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

function CountdownClock({ target }: { target: string | null }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (!target) return <p className="rv-stage__countdown">--:--</p>;
  const remaining = (Date.parse(target) - now) / 1000;
  if (!Number.isFinite(remaining)) return <p className="rv-stage__countdown">--:--</p>;
  if (remaining <= 0) return <p className="rv-stage__countdown rv-stage__countdown--done">NOW</p>;
  return <p className="rv-stage__countdown">{formatCountdown(remaining)}</p>;
}

const KICKERS: Record<PresentationItem["type"], string> = {
  slide: "",
  artist: "Artist Spotlight",
  song: "Now Playing",
  announcement: "Announcement",
  registration: "Registration",
  countdown: "Starting In",
  "coming-soon": "Coming Soon",
  "current-event": "Tonight",
  placeholder: "",
};

export function PresentationStage({ item, offAirTitle = "Retroverse Live" }: Props) {
  if (!item) {
    return (
      <div className="rv-stage rv-stage--off-air">
        <div className="rv-stage__inner">
          <p className="rv-stage__kicker">Retroverse</p>
          <h1 className="rv-stage__title">{offAirTitle}</h1>
          <p className="rv-stage__subtitle">Press Play for the Past</p>
        </div>
      </div>
    );
  }

  const kicker = KICKERS[item.type];
  const headline = item.link && (item.type === "artist" || item.type === "song")
    ? item.link.label
    : item.title;

  return (
    <div
      key={item.id}
      className={`rv-stage rv-stage--${item.type} rv-stage--enter-${item.transition}`}
    >
      <div className="rv-stage__inner">
        {kicker ? <p className="rv-stage__kicker">{kicker}</p> : null}
        <h1 className="rv-stage__title">{headline}</h1>
        {item.subtitle ? <p className="rv-stage__subtitle">{item.subtitle}</p> : null}
        {item.type === "countdown" ? <CountdownClock target={item.countdownTarget} /> : null}
        {item.body ? <p className="rv-stage__body">{item.body}</p> : null}
      </div>
      <p className="rv-stage__brand">Retroverse Live</p>
    </div>
  );
}
