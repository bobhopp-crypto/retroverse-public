"use client";

import { formatChapterClock } from "@/lib/ops/media-lab/chapter-time";

type ClipMetadataPanelProps = {
  showTitle: string;
  clipIndex: number;
  totalClips: number;
  startSec: number;
  endSec: number;
  showDurationSec: number;
  sourceFilename: string;
  /** Focus workstation: show name + clip counter + length only. */
  compact?: boolean;
};

function formatClipLength(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatShowPosition(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const total = h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
  return total;
}

export function ClipMetadataPanel(props: ClipMetadataPanelProps) {
  const lengthSec = Math.max(0, Math.round(props.endSec - props.startSec));

  if (props.compact) {
    return (
      <div className="ops-ml-clip-meta ops-ml-clip-meta--compact">
        <h2 className="ops-ml-clip-meta__show">{props.showTitle}</h2>
        <p className="ops-ml-clip-meta__counter">
          Clip {props.clipIndex + 1} of {props.totalClips}
          <span className="ops-ml-clip-meta__length"> · Length {lengthSec}s</span>
        </p>
      </div>
    );
  }

  return (
    <div className="ops-ml-clip-meta">
      <h2 className="ops-ml-clip-meta__show">{props.showTitle}</h2>
      <p className="ops-ml-clip-meta__counter">
        Clip {props.clipIndex + 1} of {props.totalClips}
      </p>
      <dl className="ops-ml-clip-meta__grid">
        <div>
          <dt>Clip time</dt>
          <dd>
            {formatChapterClock(props.startSec)} → {formatChapterClock(props.endSec)}
          </dd>
        </div>
        <div>
          <dt>Clip length</dt>
          <dd>{formatClipLength(lengthSec)}</dd>
        </div>
        <div>
          <dt>Position in show</dt>
          <dd>
            {formatShowPosition(props.startSec)} of {formatShowPosition(props.showDurationSec)}
          </dd>
        </div>
        <div className="ops-ml-clip-meta__file">
          <dt>Source file</dt>
          <dd>{props.sourceFilename}</dd>
        </div>
      </dl>
    </div>
  );
}
