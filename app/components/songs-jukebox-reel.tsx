"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  formatSongPeakLabel,
  formatSongWeeksLabel,
  formatSongYear,
} from "@/lib/artist/format-track-card";
import type { JukeboxSongRow } from "@/lib/songs/jukebox-row";
import { songActionTargetFromParts } from "@/lib/songs/song-actions";

import { SongActions } from "@/app/components/song-actions";
import "./songs-jukebox.css";

type Props = {
  rows: JukeboxSongRow[];
  idPrefix?: string;
};

type CardVariant = "preview" | "active";

function SongThumb({ coverUrl }: { coverUrl?: string }) {
  const [broken, setBroken] = useState(false);
  const src = coverUrl?.trim();
  if (!src || broken) {
    return <div className="song-stack-card__thumb song-stack-card__thumb--empty" aria-hidden />;
  }

  return (
    <div className="song-stack-card__thumb" aria-hidden>
      <img
        src={src}
        alt=""
        className="song-stack-card__thumb-img"
        onError={() => setBroken(true)}
      />
    </div>
  );
}

function SongStackCard({
  row,
  variant,
  id,
}: {
  row: JukeboxSongRow;
  variant: CardVariant;
  id?: string;
}) {
  const isActive = variant === "active";

  if (!isActive) {
    const previewBody = (
      <div className="song-stack-card__main">
        <h3 className="song-stack-card__title">{row.title}</h3>
        <p className="song-stack-card__artist">{row.artist}</p>
      </div>
    );

    return (
      <article id={id} className="song-stack-card song-stack-card--preview">
        {row.href ? (
          <Link
            href={row.href}
            className="song-stack-card__preview-link"
            aria-label={`Open ${row.title}`}
          >
            {previewBody}
          </Link>
        ) : (
          previewBody
        )}
      </article>
    );
  }

  const yearValue = formatSongYear(row.releaseYear);
  const peakValue = formatSongPeakLabel(row.peakHot100);
  const weeksValue = formatSongWeeksLabel(row.chartWeeks) || "—";

  const textBlock = (
    <>
      <h3 className="song-stack-card__title">{row.title}</h3>
      <p className="song-stack-card__artist">{row.artist}</p>
      <hr className="song-stack-card__rule" />
      <dl className="song-stack-card__stats">
        <div>
          <dt>Year</dt>
          <dd>{yearValue}</dd>
        </div>
        <div>
          <dt>Peak</dt>
          <dd>{peakValue}</dd>
        </div>
        <div>
          <dt>Weeks</dt>
          <dd>{weeksValue}</dd>
        </div>
      </dl>
    </>
  );

  return (
    <article id={id} className="song-stack-card song-stack-card--active">
      <div className="song-stack-card__shell">
        <div className="song-stack-card__layout">
          <SongThumb coverUrl={row.coverUrl} />
          {row.href ? (
            <Link
              href={row.href}
              className="song-stack-card__main song-stack-card__main--grow"
              aria-label={`Open ${row.title}`}
            >
              {textBlock}
            </Link>
          ) : (
            <div className="song-stack-card__main song-stack-card__main--grow">
              {textBlock}
            </div>
          )}
          <SongActions
            layout="stack"
            target={songActionTargetFromParts({
              title: row.title,
              artist: row.artist,
              rvtr: row.rvtr,
              id: row.id,
              href: row.href,
            })}
          />
        </div>
      </div>
    </article>
  );
}

function GhostCard() {
  return <div className="song-stack-card song-stack-card--ghost" aria-hidden />;
}

/** Static 3-card column: previous · active · next. Arrow (or swipe) shifts index. */
export function SongsJukeboxReel({ rows, idPrefix = "song-reel" }: Props) {
  const [index, setIndex] = useState(0);
  const touchStartY = useRef<number | null>(null);

  const rowIds = rows.map((r) => r.id).join("|");

  useEffect(() => {
    setIndex(0);
  }, [rowIds]);

  useEffect(() => {
    setIndex((i) => Math.min(i, Math.max(0, rows.length - 1)));
  }, [rows.length]);

  const step = useCallback(
    (direction: -1 | 1) => {
      setIndex((i) => Math.min(rows.length - 1, Math.max(0, i + direction)));
    },
    [rows.length],
  );

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0]?.clientY ?? null;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartY.current;
    touchStartY.current = null;
    if (start == null) return;
    const endY = e.changedTouches[0]?.clientY;
    if (endY == null) return;
    const delta = endY - start;
    if (Math.abs(delta) < 36) return;
    step(delta < 0 ? 1 : -1);
  };

  if (rows.length === 0) return null;

  const active = rows[index]!;
  const previous = index > 0 ? rows[index - 1]! : null;
  const next = index < rows.length - 1 ? rows[index + 1]! : null;

  return (
    <div className="song-stack" role="group" aria-label="Songs preview">
      <button
        type="button"
        className="song-stack__arrow song-stack__arrow--tab"
        onClick={() => step(-1)}
        disabled={index <= 0}
        aria-label="Previous song"
      >
        ↑
      </button>

      <div
        className="song-stack__column"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {previous ? (
          <SongStackCard row={previous} variant="preview" />
        ) : (
          <GhostCard />
        )}

        <SongStackCard row={active} variant="active" id={`${idPrefix}-${index}`} />

        {next ? <SongStackCard row={next} variant="preview" /> : <GhostCard />}
      </div>

      <button
        type="button"
        className="song-stack__arrow song-stack__arrow--tab"
        onClick={() => step(1)}
        disabled={index >= rows.length - 1}
        aria-label="Next song"
      >
        ↓
      </button>
    </div>
  );
}
