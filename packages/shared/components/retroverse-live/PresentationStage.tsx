"use client";

import { useEffect, useMemo, useState } from "react";

import {
  broadcastCompositionKey,
  composeBroadcastAsset,
  extractBroadcastInputFromPackage,
  extractBroadcastInputFromRvba,
} from "@/lib/broadcast/composer";
import { resolveBroadcastAsset } from "@/lib/broadcast/resolve-broadcast-asset";
import type { CurrentBroadcast } from "@/lib/broadcast/current-broadcast";
import { tracePresentationRender } from "@/lib/broadcast/presentation-render-trace";
import type { Rvba, RvbaType } from "@/lib/broadcast/rvba";
import { resolveRvbaFromPresentationItem } from "@/lib/broadcast/rvba";
import type { PresentationItem } from "@/lib/bobos/presentation/types";
import type { UniversalPackagePayload } from "@/lib/universal-renderer/load-package";

import { BroadcastAssetComposerView } from "./BroadcastAssetComposerView";
import "./presentation-stage.css";

/**
 * The one renderer for Retroverse Live.
 *
 * The Studio preview (Program Monitor) and the public player both render
 * this component, so "what you see in the preview" is exactly what the
 * audience sees. It is a pure function of the current Rvba + the playhead
 * engine's CurrentBroadcast metadata — never VirtualDJ state, queue shapes,
 * or legacy PresentationItem types.
 *
 * Asset routing (via resolveBroadcastAsset):
 *   RVTR / VDJ track  → Standard Broadcast Asset (Theme Pack 1 composer)
 *   RVBA + all others → Broadcast stage card (title/subtitle/body)
 */

