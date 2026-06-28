"use client";

import { useState } from "react";

import type { ComposedScene } from "@/lib/retroverse/scene-composer/types";

type Props = {
  scenes: ComposedScene[];
  order: number[];
  onReorder: (next: number[]) => void;
  activeIndex: number;
  onSelectIndex: (index: number) => void;
};

export function StoryFlowBoard({ scenes, order, onReorder, activeIndex, onSelectIndex }: Props) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  function moveItem(from: number, to: number) {
    if (from === to || to < 0 || to >= order.length) return;
    const next = [...order];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item!);
    onReorder(next);
  }

  return (
    <div className="ds-workspace">
      <p className="ds-workspace__intro">
        Drag cards to experiment with story order. Local simulation only — no package writes.
      </p>
      <div className="ds-flow-board">
        {order.map((sceneIdx, boardIdx) => {
          const scene = scenes[sceneIdx];
          if (!scene) return null;
          return (
            <div key={`${scene.sceneNumber}-${boardIdx}`} className="ds-flow-item-wrap">
              {boardIdx > 0 ? <span className="ds-flow-arrow" aria-hidden>→</span> : null}
              <button
                type="button"
                draggable
                className={
                  activeIndex === boardIdx
                    ? "ds-flow-card ds-flow-card--active"
                    : "ds-flow-card"
                }
                onClick={() => onSelectIndex(boardIdx)}
                onDragStart={() => setDragIdx(boardIdx)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragIdx !== null) moveItem(dragIdx, boardIdx);
                  setDragIdx(null);
                }}
              >
                <span className="ds-flow-card__moment">{scene.momentLabel}</span>
                <span className="ds-flow-card__headline">{scene.headline}</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
