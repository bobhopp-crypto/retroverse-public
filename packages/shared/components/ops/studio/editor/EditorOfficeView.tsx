"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { SongWorkspaceTabs } from "@/components/ops/studio/SongWorkspaceTabs";
import {
  EDITOR_TABS,
  STORY_ANGLES,
  factStatusSymbol,
  type EditorTabId,
} from "@/lib/ops/studio/editor/editorial-constants";
import type { EditorOfficeView } from "@/lib/ops/studio/editor/office-presentation";
import type { EditorPackagePageContext } from "@/lib/ops/studio/editor/page-context";
import type {
  CandidateFactStatus,
  EditorStoryPackage,
  ImageBoardItem,
  PlannedCard,
  StoryAngleId,
} from "@/lib/ops/studio/editor/types";

type Props = {
  initialContext: EditorPackagePageContext;
};

async function postAction(
  rvtr: string,
  payload: Record<string, unknown>,
): Promise<{ ok: boolean; story?: EditorStoryPackage; office?: EditorOfficeView; error?: string; message?: string }> {
  const res = await fetch("/api/ops/studio/editor/action", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rvtr, ...payload }),
  });
  return res.json() as Promise<{ ok: boolean; story?: EditorStoryPackage; office?: EditorOfficeView; error?: string; message?: string }>;
}

function TabLabel(id: EditorTabId): string {
  const labels: Record<EditorTabId, string> = {
    overview: "Overview",
    story: "Story",
    facts: "Facts",
    timeline: "Timeline",
    cards: "Cards",
    images: "Images",
    performances: "Performances",
    sources: "Sources",
    handoff: "Director Handoff",
  };
  return labels[id];
}

