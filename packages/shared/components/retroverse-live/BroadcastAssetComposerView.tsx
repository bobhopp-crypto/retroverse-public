"use client";

import { useEffect, useMemo, useState } from "react";

import {
  composeBroadcastAssetFromPackageState,
  initialBroadcastAssetPackageState,
  loadBroadcastAssetPackage,
  logBroadcastAssetComposer,
  packageLookupUrlForRvtr,
  type BroadcastAssetPackageState,
} from "@/lib/broadcast/composer/broadcast-asset-composer-pipeline";
import {
  formatAlbumYearLine,
  getTemplateDefinition,
  type ComposedBroadcastAsset,
} from "@/lib/broadcast/composer";
import type { PresentationTransition } from "@/lib/bobos/presentation/types";

import "./broadcast-asset-composer.css";

const RVTR_RE = /^RVTR\d{6}$/i;
const SHOW_BAC_DEV_PANEL = process.env.NODE_ENV === "development";

type Props = {
  asset: ComposedBroadcastAsset;
  transition?: PresentationTransition;
  /** Canonical RVTR from resolveBroadcastAsset — preferred over fallback asset rvtr. */
  packageRvtr?: string | null;
};

function BroadcastAssetComposerDevPanel({
  requestedRvtr,
  packageState,
  loading,
  hardFailure,
  renderBranch,
  fallbackAsset,
}: {
  requestedRvtr: string | null;
  packageState: BroadcastAssetPackageState;
  loading: boolean;
  hardFailure: boolean;
  renderBranch: string;
  fallbackAsset: ComposedBroadcastAsset;
}) {
  if (!SHOW_BAC_DEV_PANEL) return null;

  const packageKeys =
    packageState.pkg && typeof packageState.pkg === "object"
      ? Object.keys(packageState.pkg)
      : [];

  return (
    <aside className="bac__dev-panel" aria-label="Broadcast asset composer debug">
      <p className="bac__dev-panel-title">BAC debug</p>
      <p>requested RVTR: {requestedRvtr ?? "—"}</p>
      <p>fallback rvtr: {fallbackAsset.input.rvtr}</p>
      <p>loading: {String(loading)}</p>
      <p>phase: {packageState.phase}</p>
      <p>error: {packageState.errorReason ?? "—"}</p>
      <p>fetch status: {packageState.fetchStatus ?? "—"}</p>
      <p>package exists: {String(Boolean(packageState.pkg))}</p>
      <p>package found: {String(packageState.packageFound)}</p>
      <p>package keys: {packageKeys.length ? packageKeys.join(", ") : "—"}</p>
      <p>render path: {renderBranch}</p>
    </aside>
  );
}

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
export function BroadcastAssetComposerView({
  asset: fallbackAsset,
  transition = "fade",
  packageRvtr = null,
}: Props) {
  const requestedRvtr =
    (packageRvtr?.trim() || fallbackAsset.input.rvtr?.trim() || "").toUpperCase() || null;
  const [packageState, setPackageState] = useState<BroadcastAssetPackageState>(() => {
    const initial = initialBroadcastAssetPackageState(requestedRvtr);
    logBroadcastAssetComposer("state init BEFORE setState", {
      requestedRvtr,
      packageRvtr,
      fallbackRvtr: fallbackAsset.input.rvtr,
      phase: initial.phase,
      packageFound: initial.packageFound,
    });
    return initial;
  });

  useEffect(() => {
    if (!requestedRvtr) {
      const reason = "missing RVTR on fallback asset";
      logBroadcastAssetComposer("pipeline stop — no RVTR", {
        earlyReturn: "missing-rvtr",
        reason,
        packageRvtr,
        fallbackRvtr: fallbackAsset.input.rvtr,
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

    if (!RVTR_RE.test(requestedRvtr)) {
      logBroadcastAssetComposer("pipeline stop — non-canonical requested id", {
        requestedRvtr,
        packageRvtr,
        fallbackRvtr: fallbackAsset.input.rvtr,
        earlyReturn: "invalid-rvtr-format",
      });
      setPackageState({
        phase: "idle",
        requestedRvtr,
        packageLookupUrl: null,
        fetchStatus: null,
        responseBody: null,
        packageFound: false,
        errorReason: null,
        pkg: null,
      });
      return;
    }

    let cancelled = false;
    const before = packageState;
    logBroadcastAssetComposer("package state BEFORE setState(loading)", {
      requestedRvtr,
      phase: before.phase,
      packageFound: before.packageFound,
      errorReason: before.errorReason,
    });
    setPackageState(initialBroadcastAssetPackageState(requestedRvtr));

    logBroadcastAssetComposer("pipeline mount", {
      requestedRvtr,
      packageLookupUrl: packageLookupUrlForRvtr(requestedRvtr),
      fallbackTitle: fallbackAsset.input.title,
      fallbackArtist: fallbackAsset.input.artist,
      loading: true,
    });

    void loadBroadcastAssetPackage(requestedRvtr, fallbackAsset).then((next) => {
      if (cancelled) {
        logBroadcastAssetComposer("pipeline result discarded — effect cancelled", {
          requestedRvtr,
          phase: next.phase,
          packageFound: next.packageFound,
        });
        return;
      }
      logBroadcastAssetComposer("package state AFTER setState", {
        requestedRvtr,
        phase: next.phase,
        packageFound: next.packageFound,
        fetchStatus: next.fetchStatus,
        errorReason: next.errorReason,
        packageKeys: next.pkg ? Object.keys(next.pkg) : [],
      });
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
  }, [requestedRvtr]);

  const composedAsset = useMemo(
    () => composeBroadcastAssetFromPackageState(fallbackAsset, packageState),
    [fallbackAsset, packageState],
  );

  const loading = packageState.phase === "loading";
  const hardFailure =
    packageState.phase === "error" &&
    !packageState.packageFound &&
    Boolean(packageState.errorReason);

  const renderBranch = hardFailure
    ? "BroadcastAssetComposerDiagnostic+FallbackCard"
    : loading
      ? "BroadcastAssetComposerCard(loading)"
      : packageState.packageFound
        ? "BroadcastAssetComposerCard(package)"
        : "BroadcastAssetComposerCard(fallback)";

  useEffect(() => {
    logBroadcastAssetComposer("pipeline render decision", {
      requestedRvtr,
      phase: packageState.phase,
      packageFound: packageState.packageFound,
      loading,
      hardFailure,
      errorReason: packageState.errorReason,
      title: composedAsset.input.title,
      artist: composedAsset.input.artist,
      component: renderBranch,
      diagnosticVisible: hardFailure,
      renderReturnsNull: false,
    });
  }, [
    composedAsset.input.artist,
    composedAsset.input.title,
    hardFailure,
    loading,
    packageState,
    renderBranch,
    requestedRvtr,
  ]);

  if (hardFailure) {
    return (
      <div className="bac-shell">
        <BroadcastAssetComposerDevPanel
          requestedRvtr={requestedRvtr}
          packageState={packageState}
          loading={loading}
          hardFailure={hardFailure}
          renderBranch={renderBranch}
          fallbackAsset={fallbackAsset}
        />
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
      <BroadcastAssetComposerDevPanel
        requestedRvtr={requestedRvtr}
        packageState={packageState}
        loading={loading}
        hardFailure={hardFailure}
        renderBranch={renderBranch}
        fallbackAsset={fallbackAsset}
      />
      <BroadcastAssetComposerCard
        asset={composedAsset}
        transition={transition}
        loading={loading}
        packageState={packageState}
      />
    </div>
  );
}
