"use client";

import { useEffect, useMemo, useState } from "react";

import type { CoverCandidateView } from "@/lib/retroverse-2/cover-correction";

type Props = {
  currentUrl: string | null;
  album: string;
  source: string;
  locked: boolean;
  saveCandidateAction: (formData: FormData) => void;
  uploadCoverAction: (formData: FormData) => void;
  candidatesUrl: string;
};

export function CoverDrawer({
  currentUrl,
  album,
  source,
  locked,
  saveCandidateAction,
  uploadCoverAction,
  candidatesUrl,
}: Props) {
  const [open, setOpen] = useState(false);
  const [candidates, setCandidates] = useState<CoverCandidateView[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchMore, setSearchMore] = useState(album);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useMemo(
    () => candidates.find((candidate) => candidate.id === selectedId) ?? null,
    [candidates, selectedId],
  );
  const previewUrl = selected?.coverUrl ?? currentUrl;

  useEffect(() => {
    if (!open) return;
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [open]);

  async function loadCandidates(query?: string) {
    const nextUrl = query?.trim()
      ? `${candidatesUrl}?q=${encodeURIComponent(query.trim())}`
      : candidatesUrl;
    setLoading(true);
    try {
      const response = await fetch(nextUrl, { cache: "no-store" });
      const data = (await response.json()) as { candidates?: CoverCandidateView[] };
      setCandidates(data.candidates ?? []);
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }

  async function openDrawer() {
    setOpen(true);
    if (loaded || loading) return;
    await loadCandidates();
  }

  return (
    <div className="rv2-data__cover-manager">
      <div className="rv2-data__cover-preview">
        {currentUrl ? <img src={currentUrl} alt="" /> : <div>No cover</div>}
      </div>
      <div className="rv2-data__cover-meta">
        <p><span>Album</span>{album}</p>
        <p><span>Source</span>{source}</p>
        <p><span>Locked</span>{locked ? "Yes" : "No"}</p>
      </div>
      <button type="button" className="rv2-data__correct-cover" onClick={openDrawer}>
        Fix Cover
      </button>

      {open ? (
        <div className="rv2-data__drawer" role="dialog" aria-modal="true" aria-label="Fix cover">
          <div className="rv2-data__drawer-panel">
            <div className="rv2-data__drawer-head">
              <div>
                <p className="rv2-live__eyebrow">Fix Cover</p>
                <h2>Choose Cover</h2>
              </div>
              <button type="button" onClick={() => setOpen(false)}>Close</button>
            </div>

            <div className="rv2-data__cover-manager rv2-data__cover-manager--drawer">
              <div className="rv2-data__cover-preview">
                {previewUrl ? <img src={previewUrl} alt="" /> : <div>No cover</div>}
              </div>
              <div className="rv2-data__cover-meta">
                <p><span>Album</span>{selected?.albumTitle ?? album}{selected?.albumYear ? ` · ${selected.albumYear}` : ""}</p>
                <p><span>Source</span>{selected?.source ?? source}</p>
                <p><span>Confidence</span>{selected?.confidence ?? "Select one"}</p>
              </div>
            </div>

            {loading ? <div className="rv2-data__cover-empty">Finding best covers...</div> : null}
            {!loading && loaded && candidates.length <= 1 ? (
              <div className="rv2-data__cover-empty">No additional covers found</div>
            ) : null}

            <div className="rv2-data__cover-candidates">
              {candidates.map((candidate) => (
                <button
                  type="button"
                  key={candidate.id}
                  className={candidate.id === selectedId ? "rv2-data__cover-candidate rv2-data__cover-candidate--selected" : "rv2-data__cover-candidate"}
                  onClick={() => setSelectedId(candidate.id)}
                >
                  <span className="rv2-data__cover-thumb">
                    {candidate.coverUrl ? <img src={candidate.coverUrl} alt="" /> : <span>No image</span>}
                  </span>
                  <span className="rv2-data__cover-info">
                    <strong>{candidate.albumTitle}</strong>
                    <small>{candidate.albumYear ? `${candidate.albumYear} · ` : ""}{candidate.source}</small>
                    <small>
                      {candidate.artTypeLabel ? `${candidate.artTypeLabel} · ` : ""}
                      {candidate.isCurrent ? "Current · " : ""}
                      {candidate.confidence != null ? `${candidate.confidence}% confidence` : "Confidence unknown"}
                    </small>
                  </span>
                </button>
              ))}
            </div>

            {selected ? null : (
              <div className="rv2-data__cover-fallbacks">
                <p>Need another option?</p>
                <div className="rv2-data__cover-tool">
                  <label>Search More Covers
                    <input
                      name="q"
                      type="search"
                      value={searchMore}
                      onChange={(event) => setSearchMore(event.currentTarget.value)}
                    />
                  </label>
                  <button type="button" onClick={() => loadCandidates(searchMore)}>
                    Search More Covers
                  </button>
                </div>
                <form action={uploadCoverAction} className="rv2-data__cover-tool">
                  <label>Upload Cover<input name="cover" type="file" accept="image/jpeg,image/png,image/webp" /></label>
                  <button type="submit">Upload + Save</button>
                </form>
              </div>
            )}

            <form action={saveCandidateAction} className="rv2-data__save-cover">
              <input type="hidden" name="linkId" value={selected?.linkId ?? ""} />
              <input type="hidden" name="coverUrl" value={selected?.coverUrl ?? ""} />
              <button type="button" className="rv2-data__cancel-cover" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button type="submit" disabled={!selected}>
                Save Cover
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
