"use client";

import { useState } from "react";

import { vdjbxStillUrl, visualAssetUrl } from "@/lib/vdjbx-catalog";

type LivingPosterProps = {
  videoKey: string | null;
  heroRvtr?: string | null;
  title: string | null;
  artist: string | null;
  className?: string;
};

export function LivingPoster({ videoKey, heroRvtr, title, artist, className = "rv-poster" }: LivingPosterProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const src = visualAssetUrl(heroRvtr) || (videoKey ? vdjbxStillUrl(videoKey) : null);

  if (!src || failedSrc === src) {
    return (
      <div className={`${className} is-generic`} aria-hidden="true">
        <div className="rv-poster-generic">
          {title ? <p className="rv-poster-generic-title">{title}</p> : null}
          {artist ? <p className="rv-poster-generic-artist">{artist}</p> : null}
        </div>
      </div>
    );
  }

  return (
    <div className={className} aria-hidden="true">
      <img
        key={src}
        src={src}
        alt=""
        className="is-active"
        draggable={false}
        onError={() => setFailedSrc(src)}
      />
    </div>
  );
}
