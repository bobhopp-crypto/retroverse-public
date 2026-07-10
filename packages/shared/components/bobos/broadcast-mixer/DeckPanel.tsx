"use client";

import { useState, type DragEvent } from "react";

import type { BroadcastStatus } from "@/app/bobos/broadcast/actions";
import {
  ASSET_KIND_DEFAULT_DURATION,
  ASSET_KIND_LABELS,
  MIXER_OUTPUTS,
  MIXER_OUTPUT_LABELS,
  type AssetReference,
  type Deck,
  type DeckPlaylistEntry,
  type MixerOutputId,
} from "@/lib/bobos/mixer/types";

/** Drag payload dropped from the Asset Browser — either a plain asset card
 * or a Broadcast Sequence card (superset with loadKind/loadKey/collectionId). */
type DeckDropPayload = AssetReference & {
  loadKind?: "sequence" | "asset";
  loadKey?: string;
  collectionId?: string;
};

type Props = {
  side: "left" | "right";
  deck: Deck;
  isLive: boolean;
  status: BroadcastStatus;
  busy: boolean;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onOutputChange: (output: MixerOutputId | null) => void;
  onCue: (index: number) => void;
  onRemove: (entryId: string) => void;
  onReorder: (entryId: string, direction: "up" | "down") => void;
  onAutoReturnChange: (autoReturnToLive: boolean) => void;
  onDropAsset: (asset: AssetReference, atIndex?: number) => void;
  onDropSequence: (collectionId: string, sequenceId: string, atIndex?: number) => void;
};

function readDropPayload(event: { dataTransfer: DataTransfer }): DeckDropPayload | null {
  const raw = event.dataTransfer.getData("application/json");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && typeof parsed.assetId === "string") {
      return parsed as DeckDropPayload;
    }
  } catch {
    // ignore malformed payloads
  }
  return null;
}

