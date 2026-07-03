"use client";

import { useMemo, useState } from "react";

export function SortingSongThumb(props: { previewPath: string | null }) {
  const [failed, setFailed] = useState(false);

  const src = useMemo(() => {
    const path = props.previewPath?.trim();
    if (!path || failed) return null;
    try {
      return `/api/ops/rvtags-review/video?path=${encodeURIComponent(path)}`;
    } catch {
      return null;
    }
  }, [props.previewPath, failed]);

  if (!src) {
    return (
      <div className="ops-sort-board__thumb ops-sort-board__thumb--placeholder" aria-hidden>
        ♪
      </div>
    );
  }

  return (
    <video
      key={props.previewPath}
      className="ops-sort-board__thumb"
      src={src}
      preload="metadata"
      muted
      playsInline
      aria-hidden
      onLoadedData={(e) => {
        const el = e.currentTarget;
        if (el.readyState >= 1) el.currentTime = 0.5;
      }}
      onError={() => setFailed(true)}
    />
  );
}
