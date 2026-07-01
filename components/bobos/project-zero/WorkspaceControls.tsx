"use client";

import { useState } from "react";

import { WORKSPACE_STATUS_LABELS } from "@/lib/bobos/project-zero/types";
import type { WorkspaceStatus } from "@/lib/bobos/project-zero/types";

const STATUS_CYCLE: WorkspaceStatus[] = ["NOT_STARTED", "NEEDS_ATTENTION", "DONE"];

type Props = {
  projectId: string;
  workspaceId: string;
  status: WorkspaceStatus;
  notes: string;
};

function statusClass(status: WorkspaceStatus): string {
  return `pz-card__status pz-card__status--${status.toLowerCase().replace(/_/g, "-")}`;
}

export function WorkspaceControls({ projectId, workspaceId, status: initialStatus, notes: initialNotes }: Props) {
  const [status, setStatus] = useState(initialStatus);
  const [notes, setNotes] = useState(initialNotes);
  const [saving, setSaving] = useState(false);

  async function patch(body: { status?: WorkspaceStatus; notes?: string }) {
    await fetch(`/api/bobos/project-zero/projects/${projectId}/workspaces/${workspaceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  function cycleStatus() {
    const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(status) + 1) % STATUS_CYCLE.length]!;
    setStatus(next);
    void patch({ status: next });
  }

  async function saveNotes() {
    setSaving(true);
    await patch({ notes });
    setSaving(false);
  }

  return (
    <section className="pz-workspace__status" aria-label="Workspace status">
      <h2 className="pz-project__section-title">Workspace Status</h2>
      <button
        type="button"
        className={`${statusClass(status)} pz-workspace__status-btn`}
        onClick={cycleStatus}
        title="Click to cycle status"
      >
        {WORKSPACE_STATUS_LABELS[status]}
      </button>

      <h2 className="pz-project__section-title">Notes</h2>
      <textarea
        className="pz-workspace__notes"
        rows={4}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={() => void saveNotes()}
        placeholder="Notes for this workspace…"
      />
      {saving ? <p className="pz-workspace__saving">Saving…</p> : null}
    </section>
  );
}
