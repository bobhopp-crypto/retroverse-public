"use client";

import { useMemo, useState, type ReactNode } from "react";

import { OpsQueuePanel } from "@/components/ops/OpsQueuePanel";
import { OpsPill, OpsTable } from "@/components/ops/OpsTable";
import { formatBytes } from "@/lib/ops/format-bytes";
import type { MediaSyncConsoleData, MediaSyncRow } from "@/lib/ops/media-sync/types";

function linkagePill(row: MediaSyncRow) {
  return (
    <OpsPill tone={row.linkage === "linked" ? "ok" : "warn"}>
      {row.linkage === "linked" ? `LINKED (${row.linkCount})` : "UNLINKED"}
    </OpsPill>
  );
}

function mediaRows(
  rows: MediaSyncRow[],
  reviewedIds: Set<string>,
  onReview: (id: string) => void,
  busyId: string | null,
  extra?: (row: MediaSyncRow) => Record<string, ReactNode>,
) {
  return rows.map((row) => {
    const reviewed = reviewedIds.has(row.id);
    const extraCells = extra?.(row) ?? {};
    return {
      id: row.id,
      tone: reviewed ? ("info" as const) : row.linkage === "linked" ? ("ok" as const) : ("warn" as const),
      cells: {
        file: (
          <span>
            <span className="ops-strong">{row.filename}</span>
            {reviewed ? <span className="ops-dim"> · reviewed</span> : null}
          </span>
        ),
        path: <span className="ops-mono ops-wrap ops-dim">{row.filepath}</span>,
        artist: row.artist,
        title: row.title,
        size: formatBytes(row.fileSize),
        modified: <span className="ops-mono">{row.modifiedAt}</span>,
        linkage: linkagePill(row),
        r2: <span className="ops-mono ops-wrap">{row.r2Key || "—"}</span>,
        ...extraCells,
        actions: (
          <button
            type="button"
            className="ops-btn ops-btn--info"
            disabled={busyId === row.id || reviewed}
            onClick={() => onReview(row.id)}
          >
            {reviewed ? "Reviewed" : "Mark reviewed"}
          </button>
        ),
      },
    };
  });
}

const MEDIA_COLS = [
  { key: "file", label: "Filename" },
  { key: "path", label: "Path" },
  { key: "artist", label: "Artist" },
  { key: "title", label: "Title" },
  { key: "size", label: "Size", align: "right" as const },
  { key: "modified", label: "Modified" },
  { key: "linkage", label: "Chart link" },
  { key: "r2", label: "R2 key" },
  { key: "actions", label: "Actions" },
];

export default function OpsMediaSyncBoard(props: MediaSyncConsoleData) {
  const [reviewedIds, setReviewedIds] = useState(() => new Set(props.reviewedIds));
  const [busyId, setBusyId] = useState<string | null>(null);

  const reviewed = useMemo(() => reviewedIds, [reviewedIds]);

  async function markReviewed(rowId: string) {
    setBusyId(rowId);
    try {
      const res = await fetch("/api/ops/media-sync/reviewed", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rowId }),
      });
      const data = (await res.json()) as { ok?: boolean; reviewedIds?: string[] };
      if (data.ok && data.reviewedIds) {
        setReviewedIds(new Set(data.reviewedIds));
      } else {
        setReviewedIds((prev) => new Set([...prev, rowId]));
      }
    } finally {
      setBusyId(null);
    }
  }

  const s = props.summary;

  return (
    <div className="ops-grid">
      <OpsQueuePanel
        id="media-sync-summary"
        title="Summary Stats"
        subtitle="VDJ VIDEO inventory vs R2 keys in Postgres (read-only)"
        tone={s.missingOnR2 > 100 ? "warn" : "ok"}
      >
        <dl className="ops-kv">
          <div>
            <dt>Local VIDEO files</dt>
            <dd>{s.totalLocalVideo}</dd>
          </div>
          <div>
            <dt>R2 keys (indexed)</dt>
            <dd>{s.totalR2Keys}</dd>
          </div>
          <div>
            <dt>Matched uploads</dt>
            <dd>{s.matchedUploads}</dd>
          </div>
          <div>
            <dt>Missing on R2</dt>
            <dd>{s.missingOnR2}</dd>
          </div>
          <div>
            <dt>Local-only</dt>
            <dd>{s.localOnly}</dd>
          </div>
          <div>
            <dt>R2-only rows</dt>
            <dd>{s.r2Only}</dd>
          </div>
          <div>
            <dt>Unlinked to chart</dt>
            <dd>{s.unmatchedChartLinked}</dd>
          </div>
          <div>
            <dt>Last refresh</dt>
            <dd className="ops-mono">{s.lastRefreshAt || "—"}</dd>
          </div>
        </dl>
        <p className="ops-dim" style={{ marginTop: "0.5rem" }}>
          {s.snapshotNote}
        </p>
        {props.status.partial.length ? (
          <p className="ops-dim">
            {props.status.partial.join(" · ")}
          </p>
        ) : null}
      </OpsQueuePanel>

      <OpsQueuePanel
        id="media-sync-missing-r2"
        title="Missing On R2"
        subtitle="Local VIDEO exists · no r2_media_key"
        count={props.queues.missingOnR2.length}
        tone="bad"
      >
        <OpsTable
          columns={MEDIA_COLS}
          rows={mediaRows(props.queues.missingOnR2, reviewed, markReviewed, busyId)}
          empty="No local-only VIDEO rows in sample."
        />
      </OpsQueuePanel>

      <OpsQueuePanel
        id="media-sync-local-new"
        title="Local New Videos"
        subtitle="Added/updated in last 14 days (VDJ snapshot)"
        count={props.queues.localNewVideos.length}
        tone="info"
      >
        <OpsTable
          columns={MEDIA_COLS}
          rows={mediaRows(props.queues.localNewVideos, reviewed, markReviewed, busyId)}
          empty="No recent local VIDEO rows in sample."
        />
      </OpsQueuePanel>

      <OpsQueuePanel
        id="media-sync-r2-orphans"
        title="R2 Orphans"
        subtitle="R2 key without local path — human review only"
        count={props.queues.r2Orphans.length}
        tone="warn"
      >
        <OpsTable
          columns={MEDIA_COLS}
          rows={mediaRows(props.queues.r2Orphans, reviewed, markReviewed, busyId)}
          empty="No R2-only rows in sample."
        />
      </OpsQueuePanel>

      <OpsQueuePanel
        id="media-sync-drift"
        title="Possible Metadata Drift"
        subtitle="Local+R2 present · weak linkage or missing size/hash (no checksum yet)"
        count={props.queues.metadataDrift.length}
        tone="warn"
      >
        <OpsTable
          columns={[...MEDIA_COLS.slice(0, 7), { key: "note", label: "Drift" }, MEDIA_COLS[7], MEDIA_COLS[8]]}
          rows={mediaRows(props.queues.metadataDrift, reviewed, markReviewed, busyId, (row) => ({
            note: <span className="ops-dim">{row.driftNote || "—"}</span>,
          }))}
          empty="No drift candidates in sample."
        />
      </OpsQueuePanel>

      <OpsQueuePanel
        id="media-sync-upload-unmatched"
        title="Uploaded But Unmatched"
        subtitle="Local+R2 present · not linked to chart graph"
        count={props.queues.uploadedUnmatched.length}
        tone="info"
      >
        <OpsTable
          columns={MEDIA_COLS}
          rows={mediaRows(props.queues.uploadedUnmatched, reviewed, markReviewed, busyId)}
          empty="No uploaded-unmatched rows in sample."
        />
      </OpsQueuePanel>
    </div>
  );
}