export function EditorOfficeView({ initialContext }: Props) {
  const [story, setStory] = useState<EditorStoryPackage | null>(initialContext.story);
  const [office, setOffice] = useState<EditorOfficeView | null>(initialContext.office);
  const [tab, setTab] = useState<EditorTabId>("overview");
  const [busy, setBusy] = useState(false);
  const [rewriteConfirm, setRewriteConfirm] = useState(false);
  const rvtr = initialContext.rvtr;

  useEffect(() => {
    setStory(initialContext.story);
    setOffice(initialContext.office);
    setTab("overview");
    setBusy(false);
    setRewriteConfirm(false);
  }, [initialContext.rvtr, initialContext.story, initialContext.office]);

  const apply = useCallback((nextStory: EditorStoryPackage, nextOffice?: EditorOfficeView) => {
    setStory(nextStory);
    if (nextOffice) setOffice(nextOffice);
  }, []);

  async function saveStory(next: EditorStoryPackage) {
    setBusy(true);
    try {
      const data = await postAction(rvtr, { action: "save_story", story: next });
      if (data.ok && data.story) apply(data.story, data.office);
    } finally {
      setBusy(false);
    }
  }

  async function reviewFact(factId: string, status: CandidateFactStatus) {
    setBusy(true);
    try {
      const data = await postAction(rvtr, { action: "review_fact", factId, factStatus: status });
      if (data.ok && data.story) apply(data.story, data.office);
    } finally {
      setBusy(false);
    }
  }

  async function rewriteStory(force = false) {
    setBusy(true);
    try {
      const data = await postAction(rvtr, { action: "rewrite_story", forceRewrite: force });
      if (data.error === "confirm_required") {
        setRewriteConfirm(true);
        return;
      }
      if (data.ok && data.story) {
        setRewriteConfirm(false);
        apply(data.story, data.office);
      }
    } finally {
      setBusy(false);
    }
  }

  async function setAngle(angle: StoryAngleId, custom?: string | null) {
    setBusy(true);
    try {
      const data = await postAction(rvtr, {
        action: "set_angle",
        storyAngle: angle,
        storyAngleCustom: custom ?? null,
      });
      if (data.ok && data.story) apply(data.story, data.office);
    } finally {
      setBusy(false);
    }
  }

  async function usePerformance(performanceId: string) {
    if (!story) return;
    const next: EditorStoryPackage = {
      ...story,
      approved: { ...story.approved, performanceId },
    };
    await saveStory(next);
  }

  function updateStoryField<K extends keyof EditorStoryPackage["story"]>(
    key: K,
    value: EditorStoryPackage["story"][K],
  ) {
    if (!story) return;
    const next: EditorStoryPackage = {
      ...story,
      story: { ...story.story, [key]: value },
      meta: { ...story.meta, storyManuallyEdited: true },
    };
    setStory(next);
  }

  function updatePlannedCards(cards: PlannedCard[]) {
    if (!story) return;
    setStory({ ...story, workspace: { ...story.workspace, plannedCards: cards } });
  }

  function updateImageBoard(board: ImageBoardItem[]) {
    if (!story) return;
    setStory({ ...story, workspace: { ...story.workspace, imageBoard: board } });
  }

  if (!story || !office) {
    return (
      <div className="ops-editor">
        <p className="ops-editor__empty">No story package for {rvtr}.</p>
      </div>
    );
  }

  const d = office.dashboard;

  return (
    <div className="ops-editor ops-editor--office">
      <SongWorkspaceTabs active="story" rvtr={rvtr} />

      <p className="ops-editor__library-back">
        <Link className="ops-studio__back" href="/ops/studio/editor">
          ← Story Desk
        </Link>
      </p>

      <header className="ops-editor-office__masthead">
        <div className="ops-editor-office__masthead-art">
          {office.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={office.coverUrl} alt="" />
          ) : (
            <span>✎</span>
          )}
        </div>
        <div>
          <p className="ops-editor-office__eyebrow">Features Desk</p>
          <h1 className="ops-editor-office__title">{office.artist}</h1>
          <p className="ops-editor-office__song">{office.title}</p>
          <p className="ops-editor-office__hook">{d.hookPreview}</p>
        </div>
      </header>

      <nav className="ops-editor-office__tabs" aria-label="Editorial sections">
        {EDITOR_TABS.map((id) => (
          <button
            key={id}
            type="button"
            className={
              tab === id
                ? "ops-editor-office__tab ops-editor-office__tab--active"
                : "ops-editor-office__tab"
            }
            onClick={() => setTab(id)}
          >
            {TabLabel(id)}
          </button>
        ))}
      </nav>

      <div className="ops-editor-office__panel rs-studio-panel">
        {tab === "overview" ? (
          <section className="ops-editor-office__overview">
            {office.editorialBrain ? (
              <>
                <div className="ops-editor-brain__brief rs-studio-review-panel rs-studio-review-panel--info">
                  <h2 className="ops-editor-brain__headline">{office.editorialBrain.brief.primaryTheme}</h2>
                  <p className="ops-editor-brain__hook">{office.editorialBrain.brief.emotionalHook}</p>
                  <dl className="ops-editor-brain__brief-grid">
                    <div>
                      <dt>Why it matters</dt>
                      <dd>{office.editorialBrain.brief.culturalSignificance}</dd>
                    </div>
                    <div>
                      <dt>Why people remember</dt>
                      <dd>{office.editorialBrain.brief.whyPeopleRemember}</dd>
                    </div>
                    <div>
                      <dt>Most surprising</dt>
                      <dd>{office.editorialBrain.brief.mostSurprising}</dd>
                    </div>
                    <div className="ops-editor-brain__takeaway">
                      <dt>Visitor takeaway</dt>
                      <dd>{office.editorialBrain.brief.visitorTakeaway}</dd>
                    </div>
                  </dl>
                </div>

                <div className="ops-editor-brain__section">
                  <h3 className="ops-editor-office__section-title">Evidence Board</h3>
                  <div className="ops-editor-brain__board">
                    {office.editorialBrain.evidenceBoard.map((section) => (
                      <article key={section.id} className="ops-editor-brain__board-section">
                        <h4>{section.title}</h4>
                        <p className="ops-editor-brain__board-lead">{section.lead}</p>
                        <ul>
                          {section.items.map((item) => (
                            <li
                              key={item.id}
                              className={
                                item.emphasis === "primary"
                                  ? "ops-editor-brain__evidence--primary"
                                  : undefined
                              }
                            >
                              {item.text}
                            </li>
                          ))}
                        </ul>
                      </article>
                    ))}
                  </div>
                </div>

                <div className="ops-editor-brain__section">
                  <h3 className="ops-editor-office__section-title">Museum Recommendation</h3>
                  <p className="ops-editor-brain__museum-lead">{office.editorialBrain.museumRecommendation.headline}</p>
                  <ol className="ops-editor-brain__exhibit-flow">
                    {office.editorialBrain.museumRecommendation.exhibitFlow.map((step) => (
                      <li key={step.id} className={`ops-editor-brain__exhibit ops-editor-brain__exhibit--${step.role}`}>
                        <strong>{step.label}</strong>
                        <span>{step.rationale}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="ops-editor-brain__section">
                  <h3 className="ops-editor-office__section-title">Director Brief</h3>
                  <div className="ops-editor-brain__director rs-studio-review-panel">
                    <p><strong>Theme:</strong> {office.editorialBrain.directorBrief.theme}</p>
                    <p><strong>Opening:</strong> {office.editorialBrain.directorBrief.openingHook}</p>
                    <p><strong>Closing:</strong> {office.editorialBrain.directorBrief.closingTakeaway}</p>
                    <p><strong>Exhibit order:</strong> {office.editorialBrain.directorBrief.recommendedExhibitOrder.join(" → ")}</p>
                    {office.editorialBrain.directorBrief.retroverseMoments.length > 0 ? (
                      <ul className="ops-editor-brain__rv-moments">
                        {office.editorialBrain.directorBrief.retroverseMoments.map((moment) => (
                          <li key={moment.id}>{moment.text}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </div>

                {office.editorialBrain.discarded.length > 0 ? (
                  <details className="ops-editor-brain__noise">
                    <summary>Filtered noise ({office.editorialBrain.discarded.length})</summary>
                    <ul>
                      {office.editorialBrain.discarded.slice(0, 8).map((d) => (
                        <li key={d.id}>
                          <span>{d.text}</span> — <em>{d.reason}</em>
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : null}
              </>
            ) : (
              <p className="ops-editor-office__lead">Editorial Brain is building from Collector research…</p>
            )}

            <details className="ops-editor-brain__support">
              <summary>Editorial scores &amp; checklist</summary>
              {d.editorialReview ? (
                <div className="rs-studio-review-panel ops-editor-office__review">
                  <p className="rs-studio-review-panel__lead ops-editor-office__review-rec">
                    {d.editorialReview.recommendation === "ready_for_director" ? "✅" : "⚠"}{" "}
                    {d.editorialReview.recommendationLabel}
                  </p>
                  <dl className="ops-editor-office__review-grid">
                    <div><dt>Patron Value</dt><dd>{d.editorialReview.patronValue}/10</dd></div>
                    <div><dt>Story Quality</dt><dd>{d.editorialReview.storyQuality}</dd></div>
                  </dl>
                </div>
              ) : null}
              <dl className="ops-editor-office__dash-grid">
                <div><dt>Status</dt><dd>{d.storyStatus}</dd></div>
                <div><dt>Promoted facts</dt><dd>{office.editorialBrain?.promotedFactIds.length ?? d.approvedFactsCount}</dd></div>
                <div><dt>Ready for Director</dt><dd>{d.readyForDirector ? "Yes" : "Not yet"}</dd></div>
              </dl>
            </details>

            <div className="ops-editor-office__quick-actions">
              <button type="button" className="ops-editor-office__btn" onClick={() => setTab("facts")}>
                Supporting facts
              </button>
              <button type="button" className="ops-editor-office__btn ops-editor-office__btn--primary" onClick={() => setTab("story")}>
                Edit story
              </button>
            </div>
          </section>
        ) : null}

        {tab === "story" ? (
          <section className="ops-editor-office__story">
            <div className="ops-editor-office__story-toolbar">
              <h2 className="ops-editor-office__section-title">Story</h2>
              <button
                type="button"
                className="ops-editor-office__btn ops-editor-office__btn--rewrite"
                disabled={busy}
                onClick={() => rewriteStory(false)}
              >
                Rewrite Story
              </button>
            </div>

            {rewriteConfirm ? (
              <div className="ops-editor-office__confirm" role="alert">
                <p>Manual edits detected. Overwrite with AI rewrite using accepted facts only?</p>
                <button type="button" className="ops-editor-office__btn" onClick={() => setRewriteConfirm(false)}>
                  Cancel
                </button>
                <button type="button" className="ops-editor-office__btn ops-editor-office__btn--primary" onClick={() => rewriteStory(true)}>
                  Overwrite
                </button>
              </div>
            ) : null}

            <fieldset className="ops-editor-office__angles">
              <legend>Story Angle</legend>
              {STORY_ANGLES.map((a) => (
                <label key={a.id} className="ops-editor-office__angle">
                  <input
                    type="radio"
                    name="story-angle"
                    checked={story.meta.storyAngle === a.id}
                    onChange={() => setAngle(a.id)}
                  />
                  <span>{a.label}</span>
                </label>
              ))}
              {story.meta.storyAngle === "custom" ? (
                <input
                  className="ops-editor__input"
                  type="text"
                  placeholder="Custom angle…"
                  value={story.meta.storyAngleCustom ?? ""}
                  onChange={(e) =>
                    setStory({
                      ...story,
                      meta: { ...story.meta, storyAngleCustom: e.target.value },
                    })
                  }
                  onBlur={(e) => setAngle("custom", e.target.value)}
                />
              ) : null}
            </fieldset>

            {(["headline", "subtitle", "hook", "summary", "fullStory"] as const).map((key) => (
              <label key={key} className="ops-editor-office__field">
                <span>{key === "hook" ? "One-Sentence Hook" : key === "fullStory" ? "Full Story" : key.charAt(0).toUpperCase() + key.slice(1)}</span>
                {key === "fullStory" || key === "summary" ? (
                  <textarea
                    className="ops-editor__textarea ops-editor-office__textarea--large"
                    rows={key === "fullStory" ? 12 : 4}
                    value={story.story[key]}
                    onChange={(e) => updateStoryField(key, e.target.value)}
                    onBlur={() => saveStory(story)}
                  />
                ) : (
                  <input
                    className="ops-editor__input"
                    type="text"
                    value={story.story[key]}
                    onChange={(e) => updateStoryField(key, e.target.value)}
                    onBlur={() => saveStory(story)}
                  />
                )}
              </label>
            ))}
          </section>
        ) : null}

        {tab === "facts" ? (
          <section>
            <h2 className="ops-editor-office__section-title">Candidate Facts</h2>
            <p className="ops-editor-office__lead">Accept facts for story generation. Rejected facts stay out of rewrites.</p>
            <ul className="ops-editor-office__facts">
              {story.workspace.candidateFacts.map((fact) => (
                <li
                  key={fact.id}
                  className={`ops-editor-office__fact ops-editor-office__fact--${fact.status}`}
                >
                  <span className="ops-editor-office__fact-symbol">{factStatusSymbol(fact.status)}</span>
                  <p>{fact.text}</p>
                  <div className="ops-editor-office__fact-actions">
                    <button type="button" disabled={busy} onClick={() => reviewFact(fact.id, "accepted")}>
                      Accept
                    </button>
                    <button type="button" disabled={busy} onClick={() => reviewFact(fact.id, "hold")}>
                      Hold
                    </button>
                    <button type="button" disabled={busy} onClick={() => reviewFact(fact.id, "rejected")}>
                      Reject
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {tab === "timeline" ? (
          <section>
            <h2 className="ops-editor-office__section-title">Timeline</h2>
            <ol className="ops-editor-office__timeline">
              {story.workspace.evidence.timeline.map((event) => (
                <li key={event.id!}>
                  <time>{event.date}</time>
                  <span>{event.label}</span>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        {tab === "cards" ? (
          <section>
            <h2 className="ops-editor-office__section-title">Story Cards</h2>
            <p className="ops-editor-office__lead">Plan collectible story cards. Toggle approved and set priority.</p>
            <ul className="ops-editor-office__cards">
              {[...story.workspace.plannedCards]
                .sort((a, b) => a.order - b.order)
                .map((card, index) => (
                  <li
                    key={`${rvtr}-card-${card.id}`}
                    className="ops-editor-office__card"
                    draggable
                    onDragStart={() => {
                      (window as unknown as { __dragCard: number }).__dragCard = index;
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      const from = (window as unknown as { __dragCard: number }).__dragCard;
                      if (from === index) return;
                      const sorted = [...story.workspace.plannedCards].sort((a, b) => a.order - b.order);
                      const [moved] = sorted.splice(from, 1);
                      sorted.splice(index, 0, moved!);
                      const reordered = sorted.map((c, i) => ({ ...c, order: i }));
                      updatePlannedCards(reordered);
                      saveStory({ ...story, workspace: { ...story.workspace, plannedCards: reordered } });
                    }}
                  >
                    <span className="ops-editor-office__drag">⋮⋮</span>
                    <div>
                      <input
                        className="ops-editor__input"
                        value={card.title}
                        onChange={(e) => {
                          const plannedCards = story.workspace.plannedCards.map((c) =>
                            c.id === card.id ? { ...c, title: e.target.value } : c,
                          );
                          updatePlannedCards(plannedCards);
                        }}
                        onBlur={() => saveStory(story)}
                      />
                      <textarea
                        className="ops-editor__textarea"
                        rows={2}
                        value={card.body}
                        onChange={(e) => {
                          const plannedCards = story.workspace.plannedCards.map((c) =>
                            c.id === card.id ? { ...c, body: e.target.value } : c,
                          );
                          updatePlannedCards(plannedCards);
                        }}
                        onBlur={() => saveStory(story)}
                      />
                    </div>
                    <label>
                      <input
                        type="checkbox"
                        checked={card.approved}
                        onChange={(e) => {
                          const plannedCards = story.workspace.plannedCards.map((c) =>
                            c.id === card.id ? { ...c, approved: e.target.checked } : c,
                          );
                          const next = { ...story, workspace: { ...story.workspace, plannedCards } };
                          setStory(next);
                          saveStory(next);
                        }}
                      />
                      Approved
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={card.hidden}
                        onChange={(e) => {
                          const plannedCards = story.workspace.plannedCards.map((c) =>
                            c.id === card.id ? { ...c, hidden: e.target.checked } : c,
                          );
                          const next = { ...story, workspace: { ...story.workspace, plannedCards } };
                          setStory(next);
                          saveStory(next);
                        }}
                      />
                      Hidden
                    </label>
                    <input
                      className="ops-editor-office__priority"
                      type="number"
                      min={0}
                      max={9}
                      value={card.priority}
                      onChange={(e) => {
                        const plannedCards = story.workspace.plannedCards.map((c) =>
                          c.id === card.id ? { ...c, priority: parseInt(e.target.value, 10) || 0 } : c,
                        );
                        updatePlannedCards(plannedCards);
                      }}
                      onBlur={() => saveStory(story)}
                    />
                  </li>
                ))}
            </ul>
          </section>
        ) : null}

        {tab === "images" ? (
          <section>
            <h2 className="ops-editor-office__section-title">Image Board</h2>
            <div className="ops-editor-office__image-board">
              {[...story.workspace.imageBoard]
                .sort((a, b) => a.order - b.order)
                .map((img, index) => (
                  <article
                    key={`${rvtr}-img-${img.assetId}-${img.imageUrl}`}
                    className="ops-editor-office__image-card"
                    draggable
                    onDragStart={() => {
                      (window as unknown as { __dragImg: number }).__dragImg = index;
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      const from = (window as unknown as { __dragImg: number }).__dragImg;
                      if (from === index) return;
                      const sorted = [...story.workspace.imageBoard].sort((a, b) => a.order - b.order);
                      const [moved] = sorted.splice(from, 1);
                      sorted.splice(index, 0, moved!);
                      const reordered = sorted.map((item, i) => ({ ...item, order: i }));
                      updateImageBoard(reordered);
                      saveStory({ ...story, workspace: { ...story.workspace, imageBoard: reordered } });
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.imageUrl} alt="" />
                    <p>{img.label}</p>
                    <select
                      value={img.role}
                      onChange={(e) => {
                        const imageBoard = story.workspace.imageBoard.map((item) =>
                          item.assetId === img.assetId
                            ? { ...item, role: e.target.value as ImageBoardItem["role"] }
                            : item,
                        );
                        const next = { ...story, workspace: { ...story.workspace, imageBoard } };
                        setStory(next);
                        saveStory(next);
                      }}
                    >
                      <option value="hero">Hero</option>
                      <option value="supporting">Supporting</option>
                      <option value="performance">Performance</option>
                      <option value="close-up">Close-up</option>
                      <option value="alternate">Alternate</option>
                    </select>
                    <label>
                      <input
                        type="checkbox"
                        checked={img.approved}
                        onChange={(e) => {
                          const imageBoard = story.workspace.imageBoard.map((item) =>
                            item.assetId === img.assetId ? { ...item, approved: e.target.checked } : item,
                          );
                          const next = { ...story, workspace: { ...story.workspace, imageBoard } };
                          setStory(next);
                          saveStory(next);
                        }}
                      />
                      Approved
                    </label>
                  </article>
                ))}
            </div>
          </section>
        ) : null}

        {tab === "performances" ? (
          <section>
            <h2 className="ops-editor-office__section-title">Performance Review</h2>
            <div className="ops-editor-office__perf-grid">
              {office.performances.map((perf) => (
                <article
                  key={`${rvtr}-perf-${perf.id}`}
                  className={
                    office.selectedPerformanceId === perf.id
                      ? "ops-editor-office__perf ops-editor-office__perf--selected"
                      : "ops-editor-office__perf"
                  }
                >
                  <h3>
                    {perf.title}
                    {perf.recommended ? <span className="ops-editor-office__badge">Recommended</span> : null}
                  </h3>
                  <dl>
                    <div><dt>Venue</dt><dd>{perf.venue || "—"}</dd></div>
                    <div><dt>Year</dt><dd>{perf.year ?? "—"}</dd></div>
                    <div><dt>Confidence</dt><dd>{Math.round(perf.confidence * 100)}%</dd></div>
                    <div><dt>Quality</dt><dd>{perf.qualityScore}</dd></div>
                  </dl>
                  {perf.recommendReason ? <p className="ops-editor-office__perf-reason">{perf.recommendReason}</p> : null}
                  {perf.screenshots.length > 0 ? (
                    <div className="ops-editor-office__perf-shots">
                      {perf.screenshots.slice(0, 3).map((s) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={`${rvtr}-shot-${s.assetId}-${s.imageUrl}`} src={s.imageUrl} alt="" />
                      ))}
                    </div>
                  ) : null}
                  <textarea
                    className="ops-editor__textarea"
                    rows={3}
                    placeholder="Performance notes…"
                    value={story.workspace.performances[perf.id]?.notes ?? perf.notes}
                    onChange={(e) => {
                      const performances = {
                        ...story.workspace.performances,
                        [perf.id]: {
                          ...story.workspace.performances[perf.id]!,
                          notes: e.target.value,
                        },
                      };
                      setStory({ ...story, workspace: { ...story.workspace, performances } });
                    }}
                    onBlur={() => saveStory(story)}
                  />
                  <button
                    type="button"
                    className="ops-editor-office__btn ops-editor-office__btn--primary"
                    onClick={() => usePerformance(perf.id)}
                  >
                    Use This Performance
                  </button>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {tab === "sources" ? (
          <section className="ops-editor-office__sources">
            <h2 className="ops-editor-office__section-title">Sources & Evidence</h2>
            <details open>
              <summary>Recording</summary>
              <p>{story.workspace.evidence.recording || "—"}</p>
            </details>
            <details>
              <summary>Charts</summary>
              <p>{story.workspace.evidence.charts || "—"}</p>
            </details>
            <details>
              <summary>Culture</summary>
              <p>{story.workspace.evidence.culture || "—"}</p>
            </details>
            <details>
              <summary>Relationships</summary>
              <p>{story.workspace.evidence.relationships || "—"}</p>
            </details>
          </section>
        ) : null}

        {tab === "handoff" ? (
          <section className="ops-editor-office__handoff">
            <h2 className="ops-editor-office__section-title">Director Handoff</h2>
            <ul className="ops-editor-office__checklist">
              {Object.entries(story.meta.directorHandoff.checklist).map(([key, done]) => (
                <li key={key} className={done ? "ops-editor-office__check--done" : ""}>
                  {done ? "✓" : "○"} {key}
                </li>
              ))}
            </ul>
            {office.submitted ? (
              <p className="ops-editor-office__submitted">Submitted to Director. Experience design comes next.</p>
            ) : (
              <button
                type="button"
                className="ops-editor-office__btn ops-editor-office__btn--primary"
                disabled={!office.canSubmit || busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    const data = await postAction(rvtr, { action: "submit_to_director" });
                    if (data.ok && data.story) apply(data.story, data.office);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Hand to Director →
              </button>
            )}
          </section>
        ) : null}
      </div>

      {busy ? <p className="ops-editor-office__busy">Saving…</p> : null}

      <nav className="ops-collector__song-nav" aria-label="Song navigation">
        {initialContext.prev ? (
          <Link className="ops-collector__song-nav-link" href={initialContext.prev.href}>
            <span className="ops-collector__song-nav-label">Previous Story</span>
            <span className="ops-collector__song-nav-name">
              {initialContext.prev.artist} — {initialContext.prev.title}
            </span>
          </Link>
        ) : (
          <span className="ops-collector__song-nav-link ops-collector__song-nav-link--empty" />
        )}
        {initialContext.next ? (
          <Link className="ops-collector__song-nav-link ops-collector__song-nav-link--next" href={initialContext.next.href}>
            <span className="ops-collector__song-nav-label">Next Story</span>
            <span className="ops-collector__song-nav-name">
              {initialContext.next.artist} — {initialContext.next.title}
            </span>
          </Link>
        ) : (
          <span className="ops-collector__song-nav-link ops-collector__song-nav-link--empty" />
        )}
      </nav>
    </div>
  );
}
