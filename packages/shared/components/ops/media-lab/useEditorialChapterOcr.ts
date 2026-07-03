"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { ChapterOcrHint } from "@/lib/ops/media-lab/editorial/chapter-ocr";

export type ChapterOcrSet = Pick<
  ChapterOcrHint,
  "chapterId" | "rawText" | "lines" | "subjects" | "primarySubject" | "byFrame"
>;

type EditorialChapterOcrProps = {
  year: number;
  jobSlug: string;
  chapters: { id: string; startSec: number; endSec: number }[];
  boundsKey: string;
  enabled?: boolean;
  onReady?: (map: Record<string, ChapterOcrSet>) => void;
  onError?: (message: string) => void;
};

export function useEditorialChapterOcr(props: EditorialChapterOcrProps) {
  const { year, jobSlug, chapters, boundsKey, enabled = true, onReady, onError } = props;
  const [ocr, setOcr] = useState<Record<string, ChapterOcrSet>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastKey = useRef("");

  const load = useCallback(async () => {
    if (!enabled || chapters.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ops/media-lab/editorial/ocr", {
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
        ocr?: Record<string, ChapterOcrSet>;
      };
      if (!res.ok || !data.ok) {
        throw new Error(
          data.hint ? `${data.error ?? "OCR failed"} (${data.hint})` : data.error ?? "OCR failed",
        );
      }
      const map = data.ocr ?? {};
      setOcr(map);
      onReady?.(map);
    } catch (e) {
      const message = e instanceof Error ? e.message : "OCR failed";
      setError(message);
      onError?.(message);
    } finally {
      setLoading(false);
    }
  }, [chapters, enabled, jobSlug, onError, onReady, year]);

  useEffect(() => {
    if (!enabled) return;
    if (boundsKey === lastKey.current) return;
    lastKey.current = boundsKey;
    void load();
  }, [boundsKey, enabled, load]);

  return { ocr, loading, error, reload: load };
}
