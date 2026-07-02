"use client";

import { useEffect, useRef, useState } from "react";

import { generatePassArtwork, updatePassArtworkAdjustments } from "@/app/bobos/pass-workspace/actions";
import {
  adjustmentsToCssFilter,
  DEFAULT_PASS_ARTWORK_ADJUSTMENTS,
  PASS_ADJUSTMENT_MAX,
  PASS_ADJUSTMENT_MIN,
  PASS_ADJUSTMENT_STEP,
  type PassArtworkAdjustments,
} from "@/lib/bobos/project-zero/pass-artwork-adjustments";
import type { PassWorkspaceTemplate } from "@/lib/bobos/project-zero/load-pass-workspace-data";
import type { PassWorkspaceSlug, PassWorkspaceVersion } from "@/lib/bobos/project-zero/pass-workspace-store";

function passTypeLabel(template: PassWorkspaceTemplate): string {
  return template.name.replace(/\s+Pass$/i, "").trim() || template.name;
}

function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

type Props = {
  projectId: string;
  context: { title: string; venue: string; date: string; theme: string };
  template: PassWorkspaceTemplate;
  quantity: number;
  onQuantityChange: (quantity: number) => void;
  onVersionCreated: (slug: PassWorkspaceSlug, version: PassWorkspaceVersion) => void;
  onAdjustmentsChange: (slug: PassWorkspaceSlug, adjustments: PassArtworkAdjustments) => void;
};

/** One pass type — its own artwork, its own version history. Nothing here is ever
 *  pre-populated from another project; it only exists once Generate is clicked. */
