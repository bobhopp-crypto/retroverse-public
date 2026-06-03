"use client";

import type { VdjPoolSong } from "@/lib/ops/show-builder/types";

export function ShowSongChip(props: {
  song: VdjPoolSong;
  compact?: boolean;
  dropBefore?: boolean;
  onDragStart?: (e: React.DragEvent, songKey: string) => void;
  onDragOverSong?: (e: React.DragEvent) => void;
  onDropOnSong?: (e: React.DragEvent) => void;
}) {
  return (
    <div
      className={`ops-show__chip${props.compact ? " ops-show__chip--compact" : ""}${props.dropBefore ? " ops-show__chip--drop-before" : ""}`}
      draggable
      onDragStart={
        props.onDragStart
          ? (e) => {
              e.stopPropagation();
              props.onDragStart!(e, props.song.key);
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
      <span className="ops-show__chip-artist">{props.song.artist}</span>
      <span className="ops-show__chip-title">{props.song.title}</span>
    </div>
  );
}
