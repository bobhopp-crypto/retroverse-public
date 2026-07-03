"use client";

import type { Bp2StudioQueueDepartment } from "@/lib/ops/browser-plus-2/types";
import type { Bp2OvernightPresetId } from "@/lib/ops/browser-plus-2/studio-filters";
import { OVERNIGHT_PRESETS } from "@/lib/ops/browser-plus-2/studio-filters";

type Props = {
  selectedCount: number;
  filteredCount: number;
  busy: boolean;
  overnightEstimate?: { songCount: number; estimatedMinutes: number; label: string } | null;
  onAction: (department: Bp2StudioQueueDepartment, scope: "selection" | "filtered") => void;
  onOvernight: (preset: Bp2OvernightPresetId) => void;
  onClearSelection: () => void;
};

const BATCH_ACTIONS: Array<{ department: Bp2StudioQueueDepartment; label: string }> = [
  { department: "run-collector", label: "Run Collector" },
  { department: "run-editor", label: "Run Editor" },
  { department: "run-director", label: "Run Director" },
  { department: "refresh-research", label: "Refresh Research" },
  { department: "rebuild-experience", label: "Rebuild Experience Plan" },
];

export function StudioBatchBar({
  selectedCount,
  filteredCount,
  busy,
  overnightEstimate,
  onAction,
  onOvernight,
  onClearSelection,
}: Props) {
  return (
    <section className="bp2__studio-batch" aria-label="Batch actions">
      <div className="bp2__studio-batch-main">
        <strong>
          {selectedCount > 0
            ? `${selectedCount} selected`
            : `${filteredCount.toLocaleString()} in filter`}
        </strong>
        <div className="bp2__studio-batch-actions">
          {BATCH_ACTIONS.map((action) => (
            <button
              key={action.department}
              type="button"
              className="bp2__action bp2__action--ghost"
              disabled={busy || (selectedCount === 0 && filteredCount === 0)}
              onClick={() =>
                onAction(action.department, selectedCount > 0 ? "selection" : "filtered")
              }
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bp2__studio-batch-overnight">
        <span className="bp2__muted">Overnight:</span>
        <select
          className="bp2__studio-overnight-select"
          defaultValue=""
          disabled={busy}
          onChange={(e) => {
            const v = e.target.value as Bp2OvernightPresetId;
            if (v) {
              onOvernight(v);
              e.target.value = "";
            }
          }}
        >
          <option value="">Choose batch…</option>
          {OVERNIGHT_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        {overnightEstimate ? (
          <span className="bp2__studio-overnight-est">
            {overnightEstimate.label}: {overnightEstimate.songCount.toLocaleString()} songs · ~
            {overnightEstimate.estimatedMinutes >= 60
              ? `${Math.round(overnightEstimate.estimatedMinutes / 60)}h`
              : `${overnightEstimate.estimatedMinutes}m`}
          </span>
        ) : null}
        <button type="button" className="bp2__action" disabled={busy} onClick={() => onOvernight("top-100-played")}>
          Queue Top 100
        </button>
        {selectedCount > 0 ? (
          <button type="button" className="bp2__action bp2__action--ghost" onClick={onClearSelection}>
            Clear selection
          </button>
        ) : null}
      </div>
    </section>
  );
}