function formatClock(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

export function DeckPanel({
  side,
  deck,
  isLive,
  status,
  busy,
  onPlay,
  onPause,
  onNext,
  onPrevious,
  onOutputChange,
  onCue,
  onRemove,
  onReorder,
  onAutoReturnChange,
  onDropAsset,
  onDropSequence,
}: Props) {
  const [dragOverList, setDragOverList] = useState(false);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  function handleDrop(atIndex: number | undefined, event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    setDragOverList(false);
    setDragOverIndex(null);
    const payload = readDropPayload(event);
    if (!payload) return;
    if (payload.loadKind === "sequence" && payload.collectionId && payload.loadKey) {
      onDropSequence(payload.collectionId, payload.loadKey, atIndex);
      return;
    }
    onDropAsset(payload, atIndex);
  }

  const local = status.local;
  const liveEntryIndex = isLive
    ? deck.playlist.findIndex((entry) => entry.entryId === local.item?.id)
    : -1;
  const effectiveIndex =
    liveEntryIndex !== -1 ? liveEntryIndex : Math.min(deck.currentIndex, Math.max(deck.playlist.length - 1, 0));
  const currentEntry: DeckPlaylistEntry | null = deck.playlist[effectiveIndex] ?? null;

  const engineOnAir = isLive && local.onAir && liveEntryIndex !== -1;
  const enginePlaying = engineOnAir && local.mode === "playing";
  const elapsedSeconds = engineOnAir ? local.elapsedSeconds : 0;
  const kindDefaultDuration = currentEntry ? ASSET_KIND_DEFAULT_DURATION[currentEntry.kind] : 0;
  const totalSeconds = engineOnAir
    ? local.broadcast.duration
    : (currentEntry?.durationSeconds ?? kindDefaultDuration) || null;
  const remainingSeconds = totalSeconds && totalSeconds > 0 ? Math.max(0, totalSeconds - elapsedSeconds) : null;

  const sideLabel = side === "left" ? "Left Deck" : "Right Deck";

  return (
    <section className={`bmx-deck bmx-deck--${side}`} aria-label={sideLabel}>
      <header className="bmx-deck__head">
        <h2 className="bmx-deck__title">{sideLabel}</h2>
        <div className="bmx-deck__badges">
          {engineOnAir ? (
            <span className="bmx-deck__badge bmx-deck__badge--live">
              <span className="bmx-deck__badge-dot" aria-hidden="true" />
              LIVE
            </span>
          ) : null}
          <span className={`bmx-deck__badge${enginePlaying ? " bmx-deck__badge--active" : ""}`}>
            {engineOnAir ? (enginePlaying ? "PLAYING" : "PAUSED") : deck.playlist.length > 0 ? "CUED" : "EMPTY"}
          </span>
        </div>
      </header>

      <div className="bmx-deck__preview">
        {currentEntry ? (
          <>
            <div className="bmx-deck__thumb" aria-hidden="true">
              {currentEntry.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- ops-tool thumbnail, not the public site
                <img src={currentEntry.coverUrl} alt="" />
              ) : (
                <span className="bmx-deck__thumb-fallback">{ASSET_KIND_LABELS[currentEntry.kind]}</span>
              )}
            </div>
            <div className="bmx-deck__info">
              <span className="bmx-deck__asset-id">{currentEntry.assetId}</span>
              <span className="bmx-deck__asset-title">{currentEntry.title}</span>
              <span className="bmx-deck__asset-meta">
                {ASSET_KIND_LABELS[currentEntry.kind]}
                {currentEntry.subtitle ? ` · ${currentEntry.subtitle}` : ""}
              </span>
              {totalSeconds && totalSeconds > 0 ? (
                <div className="bmx-deck__progress" role="progressbar" aria-valuemin={0} aria-valuemax={totalSeconds} aria-valuenow={elapsedSeconds}>
                  <div
                    className="bmx-deck__progress-fill"
                    style={{ width: `${Math.min(100, (elapsedSeconds / totalSeconds) * 100)}%` }}
                  />
                </div>
              ) : null}
              <span className="bmx-deck__clock">
                {formatClock(elapsedSeconds)}
                {remainingSeconds !== null ? ` / -${formatClock(remainingSeconds)}` : " / hold"}
              </span>
            </div>
          </>
        ) : (
          <p className="bmx-deck__empty">No asset cued — add one from the Asset Browser below.</p>
        )}
      </div>

      <div className="bmx-deck__transport">
        <button
          type="button"
          className="bmx-btn"
          onClick={onPrevious}
          disabled={busy || deck.playlist.length === 0}
        >
          ⏮ Previous
        </button>
        <button
          type="button"
          className="bmx-btn bmx-btn--primary"
          onClick={enginePlaying ? onPause : onPlay}
          disabled={busy || deck.playlist.length === 0}
        >
          {enginePlaying ? "⏸ Pause" : "▶ Play"}
        </button>
        <button type="button" className="bmx-btn" onClick={onNext} disabled={busy || deck.playlist.length === 0}>
          Next ⏭
        </button>
      </div>

      <div className="bmx-deck__output">
        <span className="bmx-deck__output-label">Output</span>
        <select
          className="bmx-select"
          value={deck.output ?? ""}
          onChange={(event) => onOutputChange((event.target.value || null) as MixerOutputId | null)}
          disabled={busy}
          aria-label={`${sideLabel} output`}
        >
          <option value="">Unassigned</option>
          {MIXER_OUTPUTS.map((output) => (
            <option key={output} value={output} disabled={output === "terminal"}>
              {MIXER_OUTPUT_LABELS[output]}
              {output === "terminal" ? " — coming soon" : ""}
            </option>
          ))}
        </select>
      </div>

      <div className="bmx-deck__options" role="group" aria-label={`${sideLabel} transport options`}>
        <label className="bmx-deck__toggle">
          <input
            type="checkbox"
            checked={deck.autoReturnToLive}
            onChange={(event) => onAutoReturnChange(event.target.checked)}
            disabled={busy}
          />
          Auto Return
        </label>
      </div>

      <ol
        className={`bmx-playlist${dragOverList && dragOverIndex === null ? " bmx-playlist--drag-over" : ""}`}
        aria-label={`${sideLabel} playlist — drop assets or sequences here`}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
          setDragOverList(true);
        }}
        onDragLeave={() => setDragOverList(false)}
        onDrop={(event) => handleDrop(undefined, event)}
      >
        {deck.playlist.length === 0 ? (
          <li className="bmx-playlist__empty">
            Playlist is empty — drag assets or sequences here, or add one from the Asset Browser below.
          </li>
        ) : (
          deck.playlist.map((entry, index) => (
            <li
              key={entry.entryId}
              className={`bmx-playlist__row${index === effectiveIndex ? " bmx-playlist__row--current" : ""}${dragOverIndex === index ? " bmx-playlist__row--drag-over" : ""}`}
              onDragOver={(event) => {
                event.preventDefault();
                event.stopPropagation();
                event.dataTransfer.dropEffect = "copy";
                setDragOverIndex(index);
              }}
              onDragLeave={() => setDragOverIndex(null)}
              onDrop={(event) => handleDrop(index, event)}
            >
              <button type="button" className="bmx-playlist__main" onClick={() => onCue(index)}>
                <span className="bmx-playlist__index">{index + 1}</span>
                <span className="bmx-playlist__text">
                  <span className="bmx-playlist__title">
                    {index === effectiveIndex && engineOnAir ? <span className="bmx-playlist__on">ON</span> : null}
                    {entry.title}
                  </span>
                  <span className="bmx-playlist__meta">
                    {entry.assetId} · {ASSET_KIND_LABELS[entry.kind]}
                    {deck.playbackMode === "manual" ? " · Manual" : deck.playbackMode === "loop" ? " · Loop" : " · Auto"}
                  </span>
                </span>
              </button>
              <span className="bmx-playlist__actions">
                <button
                  type="button"
                  className="bmx-icon-btn"
                  onClick={() => onReorder(entry.entryId, "up")}
                  disabled={busy || index === 0}
                  aria-label={`Move ${entry.title} up`}
                >
                  ▲
                </button>
                <button
                  type="button"
                  className="bmx-icon-btn"
                  onClick={() => onReorder(entry.entryId, "down")}
                  disabled={busy || index === deck.playlist.length - 1}
                  aria-label={`Move ${entry.title} down`}
                >
                  ▼
                </button>
                <button
                  type="button"
                  className="bmx-icon-btn bmx-icon-btn--danger"
                  onClick={() => onRemove(entry.entryId)}
                  disabled={busy}
                  aria-label={`Remove ${entry.title}`}
                >
                  ✕
                </button>
              </span>
            </li>
          ))
        )}
      </ol>
    </section>
  );
}
