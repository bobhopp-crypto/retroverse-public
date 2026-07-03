"use client";

import { useEffect, useMemo, useState } from "react";

type Props = {
  filePath: string;
  title: string;
  artist: string;
  onClose: () => void;
};

export function OpsRvTagsVideoPreview(props: Props) {
  const [failed, setFailed] = useState(false);

  const src = useMemo(() => {
    if (!props.filePath.trim()) return null;
    return `/api/ops/rvtags-review/video?path=${encodeURIComponent(props.filePath)}`;
  }, [props.filePath]);

  useEffect(() => {
    setFailed(false);
  }, [props.filePath]);

  return (
    <div className="ops-rvreview__preview">
      <button
        type="button"
        className="ops-rvreview__preview-close"
        onClick={props.onClose}
      >
        Close
      </button>
      {!src || failed ? (
        <div className="ops-rvreview__preview-body ops-rvreview__preview-body--empty">
          <div className="ops-rvreview__preview-placeholder" aria-hidden>
            ▶
          </div>
          <p className="ops-rvreview__preview-msg">
            {failed ? "Video unavailable" : "No preview"}
          </p>
          <p className="ops-rvreview__preview-meta">
            {props.title} · {props.artist}
          </p>
        </div>
      ) : (
        <div className="ops-rvreview__preview-body">
          <video
            key={props.filePath}
            className="ops-rvreview__preview-video"
            src={src}
            controls
            playsInline
            preload="none"
            onError={() => setFailed(true)}
          />
        </div>
      )}
    </div>
  );
}