export function PassArtworkCard({
  projectId,
  context,
  template,
  quantity,
  onQuantityChange,
  onVersionCreated,
  onAdjustmentsChange,
}: Props) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [side, setSide] = useState<"front" | "back">("front");
  const [showHistory, setShowHistory] = useState(false);
  const [showBoost, setShowBoost] = useState(false);
  const [adjustments, setAdjustments] = useState<PassArtworkAdjustments>(template.adjustments);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setAdjustments(template.adjustments);
  }, [template.adjustments]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  const hasArtwork = template.version > 0;
  const artworkUrl = side === "front" ? template.frontArtworkUrl : template.backArtworkUrl;

  function commitAdjustments(next: PassArtworkAdjustments) {
    setAdjustments(next);
    onAdjustmentsChange(template.slug, next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void updatePassArtworkAdjustments(projectId, template.slug, next);
    }, 300);
  }

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const version = await generatePassArtwork({
        projectId,
        slug: template.slug,
        eventName: context.title,
        venue: context.venue,
        date: context.date,
        theme: context.theme,
      });
      onVersionCreated(template.slug, version);
      setSide("front");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="ps-card pzw-artwork-card">
      <span className="ps-card__art">
        {hasArtwork && artworkUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={artworkUrl} alt="" style={{ filter: adjustmentsToCssFilter(adjustments) }} />
        ) : (
          <span
            className="ps-card__art-fallback ps-card__art-fallback--empty"
            style={{ background: template.colors.primary }}
          >
            <span className="ps-card__art-empty-label">
              {hasArtwork ? "No artwork on this side" : "No artwork yet"}
            </span>
          </span>
        )}
      </span>

      <span className="ps-card__name">{passTypeLabel(template)} Pass</span>

      {hasArtwork ? (
        <>
          <span className="pzw-artwork-card__version">Version {template.version}</span>

          <div className="pzw-artwork-card__actions">
            <button
              type="button"
              className="ps-card__secondary"
              onClick={() => setSide((s) => (s === "front" ? "back" : "front"))}
            >
              Preview {side === "front" ? "Back" : "Front"}
            </button>
            <button type="button" className="ps-card__secondary" disabled={generating} onClick={() => void handleGenerate()}>
              {generating ? "Regenerating…" : "Regenerate"}
            </button>
          </div>

          <button type="button" className="ps-btn ps-btn--quiet" onClick={() => setShowBoost((v) => !v)}>
            {showBoost ? "Hide Print Boost" : "Print Boost"}
          </button>

          {showBoost ? (
            <div className="pzw-boost">
              <label className="pzw-boost__toggle">
                <input
                  type="checkbox"
                  checked={adjustments.printBoost}
                  onChange={(e) => commitAdjustments({ ...adjustments, printBoost: e.target.checked })}
                />
                <span>Print Boost (fixes dark AI artwork)</span>
              </label>

              <label className="pzw-boost__slider">
                <span>Brightness</span>
                <input
                  type="range"
                  min={PASS_ADJUSTMENT_MIN}
                  max={PASS_ADJUSTMENT_MAX}
                  step={PASS_ADJUSTMENT_STEP}
                  value={adjustments.brightness}
                  onChange={(e) => commitAdjustments({ ...adjustments, brightness: Number(e.target.value) })}
                />
                <span className="pzw-boost__value">{pct(adjustments.brightness)}</span>
              </label>

              <label className="pzw-boost__slider">
                <span>Contrast</span>
                <input
                  type="range"
                  min={PASS_ADJUSTMENT_MIN}
                  max={PASS_ADJUSTMENT_MAX}
                  step={PASS_ADJUSTMENT_STEP}
                  value={adjustments.contrast}
                  onChange={(e) => commitAdjustments({ ...adjustments, contrast: Number(e.target.value) })}
                />
                <span className="pzw-boost__value">{pct(adjustments.contrast)}</span>
              </label>

              <label className="pzw-boost__slider">
                <span>Saturation</span>
                <input
                  type="range"
                  min={PASS_ADJUSTMENT_MIN}
                  max={PASS_ADJUSTMENT_MAX}
                  step={PASS_ADJUSTMENT_STEP}
                  value={adjustments.saturation}
                  onChange={(e) => commitAdjustments({ ...adjustments, saturation: Number(e.target.value) })}
                />
                <span className="pzw-boost__value">{pct(adjustments.saturation)}</span>
              </label>

              <div className="pzw-boost__footer">
                <span className="pzw-boost__hint">
                  Non-destructive — original artwork is never changed. Preview updates live;
                  Generate Batch and Print Sheets use the same adjustment.
                </span>
                <button
                  type="button"
                  className="ps-btn ps-btn--quiet"
                  onClick={() => commitAdjustments({ ...DEFAULT_PASS_ARTWORK_ADJUSTMENTS })}
                >
                  Reset
                </button>
              </div>
            </div>
          ) : null}

          <button type="button" className="ps-btn ps-btn--quiet" onClick={() => setShowHistory((v) => !v)}>
            {showHistory ? "Hide History" : `History (${template.history.length})`}
          </button>

          {showHistory ? (
            <ul className="pzw-artwork-card__history">
              {[...template.history].reverse().map((entry) => (
                <li key={entry.version} className="pzw-artwork-card__history-item">
                  <span className="pzw-artwork-card__history-thumb">
                    {entry.frontArtworkUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={entry.frontArtworkUrl} alt="" />
                    ) : null}
                  </span>
                  <span className="pzw-artwork-card__history-meta">
                    <span>Version {entry.version}</span>
                    <span>{new Date(entry.createdAt).toLocaleString()}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : (
        <button type="button" className="ps-btn ps-btn--primary" disabled={generating} onClick={() => void handleGenerate()}>
          {generating ? "Generating… (~1–3 min)" : "Generate Artwork"}
        </button>
      )}

      {error ? <p className="ps-step__error">{error}</p> : null}

      <label className="pzw-qty">
        <span>Quantity</span>
        <input
          type="number"
          min={0}
          value={quantity}
          onChange={(e) => onQuantityChange(Math.max(0, Math.floor(Number(e.target.value)) || 0))}
        />
      </label>
    </div>
  );
}
