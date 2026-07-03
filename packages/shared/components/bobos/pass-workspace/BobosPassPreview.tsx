"use client";

import { useEffect, useState } from "react";

import { BOBOS_PASS_ASPECT_RATIO } from "@/lib/bobos/project-zero/pass-production-spec";
import type { GeneratedPass } from "@/lib/ops/event-studio/pass-studio/types";

type Props = {
  passes: GeneratedPass[];
  index: number;
  onIndexChange: (index: number) => void;
  cacheBust?: number;
};

function withCacheBust(url: string, nonce: number | undefined): string {
  if (!nonce) return url;
  return `${url}${url.includes("?") ? "&" : "?"}v=${nonce}`;
}

/** Preview — read-only view of the generated batch. */
export function BobosPassPreview({ passes, index, onIndexChange, cacheBust }: Props) {
  const [side, setSide] = useState<"front" | "back">("front");

  useEffect(() => {
    setSide("front");
  }, [index]);

  if (passes.length === 0) {
    return (
      <section className="pzw-section pzw-panel ps-step ps-step--center">
        <h2 className="ps-step__title">5 · Review</h2>
        <p className="ps-step__hint">Issue passes to review the finished, numbered passes here.</p>
      </section>
    );
  }

  const clampedIndex = Math.min(Math.max(0, index), passes.length - 1);
  const pass = passes[clampedIndex]!;
  const artworkUrl = side === "front" ? pass.front.artworkUrl : pass.back.artworkUrl;

  return (
    <section className="pzw-section pzw-panel ps-step">
      <h2 className="ps-step__title">5 · Review</h2>
      <p className="pzw-preview__meta">
        {pass.passType} · Serial {pass.serial} · {clampedIndex + 1} of {passes.length}
      </p>

      <div className="pzw-preview-simple">
        <div className="pzw-preview__card" style={{ aspectRatio: BOBOS_PASS_ASPECT_RATIO }}>
          {artworkUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={withCacheBust(artworkUrl, cacheBust)}
              alt={`${pass.passType} pass — ${side}`}
              className="pzw-preview__image"
            />
          ) : (
            <div className="pzw-preview__missing">No artwork</div>
          )}
        </div>

        <div className="pzw-preview-simple__controls">
          <div className="ps-preview__toggle">
            <button
              type="button"
              className={`ps-btn ps-btn--hero${side === "front" ? " ps-btn--primary" : ""}`}
              onClick={() => setSide("front")}
            >
              Front
            </button>
            <button
              type="button"
              className={`ps-btn ps-btn--hero${side === "back" ? " ps-btn--primary" : ""}`}
              onClick={() => setSide("back")}
            >
              Back
            </button>
          </div>

          <div className="ps-preview__nav">
            <button
              type="button"
              className="ps-btn ps-btn--hero"
              disabled={clampedIndex === 0}
              onClick={() => onIndexChange(clampedIndex - 1)}
            >
              Previous
            </button>
            <button
              type="button"
              className="ps-btn ps-btn--hero"
              disabled={clampedIndex === passes.length - 1}
              onClick={() => onIndexChange(clampedIndex + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
