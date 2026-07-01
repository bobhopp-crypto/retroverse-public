"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import type {
  CandidateFact,
  CandidateStory,
  ReviewStatus,
  SongPackage,
  StoryCard,
} from "@/lib/ops/intelligence/song-package-types";
import { resolveHeroFromSongPackage } from "@/lib/visual-profile/hero-resolver";

type Props = {
  rvtr: string;
};

type Tab = "facts" | "stories" | "cards";

function statusLabel(status: ReviewStatus): string {
  if (status === "approved") return "Approved";
  if (status === "rejected") return "Rejected";
  return "Pending";
}

function highlightAnchor(excerpt: string, anchor: string): React.ReactNode {
  if (!anchor || !excerpt.includes(anchor)) {
    return excerpt.slice(0, 600) + (excerpt.length > 600 ? "…" : "");
  }
  const idx = excerpt.indexOf(anchor);
  const before = excerpt.slice(Math.max(0, idx - 120), idx);
  const after = excerpt.slice(idx + anchor.length, idx + anchor.length + 120);
  return (
    <>
      {before.length > 0 && (before.startsWith("…") ? before : `…${before}`)}
      <mark className="intel-excerpt__mark">{anchor}</mark>
      {after}
      {excerpt.length > idx + anchor.length + 120 ? "…" : ""}
    </>
  );
}

