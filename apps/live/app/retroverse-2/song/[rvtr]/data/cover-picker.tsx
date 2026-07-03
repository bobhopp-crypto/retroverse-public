"use client";

import { useMemo, useState } from "react";

export type CoverCandidateView = {
  linkId: number;
  url: string | null;
  albumTitle: string;
  albumYear: number | null;
  source: string;
  confidence: number | null;
  locked: boolean;
};

type Props = {
  candidates: CoverCandidateView[];
  currentUrl: string | null;
  selectCoverAction: (formData: FormData) => void;
  startOpen?: boolean;
};

export function CoverPicker({ candidates, currentUrl, selectCoverAction, startOpen = false }: Props) {
  const firstCandidateUrl = candidates.find((candidate) => candidate.url)?.url ?? null;
  const [previewUrl, setPreviewUrl] = useState(currentUrl ?? firstCandidateUrl);
  const [isChoosing, setIsChoosing] = useState(startOpen);
  const [selectedLinkId, setSelectedLinkId] = useState<number | null>(null);
  const selected = useMemo(
    () => candidates.find((candidate) => candidate.linkId === selectedLinkId) ?? candidates.find((candidate) => candidate.url === previewUrl) ?? candidates[0] ?? null,
    [candidates, previewUrl, selectedLinkId],
  );

  function choose(candidate: CoverCandidateView) {
    setSelectedLinkId(candidate.linkId);
    setPreviewUrl(candidate.url);
  }

  return (
    <div className="rv2-data__cover-manager">
      <div className="rv2-data__cover-preview">
        {previewUrl ? <img src={previewUrl} alt="" /> : <div>No cover</div>}
      </div>

      {selected ? (
        <div className="rv2-data__cover-meta">
          <p><span>Album</span>{selected.albumTitle}{selected.albumYear ? ` · ${selected.albumYear}` : ""}</p>
          <p><span>Source</span>{selected.source}</p>
          <p><span>Confidence</span>{selected.confidence ?? "Unknown"}</p>
          <p><span>Locked</span>{selected.locked ? "Yes" : "No"}</p>
        </div>
      ) : null}

      <button
        type="button"
        className="rv2-data__correct-cover"
        onClick={() => setIsChoosing((value) => !value)}
      >
        {isChoosing ? "Hide Candidates" : "Correct Cover"}
      </button>

      {candidates.length > 0 ? (
        <div className={isChoosing ? "rv2-data__cover-candidates" : "rv2-data__cover-candidates rv2-data__cover-candidates--hidden"}>
          {candidates.map((candidate) => (
            <button
              type="button"
              key={candidate.linkId}
              className={candidate.linkId === selectedLinkId ? "rv2-data__cover-candidate rv2-data__cover-candidate--selected" : "rv2-data__cover-candidate"}
              onClick={() => choose(candidate)}
            >
              <span className="rv2-data__cover-thumb">
                {candidate.url ? <img src={candidate.url} alt="" /> : <span>No image</span>}
              </span>
              <span className="rv2-data__cover-info">
                <strong>{candidate.albumTitle}</strong>
                <small>{candidate.albumYear ? `${candidate.albumYear} · ` : ""}{candidate.source}</small>
                <small>{candidate.confidence != null ? `${candidate.confidence}% confidence` : "Confidence unknown"}</small>
              </span>
            </button>
          ))}
          <form action={selectCoverAction} className="rv2-data__save-cover">
            <input type="hidden" name="linkId" value={selectedLinkId ?? ""} />
            <button type="submit" disabled={selectedLinkId == null}>
              Save Cover
            </button>
          </form>
        </div>
      ) : (
        <div className="rv2-data__cover-empty">
          No candidate covers found for this song.
        </div>
      )}
    </div>
  );
}
