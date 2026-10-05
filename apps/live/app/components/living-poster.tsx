"use client";

import { useState } from "react";

import { vdjbxStillUrl, visualAssetUrl } from "@/lib/vdjbx-catalog";

type LivingPosterProps = {
  videoKey: string | null;
  heroRvtr?: string | null;
  className?: string;
};

export function LivingPoster({ videoKey, heroRvtr, className = "rv-poster" }: LivingPosterProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const src = visualAssetUrl(heroRvtr) || (videoKey ? vdjbxStillUrl(videoKey) : null);

  if (!src || failedSrc === src) {
    return (
      <div className={`${className} is-generic`} aria-hidden="true" />
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
