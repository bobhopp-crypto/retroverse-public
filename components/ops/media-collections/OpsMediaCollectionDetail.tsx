"use client";

import { useCallback, useState } from "react";

import { OpsInlineLink, OpsPill, OpsTable } from "@/components/ops/OpsTable";
import { formatBytes } from "@/lib/ops/format-bytes";
import { formatDuration } from "@/lib/ops/media-collections/format-duration";
import type { MediaCollectionDetailData } from "@/lib/ops/media-collections/load";
import type { EpisodeManifest } from "@/lib/ops/media-collections/types";

import { useCollectionDownload } from "./use-collection-download";

function episodeStatusTone(
  ep: EpisodeManifest,
): "ok" | "warn" | "bad" | "info" {
  if (ep.harvested) return "ok";
  if (ep.processed) return "ok";
  if (ep.downloaded) return "warn";
  if (ep.status === "failed") return "bad";
  return "info";
}

function episodeStatusLabel(ep: EpisodeManifest): string {
  if (ep.harvested) return "HARVESTED";
  if (ep.processed) return "PROCESSED";
  if (ep.downloaded) return "DOWNLOADED";
  return ep.status.toUpperCase();
}

function boolMark(v: boolean): string {
  return v ? "✓" : "—";
}

function estimateFullCollectionBytes(
  downloadedCount: number,
  downloadsBytes: number,
  totalEpisodes: number,
): string | null {
  if (downloadedCount <= 0 || downloadsBytes <= 0) return null;
  const avg = downloadsBytes / downloadedCount;
  const est = avg * totalEpisodes;
  return formatBytes(est);
}