type Props = {
  /** Authoritative playhead item — song items always mount the now-playing composer. */
  item?: PresentationItem | null;
  rvba: Rvba | null;
  /** Playhead engine metadata — authoritative for which experience to mount. */
  broadcast?: CurrentBroadcast | null;
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

const KICKERS: Record<RvbaType, string> = {
  "now-playing": "Now Playing",
  story: "Story",
  artist: "Artist Spotlight",
  album: "Album",
  charts: "Charts",
  related: "Related",
  announcement: "Announcement",
  giveaway: "Giveaway",
  image: "",
  pdf: "",
  video: "",
  countdown: "Starting In",
  blank: "",
};

/** Identity for package fetch + composition — changes on every VDJ/RVTR track change. */
function songTrackKey(rvba: Rvba, packageRvtr: string | null, assetId: string | null): string {
  if (packageRvtr) return packageRvtr;
  const linkId = rvba.link?.id?.trim() ?? "";
  return `${linkId || assetId || rvba.id}|${rvba.title.trim()}|${rvba.subtitle.trim()}`;
}

export function PresentationStage({
  item = null,
  rvba: rvbaProp,
  broadcast = null,
  offAirTitle = "Retroverse Live",
}: Props) {
  const rvba =
    item?.type === "song" ? resolveRvbaFromPresentationItem(item) : rvbaProp;

  const asset = resolveBroadcastAsset(rvba, broadcast, item?.type ?? null);

  useEffect(() => {
    tracePresentationRender({
      step: "resolveBroadcastAsset",
      experience: asset.experience,
      itemType: item?.type ?? null,
      rvbaType: rvba?.type ?? null,
      broadcastSourceId: broadcast?.sourceId ?? null,
      component:
        asset.experience === "broadcast-asset" ? "BroadcastAssetComposerView" : "BroadcastStageCard",
    });
  }, [asset.experience, asset.packageRvtr, broadcast?.sourceId, item?.type, rvba?.type]);

  const [pkg, setPkg] = useState<UniversalPackagePayload | null>(null);

  const trackKey =
    rvba && asset.experience === "broadcast-asset"
      ? songTrackKey(rvba, asset.packageRvtr, asset.assetId)
      : null;

  useEffect(() => {
    const requestedRvtr = asset.packageRvtr;
    if (!requestedRvtr) {
      setPkg(null);
      return;
    }

    let cancelled = false;
    setPkg((prev) => (prev?.rvtr === requestedRvtr ? prev : null));

    fetch(`/api/retroverse-live/now-playing-package?rvtr=${requestedRvtr}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { package: UniversalPackagePayload | null } | null) => {
        const next = data?.package ?? null;
        if (!cancelled && next?.rvtr === requestedRvtr) {
          setPkg(next);
        }
      })
      .catch(() => {
        // Transient — composer falls back to RVBA metadata; next poll recovers.
      });
    return () => {
      cancelled = true;
    };
  }, [asset.packageRvtr, trackKey]);

  const composedAsset = useMemo(() => {
    if (asset.experience !== "broadcast-asset" || !rvba) return null;

    const songKey = asset.packageRvtr ?? asset.assetId ?? rvba.id;
    const matchedPkg =
      asset.packageRvtr && pkg?.rvtr === asset.packageRvtr ? pkg : null;
    const input = matchedPkg
      ? extractBroadcastInputFromPackage(matchedPkg)
      : extractBroadcastInputFromRvba(rvba, songKey);

    if (!input.title && !input.artist) return null;
    return composeBroadcastAsset(input);
  }, [asset.experience, asset.packageRvtr, asset.assetId, pkg, rvba, trackKey]);

  const chosenComponent = useMemo(() => {
    if (composedAsset || (asset.experience === "broadcast-asset" && rvba)) {
      return "BroadcastAssetComposerView";
    }
    if (asset.experience === "off-air" || !rvba) return "OffAirStage";
    if (rvba.type === "image" && rvba.mediaUrl) return "ImageSlideStage";
    return "BroadcastStageCard";
  }, [asset.experience, composedAsset, rvba]);

  useEffect(() => {
    tracePresentationRender({
      step: "PresentationStage",
      experience: asset.experience,
      itemType: item?.type ?? null,
      rvbaType: rvba?.type ?? null,
      broadcastSourceId: broadcast?.sourceId ?? null,
      component: chosenComponent,
      detail: asset.packageRvtr ? `rvtr=${asset.packageRvtr}` : undefined,
    });
  }, [asset, broadcast?.sourceId, chosenComponent, item?.type, rvba]);

  if (composedAsset || (asset.experience === "broadcast-asset" && rvba)) {
    const fallbackInput = extractBroadcastInputFromRvba(
      rvba!,
      asset.packageRvtr ?? asset.assetId ?? rvba!.id,
    );
    const assetToRender =
      composedAsset ??
      (fallbackInput.title || fallbackInput.artist
        ? composeBroadcastAsset(fallbackInput)
        : null);

    if (assetToRender) {
      const compositionKey = broadcastCompositionKey(assetToRender.input);
      return (
        <div
          key={compositionKey}
          className="rv-stage rv-stage--now-playing rv-stage--broadcast-asset"
        >
          <BroadcastAssetComposerView
            key={compositionKey}
            asset={assetToRender}
            transition={rvba?.transition}
          />
        </div>
      );
    }
  }

  if (asset.experience === "off-air" || !rvba) {
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

  if (rvba.type === "image" && rvba.mediaUrl) {
    return (
      <div
        key={`${asset.kind}:${asset.assetId ?? rvba.id}`}
        className={`rv-stage rv-stage--image rv-stage--enter-${rvba.transition}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- broadcast slide, not a Next asset */}
        <img className="rv-stage__slide-img" src={rvba.mediaUrl} alt={rvba.title || "Broadcast slide"} />
      </div>
    );
  }

  const kicker = KICKERS[rvba.type];
  const headline =
    rvba.link && (rvba.type === "artist" || rvba.type === "now-playing")
      ? rvba.link.label
      : rvba.title;

  return (
    <div
      key={`${asset.kind}:${asset.assetId ?? rvba.id}`}
      className={`rv-stage rv-stage--${rvba.type} rv-stage--enter-${rvba.transition}`}
    >
      <div className="rv-stage__inner">
        {kicker ? <p className="rv-stage__kicker">{kicker}</p> : null}
        <h1 className="rv-stage__title">{headline}</h1>
        {rvba.subtitle ? <p className="rv-stage__subtitle">{rvba.subtitle}</p> : null}
        {rvba.type === "countdown" ? <CountdownClock target={rvba.countdownTarget} /> : null}
        {rvba.body ? <p className="rv-stage__body">{rvba.body}</p> : null}
      </div>
      <p className="rv-stage__brand">Retroverse Live</p>
    </div>
  );
}
