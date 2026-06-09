"use client";

import { useCallback, useState } from "react";

import { formatBytes } from "@/lib/ops/format-bytes";
import type {
  MsPerformanceCollectionIndex,
  MsSyncStatusSummary,
} from "@/lib/ops/media-collections/midnight-special/types";
import type { MsSyncReport } from "@/lib/ops/media-collections/midnight-special/sync";

type Props = {
  initialIndex: MsPerformanceCollectionIndex | null;
  initialSync: MsSyncStatusSummary | null;
};

function formatSyncTime(iso: string | null): string {
  if (!iso) return "Never";
  return iso.replace("T", " ").slice(0, 19);
}

export default function OpsMidnightSpecialDashboard({ initialIndex, initialSync }: Props) {
  const [index, setIndex] = useState(initialIndex);
  const [sync, setSync] = useState(initialSync);
  const [busy, setBusy] = useState(false);
  const [syncBusy, setSyncBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exportConfirm, setExportConfirm] = useState(false);

  const stats = index?.stats;
  const coverage = sync?.coverage;

  const refresh = useCallback(async () => {
    const [perfRes, collRes] = await Promise.all([
      fetch("/api/ops/media-collections/midnight-special/performances", { cache: "no-store" }),
      fetch("/api/ops/media-collections/midnight-special", { cache: "no-store" }),
    ]);
    const perfData = (await perfRes.json()) as {
      ok: boolean;
      index?: MsPerformanceCollectionIndex;
    };
    const collData = (await collRes.json()) as {
      ok: boolean;
      ms_sync?: MsSyncStatusSummary;
    };
    if (perfData.ok && perfData.index) setIndex(perfData.index);
    if (collData.ok && collData.ms_sync) setSync(collData.ms_sync);
  }, []);

  async function runSync(mode: "report" | "sync-and-acquire" | "retry-private") {
    setSyncBusy(true);
    setNotice(null);
    setError(null);
    try {
      const res = await fetch("/api/ops/media-collections/midnight-special/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const data = (await res.json()) as { ok: boolean; report?: MsSyncReport; error?: string };
      if (!res.ok || !data.ok || !data.report) {
        setError(data.report?.error ?? data.error ?? "sync_failed");
        return;
      }
      const r = data.report;
      setSync({
        coverage: r.coverage,
        last_sync_at: r.synced_at,
        new_episodes_since_last_sync: r.new_episodes_since_last_sync,
        official_playlist_count: r.official_playlist_count,
        historical_episode_count: r.historical_episode_count,
      });
      const parts = [
        r.coverage.status_label,
        r.new_episodes.length ? `${r.new_episodes.length} new` : null,
        r.private_restored.length ? `${r.private_restored.length} private restored` : null,
        r.acquisition
          ? `${r.acquisition.downloaded} downloaded · ${r.acquisition.performances_generated} performances`
          : null,
      ].filter(Boolean);
      setNotice(`Sync complete — ${parts.join(" · ")}`);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "sync_failed");
    } finally {
      setSyncBusy(false);
    }
  }

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

  const actionBusy = busy || syncBusy;

  return (
    <section className="ms-dashboard">
      <h2 className="mc-card__title" style={{ marginTop: 0 }}>
        Official Sync
      </h2>

      {coverage?.caught_up_with_official ? (
        <p className="mc-notice" style={{ marginBottom: 12 }}>
          <strong>{coverage.status_label}</strong>
        </p>
      ) : null}

      <div className="mc-storage-row" style={{ marginBottom: 12 }}>
        <span>
          Official playlist: <strong>{sync?.official_playlist_count ?? coverage?.published ?? "—"}</strong>
        </span>
        <span>
          Historical run: <strong>{sync?.historical_episode_count ?? coverage?.historical ?? 350}</strong>
        </span>
        <span>
          Published coverage:{" "}
          <strong>
            {coverage
              ? `${coverage.downloaded} / ${coverage.published} (${coverage.published_coverage_pct}%)`
              : "—"}
          </strong>
        </span>
        <span>
          Historical coverage:{" "}
          <strong>
            {coverage
              ? `${coverage.downloaded} / ${coverage.historical} (${coverage.historical_coverage_pct}%)`
              : "—"}
          </strong>
        </span>
        <span>
          Last sync: <strong>{formatSyncTime(sync?.last_sync_at ?? null)}</strong>
        </span>
        <span>
          New since last sync: <strong>{sync?.new_episodes_since_last_sync ?? 0}</strong>
        </span>
        {coverage?.private_pending ? (
          <span>
            Private pending: <strong>{coverage.private_pending}</strong>
          </span>
        ) : null}
      </div>

      <div className="mc-actions" style={{ marginBottom: 20 }}>
        <button
          type="button"
          className="ops-btn ops-btn--info"
          disabled={actionBusy}
          onClick={() => void runSync("report")}
        >
          {syncBusy ? "Syncing…" : "Sync Playlist"}
        </button>
        <button
          type="button"
          className="ops-btn ops-btn--warn"
          disabled={actionBusy}
          onClick={() => void runSync("sync-and-acquire")}
        >
          Sync + Acquire
        </button>
        <button
          type="button"
          className="ops-btn"
          disabled={actionBusy}
          onClick={() => void runSync("retry-private")}
        >
          Retry Private Videos
        </button>
      </div>

      <h2 className="mc-card__title">Performance Collection</h2>

      <div className="mc-storage-row" style={{ marginBottom: 12 }}>
        <span>
          Episodes: <strong>{stats?.episodes_downloaded ?? coverage?.downloaded ?? 161}</strong>
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
          disabled={actionBusy}
          onClick={() => void runAction("generate")}
        >
          {busy ? "Working…" : "Generate Candidates"}
        </button>
        <button
          type="button"
          className="ops-btn ops-btn--warn"
          disabled={actionBusy || !stats?.performances_total}
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
          disabled={actionBusy || !(stats?.ready_to_export ?? 0)}
          onClick={handleExportClick}
          title="Gated until verification passes"
        >
          Export Accepted Clips (gated)
        </button>
        <button type="button" className="ops-btn" disabled={actionBusy} onClick={() => void refresh()}>
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
