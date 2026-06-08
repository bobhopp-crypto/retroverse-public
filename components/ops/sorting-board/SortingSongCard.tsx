"use client";

import { SortingSongThumb } from "@/components/ops/sorting-board/SortingSongThumb";
import type { SortingSong } from "@/lib/ops/sorting-board/types";

export function SortingSongCard(props: {
  song: SortingSong;
  variant?: "unsorted" | "pile";
  draggable?: boolean;
  dropBefore?: boolean;
  onDragStart?: (e: React.DragEvent, workspaceKey: string) => void;
  onDragOverSong?: (e: React.DragEvent) => void;
  onDropOnSong?: (e: React.DragEvent) => void;
}) {
  const song = props.song;
  const workspaceKey = song.workspaceKey?.trim() || "unknown";
  const artist = song.artist?.trim() || "Unknown artist";
  const title = song.title?.trim() || "Unknown title";
  const playCount =
    typeof song.playCount === "number" && Number.isFinite(song.playCount) ? song.playCount : 0;
  const pile = props.variant === "pile";

  return (
    <div
      className={`ops-sort-board__song${pile ? " ops-sort-board__song--pile" : ""}${props.dropBefore ? " ops-sort-board__song--drop-before" : ""}`}
      draggable={props.draggable !== false}
      onDragStart={
        props.draggable !== false && props.onDragStart
          ? (e) => {
              e.stopPropagation();
              props.onDragStart!(e, workspaceKey);
            }
          : undefined
      }
      onDragOver={
        props.onDragOverSong
          ? (e) => {
              e.preventDefault();
              e.stopPropagation();
              props.onDragOverSong!(e);
            }
          : undefined
      }
      onDrop={
        props.onDropOnSong
          ? (e) => {
              e.preventDefault();
              e.stopPropagation();
              props.onDropOnSong!(e);
            }
          : undefined
      }
    >
      {!pile ? <SortingSongThumb previewPath={song.previewPath ?? null} /> : null}
      <div className="ops-sort-board__song-text">
        <span className="ops-sort-board__song-artist">{artist}</span>
        <span className="ops-sort-board__song-title">{title}</span>
        <span className="ops-sort-board__song-plays">Plays: {playCount}</span>
      </div>
    </div>
  );
}
