"use client";

import { useEffect, useMemo, useState } from "react";

import {
  composeBroadcastAssetFromPackageState,
  initialBroadcastAssetPackageState,
  loadBroadcastAssetPackage,
  logBroadcastAssetComposer,
  type BroadcastAssetPackageState,
} from "@/lib/broadcast/composer/broadcast-asset-composer-pipeline";
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

function BroadcastAssetComposerDiagnostic({
  rvtr,
  packageState,
  fallbackAsset,
}: {
  rvtr: string;
  packageState: BroadcastAssetPackageState;
  fallbackAsset: ComposedBroadcastAsset;
}) {
  const fetchLabel =
    packageState.fetchStatus != null ? String(packageState.fetchStatus) : "no response";

  return (
    <div className="bac bac--diagnostic" role="alert">
      <div className="bac__diagnostic-card">
        <p className="bac__diagnostic-rule" aria-hidden="true">
          ------------------------------------
        </p>
        <h2 className="bac__diagnostic-title">PACKAGE NOT FOUND</h2>
        <p className="bac__diagnostic-rvtr">{rvtr}</p>
        <p className="bac__diagnostic-line">
          fetch: {fetchLabel}
        </p>
        <p className="bac__diagnostic-line">
          url: {packageState.packageLookupUrl ?? "—"}
        </p>
        <p className="bac__diagnostic-line">
          package found: {packageState.packageFound ? "true" : "false"}
        </p>
        <p className="bac__diagnostic-line">
          loading: {packageState.phase === "loading" ? "true" : "false"}
        </p>
        <p className="bac__diagnostic-label">reason:</p>
        <p className="bac__diagnostic-reason">{packageState.errorReason ?? "unknown"}</p>
        {packageState.responseBody ? (
          <pre className="bac__diagnostic-body">{packageState.responseBody}</pre>
        ) : null}
        <p className="bac__diagnostic-rule" aria-hidden="true">
          ------------------------------------
        </p>
        <p className="bac__diagnostic-fallback">
          Showing fallback: {fallbackAsset.input.title} — {fallbackAsset.input.artist}
        </p>
      </div>
    </div>
  );
}

function BroadcastAssetComposerCard({
  asset,
  transition = "fade",
  loading = false,
  showDiagnostic = false,
  packageState,
}: {
  asset: ComposedBroadcastAsset;
  transition?: PresentationTransition;
  loading?: boolean;
  showDiagnostic?: boolean;
  packageState: BroadcastAssetPackageState;
}) {
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

  if (!asset.input.title && !asset.input.artist) {
    logBroadcastAssetComposer("render blocked — empty title and artist", {
      requestedRvtr: asset.input.rvtr,
      earlyReturn: "empty-meta",
      renderReturnsNull: true,
    });
    return (
      <BroadcastAssetComposerDiagnostic
        rvtr={asset.input.rvtr}
        packageState={{
          ...packageState,
          errorReason: "composed asset has no title or artist",
        }}
        fallbackAsset={asset}
      />
    );
  }

  logBroadcastAssetComposer("render BroadcastAssetComposerCard", {
    requestedRvtr: asset.input.rvtr,
    title: asset.input.title,
    artist: asset.input.artist,
    loading,
    showDiagnostic,
    renderReturnsNull: false,
    component: "BroadcastAssetComposerCard",
  });

  return (
    <div
      className={`bac ${template.layoutClass} ${transitionClass}${loading ? " bac--loading" : ""}${showDiagnostic ? " bac--with-diagnostic" : ""}`}
      data-template={asset.templateId}
      data-template-slug={asset.templateSlug}
      aria-label={`Now playing: ${asset.input.title} by ${asset.input.artist}`}
      aria-busy={loading}
    >
      {loading ? <p className="bac__loading-banner">Loading package…</p> : null}
      {showDiagnostic && packageState.errorReason ? (
        <p className="bac__diagnostic-inline">
          Package unavailable ({packageState.errorReason}) — showing playhead metadata
        </p>
      ) : null}

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

/**
 * Standard Broadcast Asset — Theme Pack 1 phone presentation.
 * Loads the song package, logs each pipeline step, and never leaves a blank screen.
 */
export function BroadcastAssetComposerView({ asset: fallbackAsset, transition = "fade" }: Props) {
  const requestedRvtr = fallbackAsset.input.rvtr?.trim().toUpperCase() || null;
  const [packageState, setPackageState] = useState<BroadcastAssetPackageState>(() =>
    initialBroadcastAssetPackageState(requestedRvtr),
  );

  useEffect(() => {
    if (!requestedRvtr) {
      const reason = "missing RVTR on fallback asset";
      logBroadcastAssetComposer("pipeline stop — no RVTR", {
        earlyReturn: "missing-rvtr",
        reason,
      });
      setPackageState({
        phase: "error",
        requestedRvtr: null,
        packageLookupUrl: null,
        fetchStatus: null,
        responseBody: null,
        packageFound: false,
        errorReason: reason,
        pkg: null,
      });
      return;
    }

    let cancelled = false;
    setPackageState(initialBroadcastAssetPackageState(requestedRvtr));

    logBroadcastAssetComposer("pipeline mount", {
      requestedRvtr,
      fallbackTitle: fallbackAsset.input.title,
      fallbackArtist: fallbackAsset.input.artist,
      loading: true,
    });

    void loadBroadcastAssetPackage(requestedRvtr, fallbackAsset).then((next) => {
      if (cancelled) return;
      setPackageState(next);
      logBroadcastAssetComposer("pipeline state settled", {
        requestedRvtr,
        phase: next.phase,
        packageFound: next.packageFound,
        fetchStatus: next.fetchStatus,
        errorReason: next.errorReason,
        loading: false,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [fallbackAsset.input.artist, fallbackAsset.input.title, requestedRvtr]);

  const composedAsset = useMemo(
    () => composeBroadcastAssetFromPackageState(fallbackAsset, packageState),
    [fallbackAsset, packageState],
  );

  const loading = packageState.phase === "loading";
  const hardFailure =
    packageState.phase === "error" &&
    !packageState.packageFound &&
    Boolean(packageState.errorReason);

  useEffect(() => {
    logBroadcastAssetComposer("pipeline render decision", {
      requestedRvtr,
      phase: packageState.phase,
      packageFound: packageState.packageFound,
      loading,
      hardFailure,
      title: composedAsset.input.title,
      artist: composedAsset.input.artist,
      component: hardFailure ? "BroadcastAssetComposerDiagnostic+FallbackCard" : "BroadcastAssetComposerCard",
      renderReturnsNull: false,
    });
  }, [composedAsset.input.artist, composedAsset.input.title, hardFailure, loading, packageState, requestedRvtr]);

  if (hardFailure) {
    return (
      <div className="bac-shell">
        <BroadcastAssetComposerDiagnostic
          rvtr={requestedRvtr ?? "—"}
          packageState={packageState}
          fallbackAsset={fallbackAsset}
        />
        <BroadcastAssetComposerCard
          asset={composedAsset}
          transition={transition}
          loading={false}
          showDiagnostic
          packageState={packageState}
        />
      </div>
    );
  }

  return (
    <div className="bac-shell">
      <BroadcastAssetComposerCard
        asset={composedAsset}
        transition={transition}
        loading={loading}
        packageState={packageState}
      />
    </div>
  );
}
