"use client";

import { SortingSongThumb } from "@/components/ops/sorting-board/SortingSongThumb";
import type { SortingSong } from "@/lib/ops/sorting-board/types";

export function SortingSongCard(props: {
  song: SortingSong;
  draggable?: boolean;
  compact?: boolean;
  onDragStart?: (e: React.DragEvent, workspaceKey: string) => void;
}) {
  const song = props.song;
  const workspaceKey = song.workspaceKey?.trim() || "unknown";
  const artist = song.artist?.trim() || "Unknown artist";
  const title = song.title?.trim() || "Unknown title";
  const playCount =
    typeof song.playCount === "number" && Number.isFinite(song.playCount) ? song.playCount : 0;

  return (
    <div
      className={`ops-sort-board__song${props.compact ? " ops-sort-board__song--compact" : ""}`}
      draggable={props.draggable !== false}
      onDragStart={
        props.draggable !== false && props.onDragStart
          ? (e) => props.onDragStart!(e, workspaceKey)
          : undefined
      }
    >
      <SortingSongThumb previewPath={song.previewPath ?? null} />
      <div className="ops-sort-board__song-text">
        <span className="ops-sort-board__song-artist">{artist}</span>
        <span className="ops-sort-board__song-title">{title}</span>
        <span className="ops-sort-board__song-plays">Plays: {playCount}</span>
      </div>
    </div>
  );
}
