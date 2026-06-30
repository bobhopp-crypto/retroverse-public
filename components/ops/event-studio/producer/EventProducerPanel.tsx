"use client";

import { useCallback, useEffect, useState } from "react";

import { createEmptyParsedPlan } from "@/lib/ops/event-studio/producer/defaults";
import type { EventProducerDraft, EventProducerParsedPlan } from "@/lib/ops/event-studio/producer/types";

const MODULE_LABELS: Record<keyof EventProducerParsedPlan["recommendedModules"], string> = {
  identity: "Identity",
  assets: "Assets",
  passes: "Passes",
  giveaway: "Giveaway",
  landingPage: "Landing Page",
  poster: "Poster",
  facebookPost: "Facebook Post",
  nowPlaying: "Now Playing",
  archive: "Archive",
};

function display(value: string | null | undefined, fallback = "—"): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

function displayList(values: string[], fallback = "—"): string {
  return values.length > 0 ? values.join(", ") : fallback;
}

type Props = {
  initialDrafts: EventProducerDraft[];
};

export function EventProducerPanel({ initialDrafts }: Props) {
  const [sourceText, setSourceText] = useState("");
  const [parsedPlan, setParsedPlan] = useState<EventProducerParsedPlan | null>(null);
  const [model, setModel] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<EventProducerDraft[]>(initialDrafts);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const refreshDrafts = useCallback(async () => {
    const res = await fetch("/api/ops/event-studio/producer/drafts");
    const data = (await res.json()) as { drafts?: EventProducerDraft[]; error?: string };
    if (res.ok && data.drafts) {
      setDrafts(data.drafts);
    }
  }, []);

  useEffect(() => {
    void refreshDrafts();
  }, [refreshDrafts]);

  async function analyze() {
    setAnalyzing(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/ops/event-studio/producer/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceText }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        model?: string;
        parsedPlan?: EventProducerParsedPlan;
      };
      if (!res.ok || !data.ok || !data.parsedPlan) {
        throw new Error(data.error ?? "Analysis failed");
      }
      setParsedPlan(data.parsedPlan);
      setModel(data.model ?? null);
      setMessage("Analysis complete.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  }

  async function saveDraft(basic = false) {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/ops/event-studio/producer/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceText,
          model: basic ? "none" : (model ?? "none"),
          parsedPlan: basic ? createEmptyParsedPlan() : (parsedPlan ?? createEmptyParsedPlan()),
          basic,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; draft?: EventProducerDraft };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Save failed");
      }
      setMessage(basic ? "Basic draft saved." : "Draft event plan saved.");
      await refreshDrafts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const hasPlan = parsedPlan != null;
  const enabledModules = hasPlan
    ? (Object.entries(parsedPlan.recommendedModules) as [keyof EventProducerParsedPlan["recommendedModules"], boolean][])
        .filter(([, enabled]) => enabled)
        .map(([key]) => MODULE_LABELS[key])
    : [];

  return (
    <div className="es-producer">
      <section className="ops-event-studio__panel ops-event-studio__panel--wide es-producer__intake" aria-label="Event description">
        <h2 className="ops-event-studio__panel-title">Describe the event</h2>
        <p className="ops-event-studio__hint">
          Paste a plain-English brief. Local Ollama extracts schedule, venue, passes, giveaway rules, and
          recommended Event Studio modules.
        </p>
        <textarea
          className="es-producer__textarea"
          rows={12}
          value={sourceText}
          onChange={(e) => setSourceText(e.target.value)}
          placeholder="Every Sunday in July we are doing Live Aid and music from the 80s at The Main Pub..."
        />
        <div className="es-producer__toolbar">
          <button
            type="button"
            className="es-producer__btn es-producer__btn--primary"
            onClick={() => void analyze()}
            disabled={analyzing || !sourceText.trim()}
          >
            {analyzing ? "Analyzing…" : "Analyze Event"}
          </button>
          {hasPlan ? (
            <button
              type="button"
              className="es-producer__btn"
              onClick={() => void saveDraft(false)}
              disabled={saving || !sourceText.trim()}
            >
              {saving ? "Saving…" : "Save Draft Event Plan"}
            </button>
          ) : null}
        </div>
        {error ? (
          <div className="es-producer__alert es-producer__alert--error" role="alert">
            <p>{error}</p>
            <button
              type="button"
              className="es-producer__btn es-producer__btn--fallback"
              onClick={() => void saveDraft(true)}
              disabled={saving || !sourceText.trim()}
            >
              Use basic draft without AI
            </button>
          </div>
        ) : null}
        {message ? <p className="es-producer__message">{message}</p> : null}
      </section>

      {hasPlan ? (
        <div className="es-producer__results">
          <section className="ops-event-studio__panel es-producer__summary" aria-label="Event summary">
            <h2 className="ops-event-studio__panel-title">Event Summary</h2>
            <dl className="ops-event-studio__facts">
              <div>
                <dt>Title</dt>
                <dd>{display(parsedPlan.eventTitle)}</dd>
              </div>
              <div>
                <dt>Type</dt>
                <dd>{display(parsedPlan.eventType)}</dd>
              </div>
              <div>
                <dt>Series</dt>
                <dd>{display(parsedPlan.seriesName)}</dd>
              </div>
              <div>
                <dt>Theme</dt>
                <dd>{display(parsedPlan.theme)}</dd>
              </div>
              <div>
                <dt>Music Era</dt>
                <dd>{displayList(parsedPlan.musicEra)}</dd>
              </div>
              <div>
                <dt>Expected Attendance</dt>
                <dd>
                  {parsedPlan.expectedAttendance != null ? parsedPlan.expectedAttendance : "—"}
                </dd>
              </div>
            </dl>
          </section>

          <section className="ops-event-studio__panel" aria-label="Schedule and venue">
            <h2 className="ops-event-studio__panel-title">Dates &amp; Venue</h2>
            <dl className="ops-event-studio__facts">
              <div>
                <dt>Date Summary</dt>
                <dd>{display(parsedPlan.dateSummary)}</dd>
              </div>
              <div>
                <dt>Dates</dt>
                <dd>{displayList(parsedPlan.dates)}</dd>
              </div>
              <div>
                <dt>Start</dt>
                <dd>{display(parsedPlan.startTime)}</dd>
              </div>
              <div>
                <dt>End</dt>
                <dd>{display(parsedPlan.endTime)}</dd>
              </div>
              <div className="ops-event-studio__facts-wide">
                <dt>Venue</dt>
                <dd>{display(parsedPlan.venue)}</dd>
              </div>
            </dl>
          </section>

          <section className="ops-event-studio__panel" aria-label="Registration rules">
            <h2 className="ops-event-studio__panel-title">Registration</h2>
            <dl className="ops-event-studio__facts">
              <div>
                <dt>Enabled</dt>
                <dd>{parsedPlan.registration.enabled ? "Yes" : "No"}</dd>
              </div>
              <div>
                <dt>Required</dt>
                <dd>{parsedPlan.registration.required ? "Yes" : "No"}</dd>
              </div>
              <div className="ops-event-studio__facts-wide">
                <dt>Rules</dt>
                <dd>{display(parsedPlan.registration.rules)}</dd>
              </div>
            </dl>
          </section>

          <section className="ops-event-studio__panel" aria-label="Passes">
            <h2 className="ops-event-studio__panel-title">Passes</h2>
            <dl className="ops-event-studio__facts">
              <div>
                <dt>Enabled</dt>
                <dd>{parsedPlan.passes.enabled ? "Yes" : "No"}</dd>
              </div>
              <div>
                <dt>Standard Passes</dt>
                <dd>{parsedPlan.passes.standardPasses ? "Yes" : "No"}</dd>
              </div>
              <div>
                <dt>Premium Passes</dt>
                <dd>{parsedPlan.passes.premiumPasses ? "Yes" : "No"}</dd>
              </div>
              <div>
                <dt>Premium / Sheet</dt>
                <dd>{parsedPlan.passes.premiumPerSheet || "—"}</dd>
              </div>
              <div>
                <dt>Paper Size</dt>
                <dd>{display(parsedPlan.passes.paperSize)}</dd>
              </div>
            </dl>
          </section>

          <section className="ops-event-studio__panel" aria-label="Giveaway rules">
            <h2 className="ops-event-studio__panel-title">Giveaway</h2>
            <dl className="ops-event-studio__facts">
              <div>
                <dt>Enabled</dt>
                <dd>{parsedPlan.giveaway.enabled ? "Yes" : "No"}</dd>
              </div>
              <div>
                <dt>Prize</dt>
                <dd>{display(parsedPlan.giveaway.prize)}</dd>
              </div>
              <div>
                <dt>Must Be Present</dt>
                <dd>
                  {parsedPlan.giveaway.mustBePresent == null
                    ? "—"
                    : parsedPlan.giveaway.mustBePresent
                      ? "Yes"
                      : "No"}
                </dd>
              </div>
              <div>
                <dt>Draw Date</dt>
                <dd>{display(parsedPlan.giveaway.drawDate)}</dd>
              </div>
              <div className="ops-event-studio__facts-wide">
                <dt>Rules</dt>
                <dd>{display(parsedPlan.giveaway.rules)}</dd>
              </div>
            </dl>
          </section>

          <section className="ops-event-studio__panel ops-event-studio__panel--wide" aria-label="Recommended modules">
            <h2 className="ops-event-studio__panel-title">Recommended Modules</h2>
            {model ? <p className="es-producer__model-tag">Model: {model}</p> : null}
            <div className="es-producer__chips">
              {enabledModules.length > 0 ? (
                enabledModules.map((label) => (
                  <span key={label} className="es-producer__chip es-producer__chip--on">
                    {label}
                  </span>
                ))
              ) : (
                <span className="es-producer__chip">None flagged</span>
              )}
            </div>
          </section>

          {(parsedPlan.missingQuestions.length > 0 || parsedPlan.needsReview.length > 0) && (
            <section
              className="ops-event-studio__panel ops-event-studio__panel--wide es-producer__review"
              aria-label="Review indicators"
            >
              <h2 className="ops-event-studio__panel-title">Confidence &amp; Review</h2>
              {parsedPlan.needsReview.length > 0 ? (
                <div className="es-producer__list-block">
                  <h3>Needs review</h3>
                  <ul>
                    {parsedPlan.needsReview.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {parsedPlan.missingQuestions.length > 0 ? (
                <div className="es-producer__list-block">
                  <h3>Missing questions</h3>
                  <ul>
                    {parsedPlan.missingQuestions.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>
          )}
        </div>
      ) : null}

      <section className="ops-event-studio__panel ops-event-studio__panel--wide es-producer__drafts" aria-label="Saved drafts">
        <h2 className="ops-event-studio__panel-title">Saved Drafts</h2>
        {drafts.length === 0 ? (
          <p className="ops-event-studio__hint">No drafts yet. Analyze an event and save a draft plan.</p>
        ) : (
          <ul className="es-producer__draft-list">
            {drafts.map((draft) => (
              <li key={draft.id} className="es-producer__draft-item">
                <div>
                  <strong>{display(draft.parsedPlan.eventTitle, "Untitled draft")}</strong>
                  <p>{draft.sourceText.slice(0, 140)}{draft.sourceText.length > 140 ? "…" : ""}</p>
                </div>
                <div className="es-producer__draft-meta">
                  <span>{new Date(draft.createdAt).toLocaleString()}</span>
                  <span>{draft.model}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