export default function OpsMediaCollectionDetail(props: {
  initial: MediaCollectionDetailData;
}) {
  const [data, setData] = useState(props.initial);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanBusy, setScanBusy] = useState(false);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/ops/media-collections/${data.slug}`);
    if (!res.ok) throw new Error("Refresh failed");
    const json = (await res.json()) as MediaCollectionDetailData & { ok: boolean };
    setData(json);
    setProgress(json.download_progress);
    setDownloading(json.download_progress.running);
  }, [data.slug]);

  const {
    downloading,
    progress,
    busy: downloadBusy,
    startDownload,
    setDownloading,
    setProgress,
  } = useCollectionDownload({
    slug: data.slug,
    initialRunning: props.initial.download_progress.running,
    initialProgress: props.initial.download_progress,
    onRefresh: refresh,
  });

  const busy = scanBusy || downloadBusy;

  const scan = async () => {
    setScanBusy(true);
    setNotice(null);
    setError(null);
    try {
      const res = await fetch(`/api/ops/media-collections/${data.slug}/scan`, {
        method: "POST",
      });
      const json = (await res.json()) as {
        ok?: boolean;
        episodes_found?: number;
        episodes_new?: number;
        error?: string;
      };
      if (!res.ok || !json.ok) {
        setError(json.error || "Scan failed");
        return;
      }
      setNotice(
        `Scan complete — ${json.episodes_found ?? 0} episodes (${json.episodes_new ?? 0} new).`,
      );
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scan failed");
    } finally {
      setScanBusy(false);
    }
  };

  const reveal = async (target: "root" | "downloads") => {
    setNotice(null);
    setError(null);
    const res = await fetch(`/api/ops/media-collections/${data.slug}/reveal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target }),
    });
    const json = (await res.json()) as { ok?: boolean; path?: string; error?: string };
    if (!res.ok || !json.ok) {
      setError(json.error || "Reveal failed");
      return;
    }
    setNotice(`Revealed in Finder: ${json.path}`);
  };

  const downloadMissing = async () => {
    setNotice(null);
    setError(null);
    const result = await startDownload();
    if (result.ok) setNotice(result.notice ?? null);
    else setError(result.error ?? "Download failed to start");
  };

  const openMediaLab = async (episodeId: string) => {
    const res = await fetch(
      `/api/ops/media-collections/${data.slug}/media-lab?episode=${encodeURIComponent(episodeId)}`,
    );
    const json = (await res.json()) as {
      ok?: boolean;
      link?: { media_lab_href: string; status: string };
      error?: string;
    };
    if (!res.ok || !json.link) {
      setError(json.error || "Media Lab link unavailable");
      return;
    }
    if (json.link.status === "not_downloaded") {
      setNotice("Episode not downloaded yet — Media Lab link reserved for future import.");
    }
    window.open(json.link.media_lab_href, "_blank", "noopener,noreferrer");
  };

  const { collection, manifest, episodes, storage } = data;
  const remaining = Math.max(0, collection.episode_count - collection.downloaded_count);
  const estFull = estimateFullCollectionBytes(
    collection.downloaded_count,
    storage.downloads_bytes,
    collection.episode_count,
  );

  return (
    <section>
      <div className="mc-meta-panel">
        <dl>
          <dt>Collection</dt>
          <dd>
            <strong>{collection.title}</strong>{" "}
            <OpsPill tone="warn">{collection.status.toUpperCase()}</OpsPill>
          </dd>
          <dt>Description</dt>
          <dd>{collection.description || "—"}</dd>
          <dt>Source URL</dt>
          <dd>
            {collection.source_url ? (
              <OpsInlineLink href={collection.source_url} external>
                {collection.source_url}
              </OpsInlineLink>
            ) : (
              "—"
            )}
          </dd>
          <dt>Storage root</dt>
          <dd className="mc-path">{manifest.storage_root}</dd>
          <dt>Downloads</dt>
          <dd className="mc-path">{manifest.paths.downloads}</dd>
          <dt>Episodes dir</dt>
          <dd className="mc-path">{manifest.paths.episodes}</dd>
          <dt>Last scan</dt>
          <dd>
            {manifest.last_scan_at
              ? `${manifest.last_scan_at.replace("T", " ").slice(0, 19)} · ${manifest.last_scan_episode_count ?? 0} videos`
              : "Never"}
          </dd>
        </dl>

        <div className="mc-storage-row">
          <span>
            Episodes: <strong>{collection.episode_count}</strong>
          </span>
          <span>
            Downloaded: <strong>{collection.downloaded_count}</strong>
          </span>
          <span>
            Remaining: <strong>{remaining}</strong>
          </span>
          <span>
            Processed: <strong>{collection.processed_count}</strong>
          </span>
          <span>
            Harvested: <strong>{collection.harvested_count}</strong>
          </span>
          <span>Download storage: {formatBytes(storage.downloads_bytes)}</span>
          <span>Total size: {formatBytes(storage.total_bytes)}</span>
          {estFull ? <span>Est. full collection: ~{estFull}</span> : null}
        </div>

        <div className="mc-download-progress">
          <span>
            Queued: <strong>{progress?.queued ?? 0}</strong>
          </span>
          <span>
            Downloading: <strong>{progress?.downloading ?? 0}</strong>
            {progress?.current_episode_title ? (
              <> · {progress.current_episode_title.slice(0, 48)}</>
            ) : null}
          </span>
          <span>
            Downloaded: <strong>{progress?.downloaded ?? collection.downloaded_count}</strong>
          </span>
          <span>
            Failed: <strong>{progress?.failed ?? 0}</strong>
          </span>
          {downloading ? (
            <OpsPill tone="warn">RUNNING</OpsPill>
          ) : (
            <OpsPill tone="info">IDLE</OpsPill>
          )}
        </div>

        <div className="mc-actions" style={{ marginTop: 12 }}>
          <button
            type="button"
            className="ops-btn ops-btn--info"
            disabled={busy || !collection.source_url}
            onClick={scan}
          >
            {scanBusy ? "Scanning…" : "Scan Playlist"}
          </button>
          <button
            type="button"
            className="ops-btn ops-btn--warn"
            disabled={busy || downloading}
            onClick={downloadMissing}
          >
            {downloading ? "Downloading…" : "Download Missing"}
          </button>
          <button
            type="button"
            className="ops-btn ops-btn--info"
            onClick={() => reveal("root")}
          >
            Reveal Folder
          </button>
          <button
            type="button"
            className="ops-btn ops-btn--info"
            onClick={() => reveal("downloads")}
          >
            Reveal Downloads
          </button>
        </div>
      </div>

      {notice ? <p className="mc-notice">{notice}</p> : null}
      {error ? <p className="mc-notice mc-notice--error">{error}</p> : null}

      <OpsTable
        columns={[
          { key: "status", label: "Status" },
          { key: "episode", label: "Episode" },
          { key: "date", label: "Date" },
          { key: "duration", label: "Duration", align: "right" },
          { key: "downloaded", label: "DL", align: "right" },
          { key: "processed", label: "Proc", align: "right" },
          { key: "harvested", label: "Harv", align: "right" },
          { key: "actions", label: "Actions" },
        ]}
        rows={episodes.map((ep) => ({
          id: ep.id,
          tone: episodeStatusTone(ep),
          cells: {
            status: (
              <OpsPill tone={episodeStatusTone(ep)}>{episodeStatusLabel(ep)}</OpsPill>
            ),
            episode: (
              <span className="mc-episode-title" title={ep.title}>
                {ep.episode_number ? `Ep ${ep.episode_number} · ` : ""}
                {ep.title}
              </span>
            ),
            date: ep.air_date || "—",
            duration: formatDuration(ep.duration_seconds),
            downloaded: boolMark(ep.downloaded),
            processed: boolMark(ep.processed),
            harvested: boolMark(ep.harvested),
            actions: (
              <span style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {ep.source_url ? (
                  <OpsInlineLink href={ep.source_url} external>
                    Open
                  </OpsInlineLink>
                ) : null}
                <button
                  type="button"
                  className="ops-link"
                  style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
                  onClick={() => openMediaLab(ep.id)}
                >
                  Media Lab
                </button>
              </span>
            ),
          },
        }))}
        empty="No episodes yet. Press Scan Playlist to enumerate the YouTube playlist."
      />
    </section>
  );
}
