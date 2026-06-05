"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { ChapterThumbSet } from "./ChapterThumbTriplet";

type EditorialTableThumbnailsProps = {
  year: number;
  jobSlug: string;
  chapters: { id: string; startSec: number; endSec: number }[];
  boundsKey: string;
  onReady?: (map: Record<string, ChapterThumbSet>) => void;
  onError?: (message: string) => void;
};

export function useEditorialTableThumbnails(props: EditorialTableThumbnailsProps) {
  const { year, jobSlug, chapters, boundsKey, onReady, onError } = props;
  const [thumbs, setThumbs] = useState<Record<string, ChapterThumbSet>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastKey = useRef("");

  const load = useCallback(async () => {
    if (chapters.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ops/media-lab/editorial/thumbnails", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          year,
          jobSlug,
          chapters: chapters.map(({ id, startSec, endSec }) => ({
            id,
            startSec,
            endSec,
          })),
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        hint?: string;
        thumbs?: Record<string, ChapterThumbSet>;
      };
      if (!res.ok || !data.ok) {
        throw new Error(
          data.hint ? `${data.error ?? "Thumbnails failed"} (${data.hint})` : data.error ?? "Thumbnails failed",
        );
      }
      const map = data.thumbs ?? {};
      setThumbs(map);
      onReady?.(map);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Thumbnails failed";
      setError(message);
      onError?.(message);
    } finally {
      setLoading(false);
    }
  }, [chapters, jobSlug, onError, onReady, year]);

  useEffect(() => {
    if (boundsKey === lastKey.current) return;
    lastKey.current = boundsKey;
    void load();
  }, [boundsKey, load]);

  return { thumbs, loading, error, reload: load };
}
