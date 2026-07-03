"use client";

import { contrastTextOnBg } from "@/lib/ops/crate-builder/contrast";
import type { SetColorStyle } from "@/lib/ops/crate-builder/set-colors";

export function CrateSongCard(props: {
  artist: string;
  title: string;
  songKey: string;
  pileColor: SetColorStyle;
  draggable?: boolean;
  dropBefore?: boolean;
  onDragStart?: (e: React.DragEvent, songKey: string) => void;
  onDragOverSong?: (e: React.DragEvent) => void;
  onDropOnSong?: (e: React.DragEvent) => void;
}) {
  const bg = props.pileColor.bg;
  const ink = contrastTextOnBg(bg);

  return (
    <div
      className={`ops-crate__card ops-crate__card--dealt${props.dropBefore ? " ops-crate__card--drop-before" : ""}`}
      style={{
        backgroundColor: bg,
        color: ink,
        borderColor: props.pileColor.border,
      }}
      draggable={props.draggable !== false}
      onDragStart={
        props.draggable !== false && props.onDragStart
          ? (e) => {
              e.stopPropagation();
              props.onDragStart!(e, props.songKey);
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
      <span className="ops-crate__card-artist">{props.artist}</span>
      <span className="ops-crate__card-title">{props.title}</span>
    </div>
  );
}
