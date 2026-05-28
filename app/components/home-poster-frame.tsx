"use client";

import Link from "next/link";
import { useRef } from "react";
import {
  DEBUG_HOTSPOTS,
  HOME_LINK_HOTSPOTS,
  posterRectPctStyle,
} from "@/lib/home/poster-layout";
import { HomeSearchCalibrator } from "./home-search-calibrator";
import { HomeSearchInput } from "./home-search-input";

const LINK_HOTSPOTS = [
  { key: "charts", label: "CHARTS", href: "/rv/1978", aria: "Explore chart history" },
  {
    key: "albums",
    label: "ALBUMS",
    href: "/search",
    aria: "Search albums in the archive",
  },
  {
    key: "feedback",
    label: "FEEDBACK",
    href: "mailto:feedback@retroverse.live?subject=Retroverse%20Feedback",
    aria: "Send feedback by email",
  },
] as const;

export function HomePosterFrame() {
  const frameRef = useRef<HTMLDivElement>(null);
  const calibrate = DEBUG_HOTSPOTS;

  return (
    <div
      ref={frameRef}
      className={`poster-frame${calibrate ? " poster-frame--calibrate" : ""}`}
    >
      <img
        className="poster-image"
        src="/retroverse-home.png?v=2"
        alt="Retroverse — Time is not a list. It's a place."
        width={1024}
        height={1536}
        fetchPriority="high"
      />

      {LINK_HOTSPOTS.map(({ key, label, href, aria }) => {
        const rect = HOME_LINK_HOTSPOTS[key];
        const style = posterRectPctStyle(rect);
        if (calibrate) {
          return (
            <div
              key={key}
              className="hotspot hotspot-debug hotspot-debug--static"
              style={style}
              aria-hidden="true"
            >
              <span className="hotspot-debug__label">{label}</span>
            </div>
          );
        }
        if (href.startsWith("mailto:")) {
          return (
            <a
              key={key}
              href={href}
              className="hotspot"
              style={style}
              aria-label={aria}
            />
          );
        }
        return (
          <Link
            key={key}
            href={href}
            prefetch
            className="hotspot"
            style={style}
            aria-label={aria}
          />
        );
      })}

      {calibrate ? (
        <HomeSearchCalibrator frameRef={frameRef} />
      ) : (
        <HomeSearchInput />
      )}
    </div>
  );
}
