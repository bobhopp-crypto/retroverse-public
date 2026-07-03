"use client";

import { useMemo, useState } from "react";

import {
  tierActionLabel,
  tierCanPrimaryApprove,
} from "@/lib/atlas/mission-confidence";
import type { MissionMediaCandidate, MissionWorkspace } from "@/lib/atlas/mission-types";
import type { AppearanceKind } from "@/lib/atlas/mission-appearances-store";

import { MissionResearchEvidence } from "./MissionResearchEvidence";

type Props = {
  rvtr: string;
  kind: AppearanceKind;
  candidates: MissionMediaCandidate[];
  researchHeadline: string | null;
  onSaved: (workspace: MissionWorkspace, coverUrl?: string | null) => void;
};

export function MissionMediaSlot({
  rvtr,
  kind,
  candidates,
  researchHeadline,
  onSaved,
}: Props) {
  const recommendedId = useMemo(
    () => candidates.find((c) => c.recommended)?.id ?? candidates[0]?.id ?? null,
    [candidates],
  );
  const [selectedId, setSelectedId] = useState<string | null>(recommendedId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const selected = candidates.find((c) => c.id === selectedId) ?? null;
  const kindLabel = kind === "tv" ? "TV" : "Movie";
  const selectedTier = selected?.confidenceTier ?? "low";

  const postAppearance = async (action: "confirm" | "reject", candidate: MissionMediaCandidate | null) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/ops/atlas/mission/${rvtr}/appearance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          action,
          candidateId: candidate?.id ?? "none",
          label: candidate?.label ?? `No ${kindLabel} appearance`,
          detail: candidate?.detail ?? null,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        workspace?: MissionWorkspace;
        coverUrl?: string | null;
        error?: string;
      };
      if (!res.ok || !data.ok || !data.workspace) {
        setError(data.error ?? "Update failed");
        return;
      }
      setNotice(action === "confirm" ? `${kindLabel} match confirmed` : "Marked as none");
      onSaved(data.workspace, data.coverUrl);
    } catch {
      setError("Update failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="atlas-media-slot">
      {researchHeadline ? (
        <p className="atlas-research-brief">{researchHeadline}</p>
      ) : null}

      {candidates.length > 0 ? (
        <ul className="atlas-media-slot__list">
          {candidates.map((candidate) => {
            const active = candidate.id === selectedId;
            return (
              <li key={candidate.id}>
                <button
                  type="button"
                  className={`atlas-media-slot__pick${active ? " atlas-media-slot__pick--on" : ""}${
                    candidate.recommended ? " atlas-media-slot__pick--recommended" : ""
                  }`}
                  onClick={() => setSelectedId(candidate.id)}
                >
                  {candidate.recommended ? (
                    <span className="atlas-research-badge">Strong match</span>
                  ) : null}
                  <span className="atlas-media-slot__label">{candidate.label}</span>
                  <span className="atlas-media-slot__detail">{candidate.detail}</span>
                  <span className="atlas-media-slot__meta">
                    {candidate.confidencePct}% · {candidate.evidence.length} signal
                    {candidate.evidence.length === 1 ? "" : "s"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="atlas-mcard-slot__empty">No {kindLabel.toLowerCase()} evidence in your library.</p>
      )}

      {selected ? (
        <MissionResearchEvidence
          signals={selected.evidence}
          tier={selected.confidenceTier}
          confidencePct={selected.confidencePct}
        />
      ) : null}

      <div className="atlas-media-slot__foot">
        {selected && tierCanPrimaryApprove(selectedTier) ? (
          <button
            type="button"
            className="atlas-mcard-btn atlas-mcard-btn--primary"
            disabled={busy}
            onClick={() => postAppearance("confirm", selected)}
          >
            {busy ? "Saving…" : tierActionLabel(selectedTier, true).replace("Approve", "Confirm")}
          </button>
        ) : selected ? (
          <>
            <p className="atlas-mcard-slot__hint">Review evidence — confidence below approve threshold.</p>
            <button
              type="button"
              className="atlas-mcard-btn"
              disabled={busy}
              onClick={() => postAppearance("confirm", selected)}
            >
              {busy ? "Saving…" : `Confirm ${kindLabel} selection`}
            </button>
          </>
        ) : null}
        <button
          type="button"
          className="atlas-mcard-btn"
          disabled={busy}
          onClick={() => postAppearance("reject", null)}
        >
          No {kindLabel.toLowerCase()} appearance
        </button>
        {error ? (
          <p className="atlas-mcard-slot__error" role="alert">
            {error}
          </p>
        ) : null}
        {notice ? <p className="atlas-mcard-slot__notice">{notice}</p> : null}
      </div>
    </div>
  );
}