export function IntelligenceReviewClient({ rvtr }: Props) {
  const [pkg, setPkg] = useState<SongPackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("facts");
  const [selectedFactId, setSelectedFactId] = useState<string | null>(null);
  const [cardIndex, setCardIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadPackage() {
      setLoading(true);
      setLoadError(null);
      try {
        const res = await fetch(`/api/ops/intelligence/${rvtr}`);
        const data = (await res.json()) as {
          ok: boolean;
          error?: string;
          package?: SongPackage;
        };
        if (cancelled) return;
        if (!res.ok || !data.package) {
          setLoadError(data.error ?? `HTTP ${res.status}`);
          setPkg(null);
          return;
        }
        setPkg(data.package);
        setSelectedFactId(data.package.candidateFacts[0]?.id ?? null);
        setCardIndex(0);
        if (data.package.storyCards.length > 0) setTab("cards");
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : "Failed to load song package.");
          setPkg(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadPackage();
    return () => {
      cancelled = true;
    };
  }, [rvtr]);

  const factsById = useMemo(() => {
    const map = new Map<string, CandidateFact>();
    for (const f of pkg?.candidateFacts ?? []) map.set(f.id, f);
    return map;
  }, [pkg?.candidateFacts]);

  const selectedFact = selectedFactId ? factsById.get(selectedFactId) : null;

  if (loading) {
    return <p className="intel-review__flash">Loading song…</p>;
  }

  if (loadError || !pkg) {
    return (
      <div className="intel-review__empty">
        <p>Could not load this song ({loadError ?? "package not found"}).</p>
        <button
          type="button"
          className="intel-review__btn intel-review__btn--solid"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  const meta = pkg.metadata;
  const heroUrl = resolveHeroFromSongPackage(pkg).url;
  const cards = pkg.storyCards;
  const activeCard = cards[cardIndex] ?? null;
  const song = pkg;

  async function apiPatch(body: Record<string, unknown>) {
    const res = await fetch(`/api/ops/intelligence/${song.rvtr}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as { ok: boolean; error?: string; package?: SongPackage };
    if (data.package) setPkg(data.package);
    return data;
  }

  async function runProcess() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/ops/intelligence/${song.rvtr}`, { method: "POST" });
      const data = (await res.json()) as { ok: boolean; error?: string; package?: SongPackage };
      if (data.package) {
        setPkg(data.package);
        setTab("facts");
        setSelectedFactId(data.package.candidateFacts[0]?.id ?? null);
      }
      setMessage(data.ok ? "Pipeline complete." : data.error ?? "Failed.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed.");
    } finally {
      setBusy(false);
    }
  }

  async function saveReview() {
    setBusy(true);
    setMessage(null);
    try {
      const data = await apiPatch({
        candidateFacts: song.candidateFacts,
        candidateStories: song.candidateStories,
      });
      setMessage(data.ok ? "Review saved." : data.error ?? "Failed.");
    } finally {
      setBusy(false);
    }
  }

  async function buildCards() {
    setBusy(true);
    setMessage(null);
    try {
      await saveReview();
      const data = await apiPatch({ action: "build_cards" });
      if (data.ok) {
        setTab("cards");
        setCardIndex(0);
      }
      setMessage(data.ok ? "Experience content built." : data.error ?? "Failed.");
    } finally {
      setBusy(false);
    }
  }

  async function approvePackage() {
    setBusy(true);
    setMessage(null);
    try {
      const data = await apiPatch({ action: "approve" });
      setMessage(data.ok ? "Research approved." : data.error ?? "Failed.");
    } finally {
      setBusy(false);
    }
  }

  function setFactStatus(factId: string, reviewStatus: ReviewStatus) {
    setPkg((p) => {
      if (!p) return p;
      const candidateFacts = p.candidateFacts.map((f) =>
        f.id === factId && !f.locked ? { ...f, reviewStatus } : f,
      );
      const candidateStories = p.candidateStories.map((s) => {
        if (s.primaryFactId !== factId) return s;
        if (reviewStatus === "rejected") return { ...s, reviewStatus: "rejected" as const };
        return s;
      });
      return { ...p, candidateFacts, candidateStories };
    });
  }

  function setStoryStatus(storyId: string, reviewStatus: ReviewStatus) {
    setPkg((p) => {
      if (!p) return p;
      return {
        ...p,
        candidateStories: p.candidateStories.map((s) =>
          s.id === storyId ? { ...s, reviewStatus } : s,
        ),
      };
    });
  }

  function updateCard(index: number, field: keyof Pick<StoryCard, "headline" | "fact">, value: string) {
    setPkg((p) => {
      if (!p) return p;
      const storyCards = [...p.storyCards];
      if (storyCards[index]?.locked) return p;
      storyCards[index] = { ...storyCards[index]!, [field]: value };
      return { ...p, storyCards };
    });
  }

  async function saveCards() {
    setBusy(true);
    setMessage(null);
    try {
      const data = await apiPatch({ storyCards: song.storyCards });
      setMessage(data.ok ? "Story saved." : data.error ?? "Failed.");
    } finally {
      setBusy(false);
    }
  }

  const approvedFactCount = pkg.candidateFacts.filter((f) => f.reviewStatus === "approved").length;
  const approvedStoryCount = pkg.candidateStories.filter((s) => s.reviewStatus === "approved").length;

  return (
    <div className="intel-review">
      <header className="intel-review__header">
        {heroUrl ? (
          <Image
            src={heroUrl}
            alt=""
            width={56}
            height={56}
            className="intel-review__thumb"
            unoptimized
          />
        ) : null}
        <div>
          <h1 className="intel-review__title">{meta.title}</h1>
          <p className="intel-review__artist">{meta.artist}</p>
          <p className="intel-review__meta">
            {pkg.candidateFacts.length} facts · {pkg.candidateStories.length} stories ·{" "}
            {pkg.storyCards.length} cards · {pkg.status}
          </p>
        </div>
      </header>

      {message ? (
        <p className="intel-review__flash" role="status">
          {message}
        </p>
      ) : null}

      <nav className="intel-tabs" aria-label="Review sections">
        {(["facts", "stories", "cards"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            className={`intel-tabs__btn${tab === t ? " intel-tabs__btn--active" : ""}`}
            onClick={() => setTab(t)}
          >
            {t === "facts" ? "Facts" : t === "stories" ? "Stories" : "Story"}
          </button>
        ))}
      </nav>

      {tab === "facts" ? (
        <div className="intel-panels">
          <section className="intel-panel" aria-label="Candidate facts">
            <h2 className="intel-panel__title">Candidate Facts ({approvedFactCount} approved)</h2>
            <ul className="intel-fact-list">
              {pkg.candidateFacts.map((f) => (
                <li key={f.id}>
                  <button
                    type="button"
                    className={`intel-fact-item${selectedFactId === f.id ? " intel-fact-item--active" : ""}`}
                    onClick={() => setSelectedFactId(f.id)}
                  >
                    <span className="intel-fact-item__cat">{f.category}</span>
                    <span className="intel-fact-item__text">{f.factText}</span>
                    <span className="intel-fact-item__meta">
                      {f.locked ? "LOCKED" : statusLabel(f.reviewStatus)} · conf {f.confidence.toFixed(2)}
                    </span>
                  </button>
                  {!f.locked ? (
                    <div className="intel-fact-item__actions">
                      <button type="button" className="intel-mini-btn" onClick={() => setFactStatus(f.id, "approved")}>
                        Approve
                      </button>
                      <button type="button" className="intel-mini-btn" onClick={() => setFactStatus(f.id, "rejected")}>
                        Reject
                      </button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
          <section className="intel-panel intel-panel--excerpt" aria-label="Source excerpt">
            <h2 className="intel-panel__title">Source</h2>
            {selectedFact ? (
              <>
                <p className="intel-excerpt__label">
                  {selectedFact.sourceType === "canonical"
                    ? "Retroverse"
                    : selectedFact.sourceUrl?.includes("wikipedia")
                      ? "Wikipedia"
                      : "Research"}{" "}
                  · conf {selectedFact.confidence.toFixed(2)}
                </p>
                {selectedFact.sourceUrl ? (
                  <a className="intel-excerpt__url" href={selectedFact.sourceUrl} target="_blank" rel="noreferrer">
                    {selectedFact.sourceUrl}
                  </a>
                ) : (
                  <p className="intel-excerpt__url">Retroverse canonical</p>
                )}
                <div className="intel-excerpt__body">
                  {highlightAnchor(selectedFact.sourceExcerpt, selectedFact.excerptAnchor)}
                </div>
              </>
            ) : (
              <p className="intel-dim">Select a fact to view its source excerpt.</p>
            )}
          </section>
        </div>
      ) : null}

      {tab === "stories" ? (
        <section className="intel-panel intel-panel--full" aria-label="Candidate stories">
          <h2 className="intel-panel__title">Ranked Stories ({approvedStoryCount} approved)</h2>
          <ul className="intel-story-list">
            {pkg.candidateStories.map((s) => {
              const primary = factsById.get(s.primaryFactId);
              return (
                <li key={s.id} className="intel-story-item">
                  <div className="intel-story-item__rank">#{s.rank}</div>
                  <div className="intel-story-item__body">
                    <p className="intel-story-item__headline">{s.headline}</p>
                    <p className="intel-story-item__fact">{primary?.factText ?? "(missing fact)"}</p>
                    <p className="intel-story-item__meta">
                      score {s.rankScore.toFixed(2)} · {statusLabel(s.reviewStatus)}
                    </p>
                  </div>
                  <div className="intel-story-item__actions">
                    <button type="button" className="intel-mini-btn" onClick={() => setStoryStatus(s.id, "approved")}>
                      Approve
                    </button>
                    <button type="button" className="intel-mini-btn" onClick={() => setStoryStatus(s.id, "rejected")}>
                      Reject
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {tab === "cards" ? (
        <>
          <section className="intel-review__stage" aria-label="Story card">
            {activeCard ? (
              <article className="intel-review__card">
                <p className="intel-card__source">
                  {activeCard.sourceLabel}
                  {activeCard.locked ? " · LOCKED" : ""}
                  {activeCard.hidden ? " · HIDDEN" : ""}
                  {activeCard.sourceUrl ? (
                    <>
                      {" · "}
                      <a href={activeCard.sourceUrl} target="_blank" rel="noreferrer">
                        source
                      </a>
                    </>
                  ) : null}
                </p>
                <textarea
                  className="intel-review__card-headline"
                  value={activeCard.headline}
                  rows={2}
                  aria-label="Headline"
                  disabled={activeCard.locked}
                  onChange={(e) => updateCard(cardIndex, "headline", e.target.value)}
                />
                <textarea
                  className="intel-review__card-body"
                  value={activeCard.fact}
                  rows={6}
                  aria-label="Fact"
                  disabled={activeCard.locked}
                  onChange={(e) => updateCard(cardIndex, "fact", e.target.value)}
                />
                {activeCard.supportingContext ? (
                  <p className="intel-review__card-sub">{activeCard.supportingContext}</p>
                ) : null}
              </article>
            ) : (
              <div className="intel-review__empty">
                <p>No cards yet. Approve facts and stories, then build cards.</p>
              </div>
            )}
          </section>
          {activeCard && cards.length > 1 ? (
            <nav className="intel-review__nav" aria-label="Card navigation">
              <button
                type="button"
                className="intel-review__nav-btn"
                onClick={() => setCardIndex((i) => (i - 1 + cards.length) % cards.length)}
              >
                ← Previous
              </button>
              <p className="intel-review__counter">
                {cardIndex + 1} / {cards.length}
              </p>
              <button
                type="button"
                className="intel-review__nav-btn"
                onClick={() => setCardIndex((i) => (i + 1) % cards.length)}
              >
                Next →
              </button>
            </nav>
          ) : null}
        </>
      ) : null}

      <footer className="intel-review__footer">
        <button type="button" className="intel-review__btn intel-review__btn--solid" disabled={busy} onClick={saveReview}>
          Save Review
        </button>
        <button type="button" className="intel-review__btn" disabled={busy} onClick={buildCards}>
          Build Experience
        </button>
        {cards.length > 0 ? (
          <button type="button" className="intel-review__btn" disabled={busy} onClick={saveCards}>
            Save Story
          </button>
        ) : null}
        {pkg.status === "cards_ready" || pkg.status === "review" ? (
          <button type="button" className="intel-review__btn" disabled={busy} onClick={approvePackage}>
            Approve Research
          </button>
        ) : null}
        <button type="button" className="intel-review__btn" disabled={busy} onClick={runProcess}>
          {busy ? "Working…" : "Run Pipeline"}
        </button>
        <Link className="intel-review__btn intel-review__btn--link" href="/ops/intelligence" prefetch={false}>
          Back
        </Link>
      </footer>
    </div>
  );
}
