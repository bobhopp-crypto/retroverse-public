"use client";

import { useEffect, useState } from "react";

import {
  BOBOS_PASS_ASPECT_RATIO,
  BOBOS_PASS_FINISHED_HEIGHT_IN,
  BOBOS_PASS_FINISHED_WIDTH_IN,
} from "@/lib/bobos/project-zero/pass-production-spec";
import type { GeneratedPass } from "@/lib/ops/event-studio/pass-studio/types";

type Props = {
  passes: GeneratedPass[];
  index: number;
  onIndexChange: (index: number) => void;
  /** Bumped after a Print Boost rebuild so the browser re-fetches the (same-URL) finished
   *  image instead of showing a cached pre-adjustment copy. */
  cacheBust?: number;
};

function withCacheBust(url: string, nonce: number | undefined): string {
  if (!nonce) return url;
  return `${url}${url.includes("?") ? "&" : "?"}v=${nonce}`;
}

const STATUS_LABEL: Record<string, string> = {
  available: "Available",
  registered: "Registered",
  checked_in: "Checked In",
  archived: "Archived",
};

/**
 * Preview shows the exact production image — AI-designed collectible artwork with only
 * QR + serial stamp composited on by BobOS. No live CSS overlay: what you see here is
 * pixel-for-pixel what prints.
 */
export function BobosPassPreview({ passes, index, onIndexChange, cacheBust }: Props) {
  const [side, setSide] = useState<"front" | "back">("front");

  useEffect(() => {
    setSide("front");
  }, [index]);

  if (passes.length === 0) {
    return (
      <div className="ps-step ps-step--center">
        <h2 className="ps-step__title">Preview</h2>
        <p className="ps-step__hint">Generate a batch to preview production-ready passes here.</p>
      </div>
    );
  }

  const clampedIndex = Math.min(Math.max(0, index), passes.length - 1);
  const pass = passes[clampedIndex]!;
  const artworkUrl = side === "front" ? pass.front.artworkUrl : pass.back.artworkUrl;

  return (
    <div className="ps-step">
      <h2 className="ps-step__title">Preview</h2>
      <p className="pzw-preview__spec">
        {BOBOS_PASS_FINISHED_WIDTH_IN}&quot; × {BOBOS_PASS_FINISHED_HEIGHT_IN}&quot; finished size · preview matches print exactly
      </p>

      <div className="ps-preview pzw-preview">
        <div className="ps-preview__face-wrap pzw-preview__face-wrap">
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
        </div>

        <div className="ps-preview__info">
          <p className="ps-preview__serial">No. {pass.serial}</p>
          <p className="ps-preview__type">{pass.passType}</p>
          <p className="ps-preview__status">{STATUS_LABEL[pass.status] ?? pass.status}</p>
          {pass.qr.url ? <p className="ps-preview__qr-url">{pass.qr.url}</p> : null}

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

          <p className="ps-preview__counter">
            Pass {clampedIndex + 1} of {passes.length}
          </p>
        </div>
      </div>
    </div>
  );
}
