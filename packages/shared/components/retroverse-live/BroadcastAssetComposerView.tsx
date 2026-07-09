"use client";

import { useEffect, useMemo, useState } from "react";

import {
  formatAlbumYearLine,
  getTemplateDefinition,
  type ComposedBroadcastAsset,
} from "@/lib/broadcast/composer";
import type { PresentationTransition } from "@/lib/bobos/presentation/types";

import "./broadcast-asset-composer.css";

type Props = {
  asset: ComposedBroadcastAsset;
  transition?: PresentationTransition;
};

function artistInitials(artist: string): string {
  return artist
    .split(/\s+/)
    .map((w) => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function CoverArt({
  coverUrl,
  artist,
  title,
}: {
  coverUrl: string | null;
  artist: string;
  title: string;
}) {
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    setBroken(false);
  }, [coverUrl, artist, title]);

  const showImage = Boolean(coverUrl) && !broken;

  if (showImage && coverUrl) {
    return (
      <img
        key={coverUrl}
        className="bac__cover-image"
        src={coverUrl}
        alt={`${title} — ${artist}`}
        loading="eager"
        onError={() => setBroken(true)}
      />
    );
  }

  return (
    <div className="bac__cover-fallback" aria-hidden="true">
      <span className="bac__cover-initials">{artistInitials(artist)}</span>
    </div>
  );
}

/**
 * Standard Broadcast Asset — Theme Pack 1 phone presentation.
 * Fixed regions per template; typography is identical across all twelve.
 */
export function BroadcastAssetComposerView({ asset, transition = "fade" }: Props) {
  const template = getTemplateDefinition(asset.templateId);
  const albumLine = useMemo(
    () => formatAlbumYearLine(asset.input.album, asset.input.year),
    [asset.input.album, asset.input.year],
  );

  const transitionClass =
    transition === "slide"
      ? "bac--enter-slide"
      : transition === "cut"
        ? "bac--enter-cut"
        : "bac--enter-fade";

  const coverKey = asset.input.coverUrl ?? `fallback:${asset.input.artist}:${asset.input.title}`;

  return (
    <div
      className={`bac ${template.layoutClass} ${transitionClass}`}
      data-template={asset.templateId}
      data-template-slug={asset.templateSlug}
      aria-label={`Now playing: ${asset.input.title} by ${asset.input.artist}`}
    >
      <div className="bac__hero" aria-hidden="true" />

      <div className="bac__cover-wrap">
        <CoverArt
          key={coverKey}
          coverUrl={asset.input.coverUrl}
          artist={asset.input.artist}
          title={asset.input.title}
        />
      </div>

      <div className="bac__meta">
        <p className="bac__kicker">Now Playing</p>
        <h1 className="bac__title">{asset.input.title}</h1>
        <p className="bac__artist">{asset.input.artist}</p>
        {albumLine ? <p className="bac__album">{albumLine}</p> : null}
      </div>

      <p className="bac__brand">Retroverse Live</p>
      <p className="bac__rvtr" aria-hidden="true">
        {asset.input.rvtr}
      </p>
    </div>
  );
}
