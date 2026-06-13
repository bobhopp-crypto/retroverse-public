"use client";

import { useCallback, useEffect, useState } from "react";

import type { DownloadRunState } from "@/lib/ops/media-collections/download-state";
import {
  DOWNLOAD_STARTED_NOTICE,
  downloadStartErrorMessage,
  fetchDownloadProgress,
  startBackgroundDownload,
} from "@/lib/ops/media-collections/download-client";

type UseCollectionDownloadOptions = {
  slug: string;
  initialRunning?: boolean;
  initialProgress?: DownloadRunState | null;
  onRefresh?: () => void | Promise<void>;
};

/** Shared download start + poll for overview and detail pages. */
export function useCollectionDownload(options: UseCollectionDownloadOptions) {
  const { slug, onRefresh } = options;
  const [downloading, setDownloading] = useState(options.initialRunning ?? false);
  const [progress, setProgress] = useState<DownloadRunState | null>(
    options.initialProgress ?? null,
  );
  const [busy, setBusy] = useState(false);

  const pollDownload = useCallback(async () => {
    const next = await fetchDownloadProgress(slug);
    if (!next) return;
    setProgress(next);
    setDownloading(next.running);
    if (next.running && onRefresh) {
      await onRefresh();
    }
  }, [slug, onRefresh]);

  useEffect(() => {
    if (!downloading) return;
    const id = window.setInterval(() => {
      void pollDownload();
    }, 3000);
    return () => window.clearInterval(id);
  }, [downloading, pollDownload]);

  const startDownload = useCallback(async (): Promise<{
    ok: boolean;
    notice?: string;
    error?: string;
  }> => {
    setBusy(true);
    try {
      const result = await startBackgroundDownload(slug);
      if (result.progress) setProgress(result.progress);

      if (!result.ok) {
        if (result.progress?.running) setDownloading(true);
        return { ok: false, error: downloadStartErrorMessage(result) };
      }

      setDownloading(true);
      if (result.progress) setProgress(result.progress);
      if (onRefresh) await onRefresh();
      return { ok: true, notice: DOWNLOAD_STARTED_NOTICE };
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : "Download failed",
      };
    } finally {
      setBusy(false);
    }
  }, [slug, onRefresh]);

  return {
    downloading,
    progress,
    busy,
    pollWarning: null as string | null,
    startDownload,
    pollDownload,
    setDownloading,
    setProgress,
  };
}

type SlugRunningMap = Record<string, boolean>;

/** Poll all collections that are running on the overview page. */
export function useOverviewDownloadPolling(
  slugs: string[],
  runningBySlug: SlugRunningMap,
  onRefresh: () => void | Promise<void>,
) {
  const activeSlugs = slugs.filter((slug) => runningBySlug[slug]);

  useEffect(() => {
    if (!activeSlugs.length) return;
    const id = window.setInterval(() => {
      void (async () => {
        let anyRunning = false;
        for (const slug of activeSlugs) {
          const progress = await fetchDownloadProgress(slug);
          if (progress?.running) anyRunning = true;
        }
        if (anyRunning) await onRefresh();
      })();
    }, 3000);
    return () => window.clearInterval(id);
  }, [activeSlugs.join("|"), onRefresh]);
}
