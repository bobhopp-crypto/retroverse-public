"use client";

import { useMemo, useState } from "react";

import { AtlasCoverArt } from "@/components/atlas/AtlasVisuals";
import {
  tierActionLabel,
  tierCanPrimaryApprove,
} from "@/lib/atlas/mission-confidence";
import type { MissionAlbumCandidate, MissionWorkspace } from "@/lib/atlas/mission-types";

import { MissionResearchEvidence } from "./MissionResearchEvidence";

type Props = {
  rvtr: string;
  candidates: MissionAlbumCandidate[];
  researchHeadline: string | null;
  writesEnabled: boolean;
  onSaved: (workspace: MissionWorkspace, coverUrl?: string | null) => void;
};

export function MissionAlbumSlot({
  rvtr,
  candidates,
  researchHeadline,
  writesEnabled,
  onSaved,
}: Props) {
  const recommendedId = useMemo(
    () => candidates.find((c) => c.recommended)?.albumId ?? candidates[0]?.albumId ?? null,
    [candidates],
  );
  const [selectedId, setSelectedId] = useState<number | null>(recommendedId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const selected = candidates.find((c) => c.albumId === selectedId) ?? null;
  const selectedTier = selected?.confidenceTier ?? "low";
  const isCoAlbum = selected?.attachMode === "co_album_membership";

  const approveLabel = (() => {
    if (busy) return "Approving…";
    if (isCoAlbum) return "Attach to this album";
    return tierActionLabel(selectedTier, Boolean(selected));
  })();

  const approve = async () => {
    if (!selected || busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/ops/atlas/mission/${rvtr}/album-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          albumId: selected.albumId,
          position: selected.position,
          sequenceTitle: selected.sequenceTitle ?? selected.albumTitle,
          confidence: selected.confidence,
          reasons: selected.reasons,
          sourceKind: selected.sourceKind,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        workspace?: MissionWorkspace;
        coverUrl?: string | null;
        message?: string;
        error?: string;
      };
      if (!res.ok || !data.ok || !data.workspace) {
        setError(data.message ?? data.error ?? "Approve failed");
        return;
      }
      setNotice(isCoAlbum ? "Attached to album" : "Album approved");
      onSaved(data.workspace, data.coverUrl);
    } catch {
      setError("Approve failed");
    } finally {
      setBusy(false);
    }
  };

  if (candidates.length === 0) {
    return <p className="atlas-mcard-slot__empty">Retroverse found no album evidence yet.</p>;
  }

  return (
    <div className="atlas-album-slot">
      {researchHeadline ? (
        <p className="atlas-research-brief">{researchHeadline}</p>
      ) : null}
      <ul className="atlas-album-slot__candidates">
        {candidates.map((candidate) => {
          const active = candidate.albumId === selectedId;
          return (
            <li key={candidate.albumId}>
              <button
                type="button"
                className={`atlas-album-slot__pick${active ? " atlas-album-slot__pick--on" : ""}${
                  candidate.recommended ? " atlas-album-slot__pick--recommended" : ""
                }`}
                onClick={() => setSelectedId(candidate.albumId)}
              >
                {candidate.recommended ? (
                  <span className="atlas-research-badge">Strong match</span>
                ) : null}
                <AtlasCoverArt
                  src={candidate.coverUrl}
                  alt={candidate.albumTitle}
                  className="atlas-album-slot__art"
                />
                <span className="atlas-album-slot__title">{candidate.albumTitle}</span>
                <span className="atlas-album-slot__meta">
                  {candidate.releaseYear ?? "—"} · {candidate.confidencePct}% ·{" "}
                  {candidate.evidence.length} signal{candidate.evidence.length === 1 ? "" : "s"}
                </span>
                <span className="atlas-album-slot__note">{candidate.researchNote}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {selected && selected.albumSiblings.length > 0 ? (
        <div className="atlas-album-slot__siblings">
          <p className="atlas-album-slot__siblings-head">Tracks on this album</p>
          <ul className="atlas-album-slot__siblings-list">
            {selected.albumSiblings.map((sibling) => (
              <li key={`${sibling.rvtr}-${sibling.position}`}>
                <span className="atlas-album-slot__sibling-rvtr">{sibling.rvtr}</span>
                <span className="atlas-album-slot__sibling-title">
                  #{sibling.position} {sibling.title}
                </span>
                {sibling.isCurrent ? (
                  <span className="atlas-album-slot__sibling-you">this mission</span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {selected ? (
        <MissionResearchEvidence
          signals={selected.evidence}
          tier={selected.confidenceTier}
          confidencePct={selected.confidencePct}
        />
      ) : null}

      <div className="atlas-album-slot__foot">
        {tierCanPrimaryApprove(selectedTier) || isCoAlbum ? (
          <button
            type="button"
            className="atlas-mcard-btn atlas-mcard-btn--primary"
            disabled={!selected || busy || !writesEnabled}
            onClick={approve}
          >
            {approveLabel}
          </button>
        ) : (
          <>
            <p className="atlas-mcard-slot__hint">Research needed — review evidence before approving.</p>
            <button
              type="button"
              className="atlas-mcard-btn"
              disabled={!selected || busy || !writesEnabled}
              onClick={approve}
            >
              {busy ? "Approving…" : "Approve selection"}
            </button>
          </>
        )}
        {!writesEnabled ? (
          <p className="atlas-mcard-slot__hint">Set RETROVERSE_HEALING_APPLY=1 to enable writes.</p>
        ) : null}
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
