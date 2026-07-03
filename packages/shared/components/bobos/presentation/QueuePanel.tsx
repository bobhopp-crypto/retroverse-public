"use client";

import { useState } from "react";

import {
  PRESENTATION_ITEM_TYPES,
  PRESENTATION_ITEM_TYPE_LABELS,
  type PresentationItem,
  type PresentationItemType,
} from "@/lib/bobos/presentation/types";

type Props = {
  items: PresentationItem[];
  selectedId: string | null;
  /** Item the Playhead is currently on — highlighted with the ON marker. */
  currentItemId: string | null;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onReorder: (from: number, to: number) => void;
  onAdd: (type: PresentationItemType) => void;
  onJump: (id: string) => void;
};

function durationLabel(seconds: number): string {
  if (seconds <= 0) return "Hold";
  return `${seconds}s`;
}

export function QueuePanel({
  items,
  selectedId,
  currentItemId,
  onSelect,
  onToggle,
  onDuplicate,
  onDelete,
  onReorder,
  onAdd,
  onJump,
}: Props) {
  const [addType, setAddType] = useState<PresentationItemType>("slide");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  return (
    <section className="pst-queue" aria-label="Presentation queue">
      <h2 className="pst-panel-title">Queue</h2>

      <ol className="pst-queue__list">
        {items.length === 0 ? (
          <li className="pst-queue__empty">No items yet — add the first one below.</li>
        ) : null}
        {items.map((item, index) => {
          const classes = [
            "pst-queue__row",
            item.id === selectedId ? "pst-queue__row--selected" : "",
            item.id === currentItemId ? "pst-queue__row--current" : "",
            !item.enabled ? "pst-queue__row--disabled" : "",
            dropIndex === index && dragIndex !== null && dragIndex !== index
              ? "pst-queue__row--drop"
              : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <li
              key={item.id}
              className={classes}
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragEnd={() => {
                setDragIndex(null);
                setDropIndex(null);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setDropIndex(index);
              }}
              onDrop={(event) => {
                event.preventDefault();
                if (dragIndex !== null) onReorder(dragIndex, index);
                setDragIndex(null);
                setDropIndex(null);
              }}
            >
              <button
                type="button"
                className="pst-queue__main"
                onClick={() => onSelect(item.id)}
                title="Edit properties"
              >
                <span className="pst-queue__grip" aria-hidden>
                  ⠿
                </span>
                <span className="pst-queue__index">{index + 1}</span>
                <span className="pst-queue__text">
                  <span className="pst-queue__title">
                    {item.id === currentItemId ? <span className="pst-queue__on">ON</span> : null}
                    {item.title || "Untitled"}
                  </span>
                  <span className="pst-queue__meta">
                    {PRESENTATION_ITEM_TYPE_LABELS[item.type]} · {durationLabel(item.durationSeconds)}
                  </span>
                </span>
              </button>
              <span className="pst-queue__actions">
                <button
                  type="button"
                  className="pst-icon-button"
                  onClick={() => onJump(item.id)}
                  title="Jump playhead to this item"
                  aria-label={`Jump to ${item.title}`}
                >
                  ▶
                </button>
                <button
                  type="button"
                  className={`pst-icon-button${item.enabled ? " pst-icon-button--active" : ""}`}
                  onClick={() => onToggle(item.id)}
                  title={item.enabled ? "Disable item" : "Enable item"}
                  aria-label={`${item.enabled ? "Disable" : "Enable"} ${item.title}`}
                >
                  {item.enabled ? "◉" : "○"}
                </button>
                <button
                  type="button"
                  className="pst-icon-button"
                  onClick={() => onDuplicate(item.id)}
                  title="Duplicate item"
                  aria-label={`Duplicate ${item.title}`}
                >
                  ⧉
                </button>
                <button
                  type="button"
                  className="pst-icon-button pst-icon-button--danger"
                  onClick={() => onDelete(item.id)}
                  title="Delete item"
                  aria-label={`Delete ${item.title}`}
                >
                  ✕
                </button>
              </span>
            </li>
          );
        })}
      </ol>

      <div className="pst-queue__add">
        <select
          className="pst-field__input"
          value={addType}
          onChange={(event) => setAddType(event.target.value as PresentationItemType)}
          aria-label="Item type"
        >
          {PRESENTATION_ITEM_TYPES.map((type) => (
            <option key={type} value={type}>
              {PRESENTATION_ITEM_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
        <button type="button" className="pst-button" onClick={() => onAdd(addType)}>
          + Add Item
        </button>
      </div>
    </section>
  );
}
