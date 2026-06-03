"use client";

import type { SongClusterHint } from "@/lib/ops/show-builder/visual-clustering";
import type { VdjPoolSong } from "@/lib/ops/show-builder/types";

export function ShowSongChip(props: {
  song: VdjPoolSong;
  variant?: "pool" | "set";
  dropBefore?: boolean;
  cluster?: SongClusterHint | null;
  onDragStart?: (e: React.DragEvent, songKey: string) => void;
  onDragOverSong?: (e: React.DragEvent) => void;
  onDropOnSong?: (e: React.DragEvent) => void;
}) {
  const clustered = props.cluster != null;
  const style = clustered
    ? ({
        "--cluster-color": props.cluster!.color,
        "--cluster-bg": props.cluster!.bg,
      } as React.CSSProperties)
    : undefined;

  return (
    <div
      className={`ops-show__chip ops-show__chip--${props.variant ?? "pool"}${clustered ? " ops-show__chip--clustered" : ""}${props.dropBefore ? " ops-show__chip--drop-before" : ""}`}
      style={style}
      draggable
      title={clustered ? `${props.cluster!.label} (${props.cluster!.name})` : undefined}
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
      <span className="ops-show__chip-title">{props.song.title}</span>
      <span className="ops-show__chip-artist">{props.song.artist}</span>
      <span className="ops-show__chip-plays">Plays: {props.song.playCount}</span>
    </div>
  );
}
