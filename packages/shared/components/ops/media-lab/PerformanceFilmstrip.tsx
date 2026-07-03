"use client";

import { useEffect, useMemo, useState } from "react";

import { formatChapterClock } from "@/lib/ops/media-lab/chapter-time";

type FilmstripFrame = {
  sec: number;
  url: string;
};

type PerformanceFilmstripProps = {
  episodeId: string;
  performanceId: string;
  startSec: number;
  endSec: number;
  playheadSec: number;
  onSeek: (sec: number) => void;
};

export function PerformanceFilmstrip(props: PerformanceFilmstripProps) {
  const [frames, setFrames] = useState<FilmstripFrame[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const boundsKey = `${props.performanceId}:${props.startSec.toFixed(2)}:${props.endSec.toFixed(2)}`;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setFrames([]);

    const params = new URLSearchParams({
      episode: props.episodeId,
      performance: props.performanceId,
      startSec: String(props.startSec),
      endSec: String(props.endSec),
    });

    void fetch(`/api/ops/media-lab/performance/filmstrip?${params}`)
      .then(async (res) => {
        const data = (await res.json()) as {
          ok?: boolean;
          error?: string;
          hint?: string;
          frames?: FilmstripFrame[];
        };
        if (cancelled) return;
        if (!res.ok || !data.ok) {
          throw new Error(
            data.hint ? `${data.error ?? "Filmstrip failed"} (${data.hint})` : data.error ?? "Filmstrip failed",
          );
        }
        setFrames(data.frames ?? []);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Filmstrip failed");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [boundsKey, props.episodeId, props.endSec, props.performanceId, props.startSec]);

  const activeIndex = useMemo(() => {
    if (frames.length === 0) return -1;
    let idx = 0;
    for (let i = 0; i < frames.length; i++) {
      if (props.playheadSec + 0.01 >= frames[i].sec) idx = i;
    }
    return idx;
  }, [frames, props.playheadSec]);

  if (loading) {
    return (
      <div className="ops-ml-filmstrip ops-ml-filmstrip--loading">
        <span className="ops-dim">Generating preview frames…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ops-ml-filmstrip ops-ml-filmstrip--error">
        <span className="ops-dim">{error}</span>
      </div>
    );
  }

  if (frames.length === 0) return null;

  return (
    <div className="ops-ml-filmstrip ml-perf-editor__filmstrip">
      <div className="ops-ml-filmstrip__label-row">
        <span className="ops-ml-filmstrip__label">Scene context</span>
        <span className="ops-dim">before · clip · after · click to jump</span>
      </div>
      <div className="ops-ml-filmstrip__strip" role="list">
        {frames.map((frame, i) => (
          <button
            key={frame.sec}
            type="button"
            role="listitem"
            className={`ops-ml-filmstrip__frame${i === activeIndex ? " ops-ml-filmstrip__frame--on" : ""}`}
            onClick={() => props.onSeek(frame.sec)}
            title={`Jump to ${formatChapterClock(frame.sec)}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="ops-ml-filmstrip__img"
              src={frame.url}
              alt={`Preview at ${formatChapterClock(frame.sec)}`}
              loading="lazy"
              draggable={false}
            />
            <span className="ops-ml-filmstrip__time">{formatChapterClock(frame.sec)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
