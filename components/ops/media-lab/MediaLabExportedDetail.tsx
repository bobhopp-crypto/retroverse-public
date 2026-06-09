"use client";

import { useEffect, useState } from "react";

import type { ExportedClipRow } from "@/lib/ops/media-lab/performance-browser/exported";
import { buildMediaLabPerformanceHref } from "@/lib/ops/media-lab/workspace/urls";

type Props = {
  performanceId: string;
  onOpenSource: (episodeId: string, performanceId: string) => void;
};

export function MediaLabExportedDetail({ performanceId, onOpenSource }: Props) {
  const [clip, setClip] = useState<ExportedClipRow | null>(null);

  useEffect(() => {
    void fetch("/api/ops/media-lab/library/exported")
      .then((r) => r.json())
      .then((data: { clips?: ExportedClipRow[] }) => {
        setClip(data.clips?.find((c) => c.performance_id === performanceId) ?? null);
      });
  }, [performanceId]);

  if (!clip) return <p className="ops-dim">Select an exported clip.</p>;

  async function revealFolder() {
    await fetch("/api/ops/media-lab/library/reveal-path", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: clip!.output_path }),
    });
  }

  return (
    <section className="ml-workspace__exported-detail">
      <h2 className="ml-workspace__main-title">
        {clip.artist}
        {clip.title ? ` — ${clip.title}` : ""}
      </h2>
      <dl className="ml-workspace__meta-dl">
        <dt>Collection</dt>
        <dd>{clip.collection_title}</dd>
        <dt>Year</dt>
        <dd>{clip.year || "—"}</dd>
        <dt>Classification</dt>
        <dd>{clip.grouping}</dd>
        <dt>Exported</dt>
        <dd>{clip.exported_at?.replace("T", " ").slice(0, 19) ?? "—"}</dd>
        <dt>File</dt>
        <dd className="mc-path">{clip.output_path}</dd>
      </dl>
      <div className="mc-actions">
        <button type="button" className="ops-btn ops-btn--info" onClick={() => void revealFolder()}>
          Open Folder
        </button>
        <button
          type="button"
          className="ops-btn"
          onClick={() => onOpenSource(clip.episode_id, clip.performance_id)}
        >
          Open Source Performance
        </button>
        <a className="ops-btn ops-btn--link" href={buildMediaLabPerformanceHref({
          episodeId: clip.episode_id,
          performanceId: clip.performance_id,
          library: "performances",
        })}>
          Edit in Workspace
        </a>
      </div>
      <p className="ops-dim" style={{ marginTop: 12 }}>
        Read-only export view. Edit source performance to adjust in/out boundaries.
      </p>
    </section>
  );
}
