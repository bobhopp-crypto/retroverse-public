"use client";

import { useCallback, useState } from "react";

import type { ProductionItem } from "@/lib/ops/year-workspace/production-types";

export function YearWorkspaceDropZone(props: {
  categoryLabel: string;
  disabled?: boolean;
  queueItems?: ProductionItem[];
  attachQueueItemId?: string | null;
  onAttachQueueItemChange?: (id: string | null) => void;
  onDropFilenames: (filenames: string[], queueItemId?: string | null) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const attachId = props.attachQueueItemId ?? null;

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      const names = Array.from(files).map((f) => f.name).filter(Boolean);
      if (names.length > 0) props.onDropFilenames(names, attachId);
    },
    [attachId, props],
  );

  const queueChoices =
    props.queueItems?.filter((i) => i.kind === "queue_entry" && !i.skipped) ?? [];

  return (
    <div
      className={`ops-yw-dropzone${dragOver ? " ops-yw-dropzone--over" : ""}${
        props.disabled ? " ops-yw-dropzone--disabled" : ""
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        if (!props.disabled) setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (props.disabled) return;
        if (e.dataTransfer.files.length > 0) {
          handleFiles(e.dataTransfer.files);
        }
      }}
    >
      <p className="ops-yw-dropzone__title">Asset drop zone</p>
      <p className="ops-dim ops-yw-dropzone__hint">
        Drop files for <strong>{props.categoryLabel}</strong>. Metadata only — no file move
        yet. Attach to an acquisition queue item or leave unassigned for Wanted.
      </p>
      {queueChoices.length > 0 && props.onAttachQueueItemChange ? (
        <label className="ops-yw-dropzone__attach-select">
          <span className="ops-yw-dropzone__attach-label">Attach to queue item</span>
          <select
            className="ops-yw-dropzone__select"
            value={attachId ?? ""}
            onChange={(e) =>
              props.onAttachQueueItemChange?.(e.target.value ? e.target.value : null)
            }
          >
            <option value="">— Wanted (unassigned) —</option>
            {queueChoices.map((q) => (
              <option key={q.id} value={q.id}>
                {q.title}
                {q.attachedFilename ? " ✓" : ""}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <label className="ops-yw-dropzone__browse">
        <input
          type="file"
          multiple
          disabled={props.disabled}
          className="ops-yw-dropzone__input"
          onChange={(e) => {
            if (e.target.files?.length) handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
        Browse files
      </label>
    </div>
  );
}
