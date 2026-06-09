"use client";

import { useCallback, useState } from "react";

import { formatBytes } from "@/lib/ops/format-bytes";
import type { MsPerformanceCollectionIndex } from "@/lib/ops/media-collections/midnight-special/types";

type Props = {
  initialIndex: MsPerformanceCollectionIndex | null;
};

export default function OpsMidnightSpecialDashboard({ initialIndex }: Props) {
  const [index, setIndex] = useState(initialIndex);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exportConfirm, setExportConfirm] = useState(false);

  const stats = index?.stats;

  const refresh = useCallback(async () => {
    const res = await fetch("/api/ops/media-collections/midnight-special/performances", {
      cache: "no-store",
    });
    const data = (await res.json()) as { ok: boolean; index?: MsPerformanceCollectionIndex };
    if (data.ok && data.index) setIndex(data.index);
  }, []);

  async function runAction(action: "generate" | "accept_exact") {
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      const res = await fetch("/api/ops/media-collections/midnight-special/performances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        result?: Record<string, number>;
        index?: MsPerformanceCollectionIndex;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "action_failed");
        return;
      }
      if (data.index) setIndex(data.index);
      if (action === "generate") {
        const r = data.result as {
          performances_total?: number;
          episodes_with_performances?: number;
        };
        setNotice(
          `Generated ${r.performances_total ?? 0} performances across ${r.episodes_with_performances ?? 0} episodes.`,
        );
      } else {
        const r = data.result as { updated_to_accepted?: number; updated_to_review?: number };
        setNotice(
          `Accepted ${r.updated_to_accepted ?? 0} exact matches · ${r.updated_to_review ?? 0} sent to review queue.`,
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "action_failed");
    } finally {
      setBusy(false);
    }
  }

  function handleExportClick() {
    if (!exportConfirm) {
      setExportConfirm(true);
      setNotice("Export is disabled until verification passes. Click again to confirm you understand.");
      return;
    }
    setNotice("Export Accepted Clips is gated — run verification first. No clips exported.");
    setExportConfirm(false);
  }

  return (
    <section className="ms-dashboard">
      <h2 className="mc-card__title" style={{ marginTop: 0 }}>
        Performance Collection
      </h2>

      <div className="mc-storage-row" style={{ marginBottom: 12 }}>
        <span>
          Episodes: <strong>{stats?.episodes_downloaded ?? 161}</strong>
        </span>
        <span>
          Detected: <strong>{stats?.performances_total ?? 0}</strong>
        </span>
        <span>
          Accepted: <strong>{stats?.accepted ?? 0}</strong>
        </span>
        <span>
          Needs review: <strong>{stats?.review ?? 0}</strong>
        </span>
        <span>
          Rejected: <strong>{stats?.rejected ?? 0}</strong>
        </span>
        <span>
          Exported: <strong>{stats?.exported ?? 0}</strong>
        </span>
        <span>
          Ready to export: <strong>{stats?.ready_to_export ?? 0}</strong>
        </span>
        {stats?.estimated_export_bytes ? (
          <span>
            Est. export storage: <strong>~{formatBytes(stats.estimated_export_bytes)}</strong> (
            {stats.estimated_export_gb} GB)
          </span>
        ) : null}
      </div>

      <div className="mc-actions">
        <button
          type="button"
          className="ops-btn ops-btn--info"
          disabled={busy}
          onClick={() => void runAction("generate")}
        >
          {busy ? "Working…" : "Generate Candidates"}
        </button>
        <button
          type="button"
          className="ops-btn ops-btn--warn"
          disabled={busy || !stats?.performances_total}
          onClick={() => void runAction("accept_exact")}
        >
          Accept All Exact Matches
        </button>
        <a
          className="ops-btn ops-btn--link"
          href="/ops/media-collections/midnight-special/review?mode=queue"
        >
          Open Review Queue
        </a>
        <button
          type="button"
          className="ops-btn"
          disabled={busy || !(stats?.ready_to_export ?? 0)}
          onClick={handleExportClick}
          title="Gated until verification passes"
        >
          Export Accepted Clips (gated)
        </button>
        <button type="button" className="ops-btn" disabled={busy} onClick={() => void refresh()}>
          Refresh stats
        </button>
      </div>

      {notice ? <p className="mc-notice">{notice}</p> : null}
      {error ? <p className="mc-notice mc-notice--error">{error}</p> : null}

      {!stats?.performances_total ? (
        <p className="ops-dim" style={{ marginTop: 12 }}>
          No performance manifests yet. Run <strong>Generate Candidates</strong> to parse chapter
          markers across all downloaded episodes.
        </p>
      ) : null}
    </section>
  );
}
