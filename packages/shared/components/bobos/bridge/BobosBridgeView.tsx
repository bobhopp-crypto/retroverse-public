"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";

import {
  fetchBridgeLiveRvtr,
  fetchBridgeView,
  runBridgeVisualAction,
} from "@/app/bobos/bridge/actions";
import { HeroGeneratorModal } from "@/components/bobos/bridge/HeroGeneratorModal";
import {
  buildAvailableVisuals,
  findVisualForUrl,
} from "@/lib/bobos/bridge/available-visuals";
import type { BridgeSongModel } from "@/lib/bobos/bridge/types";
import { STATUS_LABELS, TIER_LABELS } from "@/lib/bobos/bridge/types";

import "./bridge.css";

type Props = {
  initial: BridgeSongModel | null;
  initialRvtr: string | null;
};

function tierLabel(tier: BridgeSongModel["resolvedHero"]["tier"]): string {
  if (!tier) return "None";
  return TIER_LABELS[tier];
}

export function BobosBridgeView({ initial, initialRvtr }: Props) {
  const router = useRouter();
  const [model, setModel] = useState<BridgeSongModel | null>(initial);
  const [nowPlaying, setNowPlaying] = useState(false);
  const [liveLabel, setLiveLabel] = useState<string | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [heroGenOpen, setHeroGenOpen] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const rvtr = model?.rvtr ?? initialRvtr;

  const visuals = useMemo(
    () => (model ? buildAvailableVisuals(model.visualProfile) : []),
    [model],
  );

  const liveUrl = model?.resolvedHero.url ?? null;
  const previewVisual = previewId ? visuals.find((v) => v.id === previewId) : null;
  const previewUrl = previewVisual?.url ?? liveUrl;
  const liveVisual = findVisualForUrl(visuals, liveUrl);
  const selectedId = previewId ?? liveVisual?.id ?? null;

  const navigateRvtr = useCallback(
    (nextRvtr: string | null) => {
      if (!nextRvtr) return;
      setPreviewId(null);
      router.replace(`/bobos/bridge?rvtr=${encodeURIComponent(nextRvtr)}`);
      startTransition(async () => {
        const next = await fetchBridgeView(nextRvtr);
        setModel(next);
        setMessage(null);
      });
    },
    [router],
  );

  useEffect(() => {
    if (!nowPlaying) {
      setLiveLabel(null);
      return;
    }

    let cancelled = false;

    async function syncLive() {
      const live = await fetchBridgeLiveRvtr();
      if (cancelled) return;
      setLiveLabel(live.label);
      if (live.rvtr && live.rvtr !== rvtr) {
        navigateRvtr(live.rvtr);
      }
    }

    void syncLive();
    const timer = window.setInterval(syncLive, 4000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [nowPlaying, rvtr, navigateRvtr]);

  function runAction(action: "promote_secondary" | "clear_primary" | "mark_needs_review") {
    if (!rvtr || !model?.hasPackage) return;

    startTransition(async () => {
      try {
        const next = await runBridgeVisualAction(rvtr, action);
        setModel(next);
        setPreviewId(null);
        setMessage(null);
      } catch (err) {
        setMessage(err instanceof Error ? err.message : "Action failed.");
      }
    });
  }

  function useSelectedVisual() {
    if (!previewVisual?.url || previewVisual.url === liveUrl) return;
    if (previewVisual.id === "album-cover") {
      runAction("promote_secondary");
      return;
    }
    if (previewVisual.id === "generated-hero") {
      setPreviewId(null);
      return;
    }
  }

  function handleHeroAssigned(next: BridgeSongModel) {
    setModel(next);
    setPreviewId("generated-hero");
    setMessage(null);
  }

  const canUseThis =
    previewVisual != null &&
    Boolean(model?.hasPackage) &&
    Boolean(previewVisual.url) &&
    previewVisual.url !== liveUrl &&
    previewVisual.id === "album-cover";

  if (!model) {
    return (
      <div className="bridge bridge--empty">
        <Link href="/bobos" className="bridge-brand">
          BobOS
        </Link>
        <p className="bridge-empty">No song found.</p>
      </div>
    );
  }

  const { visualProfile, resolvedHero } = model;
  const yearLabel = model.year ?? "";

  return (
    <div className="bridge">
      <div className="bridge-body">
        <aside className="bridge-rail">
          <Link href="/bobos" className="bridge-brand">
            BobOS
          </Link>

          <div className="bridge-rail__song">
            <p className="bridge-rail__title">{model.title}</p>
            <p className="bridge-rail__artist">{model.artist}</p>
            {yearLabel ? <p className="bridge-rail__year">{yearLabel}</p> : null}
          </div>

          <div className="bridge-rail__live">
            <button
              type="button"
              className={`bridge-live-dot${nowPlaying ? " bridge-live-dot--on" : ""}`}
              aria-pressed={nowPlaying}
              onClick={() => setNowPlaying((value) => !value)}
              title="Now Playing"
            />
            <span className="bridge-rail__live-text">
              {nowPlaying ? (liveLabel ?? "No Live Track") : "Now Playing"}
            </span>
          </div>

          <div className="bridge-rail__nav">
            <button
              type="button"
              className="bridge-rail__nav-btn"
              disabled={!model.prevRvtr || pending}
              onClick={() => navigateRvtr(model.prevRvtr)}
            >
              ← Previous
            </button>
            <button
              type="button"
              className="bridge-rail__nav-btn"
              disabled={!model.nextRvtr || pending}
              onClick={() => navigateRvtr(model.nextRvtr)}
            >
              Next →
            </button>
          </div>

          <button
            type="button"
            className="bridge-inspector-trigger"
            onClick={() => setInspectorOpen(true)}
          >
            Inspector
          </button>
        </aside>

        <main className="bridge-stage">
          <div className="bridge-hero">
            {previewUrl ? (
              <Image
                src={previewUrl}
                alt=""
                fill
                className="bridge-hero__img"
                priority
                unoptimized
              />
            ) : (
              <div className="bridge-hero__empty" />
            )}
          </div>
          <div className="bridge-stage__caption">
            <h1 className="bridge-stage__title">{model.title}</h1>
            <p className="bridge-stage__artist">{model.artist}</p>
            {yearLabel ? <p className="bridge-stage__year">{yearLabel}</p> : null}
          </div>
        </main>

        <aside className="bridge-visuals-panel">
          <h2 className="bridge-visuals-panel__heading">Available Visuals</h2>
          <ul className="bridge-visuals">
            {visuals.map((visual) => {
              const isSelected = selectedId === visual.id;
              const isLive = liveVisual?.id === visual.id && !previewId;
              return (
                <li key={visual.id}>
                  <button
                    type="button"
                    className={`bridge-visual${isSelected ? " bridge-visual--selected" : ""}${!visual.selectable ? " bridge-visual--future" : ""}`}
                    disabled={!visual.selectable}
                    onClick={() => visual.selectable && setPreviewId(visual.id)}
                  >
                    <div className="bridge-visual__thumb">
                      {visual.url ? (
                        <Image
                          src={visual.url}
                          alt=""
                          fill
                          className="bridge-visual__img"
                          unoptimized
                        />
                      ) : null}
                    </div>
                    <span className="bridge-visual__label">
                      {visual.label}
                      {isLive ? " · In Use" : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="bridge-visuals-panel__future" aria-hidden>
            <span>Variants</span>
            <span>Comfy Queue</span>
            <span>Approve</span>
            <span>Reject</span>
          </div>
        </aside>
      </div>

      <footer className="bridge-toolbar">
        <button
          type="button"
          className="bridge-toolbar__btn bridge-toolbar__btn--primary"
          disabled={pending || !canUseThis}
          onClick={useSelectedVisual}
        >
          Use This
        </button>
        <button
          type="button"
          className="bridge-toolbar__btn"
          disabled={pending || !model.hasPackage}
          onClick={() => setHeroGenOpen(true)}
        >
          Generate
        </button>
        <button
          type="button"
          className="bridge-toolbar__btn"
          disabled={pending || !model.hasPackage}
          onClick={() => runAction("mark_needs_review")}
        >
          Review
        </button>
        <button type="button" className="bridge-toolbar__btn" disabled>
          Hide
        </button>
        <button type="button" className="bridge-toolbar__btn" disabled>
          Flag
        </button>
        <button type="button" className="bridge-toolbar__btn" disabled>
          More
        </button>
        {message ? <p className="bridge-toolbar__message">{message}</p> : null}
      </footer>

      {heroGenOpen ? (
        <HeroGeneratorModal
          rvtr={model.rvtr}
          open={heroGenOpen}
          onClose={() => setHeroGenOpen(false)}
          onAssigned={handleHeroAssigned}
        />
      ) : null}

      {inspectorOpen ? (
        <div className="bridge-inspector-backdrop" onClick={() => setInspectorOpen(false)}>
          <aside
            className="bridge-inspector"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Inspector"
          >
            <header className="bridge-inspector__head">
              <h2>Inspector</h2>
              <button type="button" onClick={() => setInspectorOpen(false)}>
                Close
              </button>
            </header>
            <dl className="bridge-inspector__list">
              <div>
                <dt>RVTR</dt>
                <dd>{model.rvtr}</dd>
              </div>
              <div>
                <dt>Visual Status</dt>
                <dd>{STATUS_LABELS[visualProfile.status]}</dd>
              </div>
              <div>
                <dt>Resolved From</dt>
                <dd>{tierLabel(resolvedHero.tier)}</dd>
              </div>
              <div>
                <dt>Play Count</dt>
                <dd>{model.playCount ?? "—"}</dd>
              </div>
              <div>
                <dt>Storage</dt>
                <dd>{model.hasPackage ? "Song Package" : "Track only"}</dd>
              </div>
              <div>
                <dt>Primary</dt>
                <dd>{visualProfile.primaryHero.url ? "Set" : "Empty"}</dd>
              </div>
              <div>
                <dt>Secondary</dt>
                <dd>{visualProfile.secondaryHero.url ? "Set" : "Empty"}</dd>
              </div>
              <div>
                <dt>Tertiary</dt>
                <dd>{visualProfile.tertiaryHero.url ? "Set" : "Empty"}</dd>
              </div>
              <div>
                <dt>Confidence</dt>
                <dd>—</dd>
              </div>
            </dl>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
