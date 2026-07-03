"use client";

import { useMemo, useState } from "react";

import { AtlasRvTagsPanels } from "@/components/atlas/mission/AtlasRvTagsPanels";
import {
  tierActionLabel,
  tierCanPrimaryApprove,
} from "@/lib/atlas/mission-confidence";
import type { MissionCommentaryState, MissionWorkspace } from "@/lib/atlas/mission-types";
import type { RvTagId } from "@/lib/ops/rvtags-review/vocabulary";
import type { ReviewClassification } from "@/lib/ops/year-workspace/review-types";

import { MissionResearchEvidence } from "./MissionResearchEvidence";

type Props = {
  rvtr: string;
  commentary: MissionCommentaryState;
  onSaved: (workspace: MissionWorkspace, coverUrl?: string | null) => void;
};

function initialTags(commentary: MissionCommentaryState): RvTagId[] {
  if (commentary.tags.length > 0) return commentary.tags;
  return commentary.suggestedTags;
}

function initialClassification(commentary: MissionCommentaryState): ReviewClassification {
  if (commentary.classificationLocked) return commentary.classification;
  if (commentary.tags.length > 0) return commentary.classification;
  return commentary.suggestedClassification;
}

export function MissionCommentarySlot({ rvtr, commentary, onSaved }: Props) {
  const draftTags = useMemo(() => initialTags(commentary), [commentary]);
  const draftClass = useMemo(() => initialClassification(commentary), [commentary]);

  const [tags, setTags] = useState<RvTagId[]>(draftTags);
  const [classification, setClassification] = useState<ReviewClassification>(draftClass);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const tier = commentary.confidenceTier;
  const confidencePct =
    tier === "high" ? 88 : tier === "medium" ? 72 : commentary.evidence.length >= 1 ? 55 : 45;

  const approve = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/ops/atlas/mission/${rvtr}/commentary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags, classification }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        workspace?: MissionWorkspace;
        coverUrl?: string | null;
        error?: string;
      };
      if (!res.ok || !data.ok || !data.workspace) {
        setError(data.error ?? "Approve failed");
        return;
      }
      setNotice("Placard approved");
      setTags(data.workspace.commentary.tags);
      setClassification(data.workspace.commentary.classification);
      onSaved(data.workspace, data.coverUrl);
    } catch {
      setError("Approve failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="atlas-commentary-slot">
      <p className="atlas-research-brief">{commentary.researchSummary}</p>

      <MissionResearchEvidence
        signals={commentary.evidence}
        tier={tier}
        confidencePct={confidencePct}
      />

      <AtlasRvTagsPanels
        tags={tags}
        classification={classification}
        suggestedTags={commentary.suggestedTags}
        onTagsChange={setTags}
        onClassificationChange={setClassification}
      />

      <div className="atlas-commentary-slot__foot">
        {tierCanPrimaryApprove(tier) ? (
          <button
            type="button"
            className="atlas-mcard-btn atlas-mcard-btn--primary"
            disabled={busy}
            onClick={approve}
          >
            {busy ? "Approving…" : tierActionLabel(tier, true)}
          </button>
        ) : (
          <>
            <p className="atlas-mcard-slot__hint">Research needed — edit tags if signals are weak.</p>
            <button
              type="button"
              className="atlas-mcard-btn"
              disabled={busy}
              onClick={approve}
            >
              {busy ? "Approving…" : "Approve selection"}
            </button>
          </>
        )}
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
