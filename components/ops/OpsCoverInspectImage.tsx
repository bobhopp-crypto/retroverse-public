"use client";

import { useCallback, useEffect, useState } from "react";

import { isSafeCanonicalCoverPath } from "@/lib/cover-integrity/validate-cover-path";

type Props = {
  path: string | null;
  label: string;
  className?: string;
};

function thumbSrc(path: string): string {
  return `/api/ops/covers/thumbnail?path=${encodeURIComponent(path)}`;
}

export function OpsCoverInspectImage({ path, label, className = "" }: Props) {
  const [lightbox, setLightbox] = useState(false);
  const safe = path && isSafeCanonicalCoverPath(path);
  const src = safe ? thumbSrc(path) : null;

  const close = useCallback(() => setLightbox(false), []);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        close();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [lightbox, close]);

  if (!src) {
    return <p className="ops-dim">No local image</p>;
  }

  return (
    <>
      <button
        type="button"
        className={`ops-cover-art__btn ${className}`}
        onClick={() => setLightbox(true)}
        aria-label={`Zoom ${label}`}
      >
        <img className="ops-cover-art__img" src={src} alt="" />
      </button>
      {lightbox ? (
        <div
          className="ops-cover-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={label}
          onClick={close}
        >
          <button type="button" className="ops-cover-lightbox__close" onClick={close}>
            Close (Esc)
          </button>
          <img
            className="ops-cover-lightbox__img"
            src={src}
            alt=""
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}
    </>
  );
}
