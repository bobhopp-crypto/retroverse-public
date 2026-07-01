"use client";

import { useState } from "react";

import { generatePassArtwork } from "@/app/bobos/pass-workspace/actions";
import type { PassWorkspaceTemplate } from "@/lib/bobos/project-zero/load-pass-workspace-data";
import type { PassWorkspaceSlug, PassWorkspaceVersion } from "@/lib/bobos/project-zero/pass-workspace-store";

function passTypeLabel(template: PassWorkspaceTemplate): string {
  return template.name.replace(/\s+Pass$/i, "").trim() || template.name;
}

type Props = {
  projectId: string;
  context: { title: string; venue: string; date: string; theme: string };
  template: PassWorkspaceTemplate;
  quantity: number;
  onQuantityChange: (quantity: number) => void;
  onVersionCreated: (slug: PassWorkspaceSlug, version: PassWorkspaceVersion) => void;
};

/** One pass type — its own artwork, its own version history. Nothing here is ever
 *  pre-populated from another project; it only exists once Generate is clicked. */
export function PassArtworkCard({ projectId, context, template, quantity, onQuantityChange, onVersionCreated }: Props) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [side, setSide] = useState<"front" | "back">("front");
  const [showHistory, setShowHistory] = useState(false);

  const hasArtwork = template.version > 0;
  const artworkUrl = side === "front" ? template.frontArtworkUrl : template.backArtworkUrl;

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
          <img src={artworkUrl} alt="" />
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
