"use client";

import { useCallback, useState } from "react";

import { OpsInlineLink, OpsPill } from "@/components/ops/OpsTable";
import { formatBytes } from "@/lib/ops/format-bytes";
import {
  DOWNLOAD_STARTED_NOTICE,
  downloadStartErrorMessage,
  startBackgroundDownload,
} from "@/lib/ops/media-collections/download-client";
import type { CollectionCardData } from "@/lib/ops/media-collections/types";

import { useOverviewDownloadPolling } from "./use-collection-download";

function statusTone(
  status: CollectionCardData["status"],
): "ok" | "warn" | "bad" | "info" {
  if (status === "active" || status === "complete") return "ok";
  if (status === "acquiring") return "warn";
  if (status === "paused") return "bad";
  return "info";
}

function sourceLabel(c: CollectionCardData): string {
  if (c.source_url) return c.source_url;
  if (c.source_type === "youtube_playlist") return "YouTube playlist (not configured)";
  if (c.source_type === "internet_archive") return "Internet Archive (not configured)";
  return "Manual / local";
}

function initialRunningMap(collections: CollectionCardData[]): Record<string, boolean> {
  return Object.fromEntries(collections.map((c) => [c.slug, c.download_running]));
}

export default function OpsMediaCollections(props: {
  initialCollections: CollectionCardData[];
  dataRoot: string;
}) {
  const [collections, setCollections] = useState(props.initialCollections);
  const [runningBySlug, setRunningBySlug] = useState(() =>
    initialRunningMap(props.initialCollections),
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/ops/media-collections");
    if (!res.ok) throw new Error("Failed to refresh collections");
    const data = (await res.json()) as { collections: CollectionCardData[] };
    setCollections(data.collections);
    setRunningBySlug((prev) => {
      const next = { ...prev };
      for (const c of data.collections) {
        next[c.slug] = c.download_running;
      }
      return next;
    });
  }, []);

  useOverviewDownloadPolling(
    collections.map((c) => c.slug),
    runningBySlug,
    refresh,
  );

  const scan = async (slug: string) => {
    setBusyId(slug);
    setNotice(null);
    setError(null);
    try {
      const res = await fetch(`/api/ops/media-collections/${slug}/scan`, { method: "POST" });
      const data = (await res.json()) as {
        ok?: boolean;
        episodes_found?: number;
        episodes_new?: number;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setError(data.error || "Scan failed");
        return;
      }
      setNotice(
        `Scan complete — ${data.episodes_found ?? 0} episodes found (${data.episodes_new ?? 0} new).`,
      );
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scan failed");
    } finally {
      setBusyId(null);
    }
  };

  const downloadMissing = async (slug: string) => {
    setBusyId(slug);
    setNotice(null);
    setError(null);
    try {
      const result = await startBackgroundDownload(slug);
      if (!result.ok) {
        if (result.progress?.running) {
          setRunningBySlug((prev) => ({ ...prev, [slug]: true }));
        }
        setError(downloadStartErrorMessage(result));
        return;
      }
      setRunningBySlug((prev) => ({ ...prev, [slug]: true }));
      setNotice(DOWNLOAD_STARTED_NOTICE);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section>
      <p className="ops-dim mc-path">
        Data root: <strong>{props.dataRoot}</strong>
      </p>

      {notice ? <p className="mc-notice">{notice}</p> : null}
      {error ? <p className="mc-notice mc-notice--error">{error}</p> : null}

      <div className="mc-grid">
        {collections.map((c) => {
          const downloading = runningBySlug[c.slug] === true;
          const actionBusy = busyId === c.slug;
          const canDownload = c.episode_count > c.downloaded_count;

          return (
            <article key={c.id} className="mc-card">
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <h2 className="mc-card__title">{c.title}</h2>
                <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  {downloading ? <OpsPill tone="warn">DOWNLOADING</OpsPill> : null}
                  <OpsPill tone={statusTone(c.status)}>{c.status.toUpperCase()}</OpsPill>
                </span>
              </div>
              <p className="mc-card__source">{sourceLabel(c)}</p>

              <dl className="mc-stats">
                <dt>Episodes found</dt>
                <dd>{c.episode_count}</dd>
                <dt>Downloaded</dt>
                <dd>{c.downloaded_count}</dd>
                <dt>Processed</dt>
                <dd>{c.processed_count}</dd>
                <dt>Harvested</dt>
                <dd>{c.harvested_count}</dd>
              </dl>

              <div className="mc-storage-row">
                <span>Downloads: {c.storage.downloads_file_count} files</span>
                <span>Size: {formatBytes(c.storage.total_bytes)}</span>
              </div>
              <p className="ops-dim mc-path">{c.storage_root || "—"}</p>

              <div className="mc-actions">
                <button
                  type="button"
                  className="ops-btn ops-btn--info"
                  disabled={actionBusy || c.source_type !== "youtube_playlist" || !c.source_url}
                  onClick={() => scan(c.slug)}
                  title={
                    c.source_url
                      ? "Enumerate YouTube playlist via yt-dlp"
                      : "No playlist URL configured"
                  }
                >
                  {actionBusy && !downloading ? "Scanning…" : "Scan"}
                </button>
                <button
                  type="button"
                  className="ops-btn ops-btn--warn"
                  disabled={actionBusy || downloading || !canDownload}
                  onClick={() => downloadMissing(c.slug)}
                  title={
                    !canDownload
                      ? "No pending episodes — scan playlist first or all episodes downloaded"
                      : "Download missing episodes in background"
                  }
                >
                  {downloading ? "Downloading…" : actionBusy ? "Starting…" : "Download Missing"}
                </button>
                <OpsInlineLink href={`/ops/media-collections/${c.slug}`}>
                  Open Collection →
                </OpsInlineLink>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
