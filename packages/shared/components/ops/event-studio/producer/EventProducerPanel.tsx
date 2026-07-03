"use client";

import { useCallback, useEffect, useState } from "react";

import { EventProducerProductionCards } from "@/components/ops/event-studio/producer/EventProducerProductionCards";
import { createEmptyParsedPlan } from "@/lib/ops/event-studio/producer/defaults";
import type { ProductionModuleCard } from "@/lib/ops/event-studio/producer/module-status";
import type { ProducerWorkflow } from "@/lib/ops/event-studio/producer/workflow";
import type { EventProducerDraft, EventProducerParsedPlan } from "@/lib/ops/event-studio/producer/types";

function display(value: string | null | undefined, fallback = "—"): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

function displayList(values: string[], fallback = "—"): string {
  return values.length > 0 ? values.join(", ") : fallback;
}

type Props = {
  initialDrafts: EventProducerDraft[];
  initialWorkflow: ProducerWorkflow;
};

export function EventProducerPanel({ initialDrafts, initialWorkflow }: Props) {
  const [sourceText, setSourceText] = useState(initialWorkflow.sourceText ?? "");
  const [parsedPlan, setParsedPlan] = useState<EventProducerParsedPlan | null>(
    initialWorkflow.parsedPlan,
  );
  const [productionCards, setProductionCards] = useState<ProductionModuleCard[]>(initialWorkflow.cards);
  const [model, setModel] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<EventProducerDraft[]>(initialDrafts);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const refreshWorkflow = useCallback(async () => {
    const res = await fetch("/api/ops/event-studio/producer/workflow");
    const data = (await res.json()) as { workflow?: ProducerWorkflow; error?: string };
    if (res.ok && data.workflow) {
      setProductionCards(data.workflow.cards);
      if (data.workflow.parsedPlan) setParsedPlan(data.workflow.parsedPlan);
      if (data.workflow.sourceText) setSourceText(data.workflow.sourceText);
    }
  }, []);

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

  async function activatePlan(input: {
    sourceText: string;
    model: string;
    parsedPlan: EventProducerParsedPlan;
    basic?: boolean;
  }) {
    const res = await fetch("/api/ops/event-studio/producer/drafts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = (await res.json()) as {
      ok?: boolean;
      error?: string;
      workflow?: ProducerWorkflow;
    };
    if (!res.ok || !data.ok) {
      throw new Error(data.error ?? "Activation failed");
    }
    if (data.workflow) {
      setProductionCards(data.workflow.cards);
      setParsedPlan(data.workflow.parsedPlan);
    }
    await refreshDrafts();
  }

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
      await activatePlan({
        sourceText,
        model: data.model ?? "none",
        parsedPlan: data.parsedPlan,
      });
      setMessage("Analysis complete. Production plan synced to Event Studio.");
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
      await activatePlan({
        sourceText,
        model: basic ? "none" : (model ?? "none"),
        parsedPlan: basic ? createEmptyParsedPlan() : (parsedPlan ?? createEmptyParsedPlan()),
        basic,
      });
      setMessage(basic ? "Basic draft saved." : "Draft event plan saved and synced.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function loadDraft(draft: EventProducerDraft) {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      setSourceText(draft.sourceText);
      setParsedPlan(draft.parsedPlan);
      setModel(draft.model);
      const res = await fetch("/api/ops/event-studio/producer/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "activate", draftId: draft.id }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; workflow?: ProducerWorkflow };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Load draft failed");
      }
      if (data.workflow) {
        setProductionCards(data.workflow.cards);
        setParsedPlan(data.workflow.parsedPlan);
      }
      setMessage("Draft loaded as active production plan.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Load draft failed");
    } finally {
      setSaving(false);
    }
  }

  const hasPlan = parsedPlan != null;

  return (
    <div className="es-producer">
      <section
        className="ops-event-studio__panel ops-event-studio__panel--wide es-producer__intake"
        aria-label="Event description"
      >
        <h2 className="ops-event-studio__panel-title">Describe the event</h2>
        <p className="ops-event-studio__hint">
          Interview → review plan → generate assets → publish → run → archive. Paste your brief once; every
          workspace inherits the analyzed plan.
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
          <EventProducerProductionCards cards={productionCards} onStatusChange={() => void refreshWorkflow()} />

          <section className="ops-event-studio__panel es-producer__summary" aria-label="Event summary">
            <h2 className="ops-event-studio__panel-title">Review Plan</h2>
            {model ? <p className="es-producer__model-tag">Model: {model}</p> : null}
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
              <div>
                <dt>Date Summary</dt>
                <dd>{display(parsedPlan.dateSummary)}</dd>
              </div>
              <div>
                <dt>Venue</dt>
                <dd>{display(parsedPlan.venue)}</dd>
              </div>
            </dl>
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

      <section
        className="ops-event-studio__panel ops-event-studio__panel--wide es-producer__drafts"
        aria-label="Saved drafts"
      >
        <h2 className="ops-event-studio__panel-title">Saved Drafts</h2>
        {drafts.length === 0 ? (
          <p className="ops-event-studio__hint">No drafts yet. Analyze an event to start production.</p>
        ) : (
          <ul className="es-producer__draft-list">
            {drafts.map((draft) => (
              <li key={draft.id} className="es-producer__draft-item">
                <button
                  type="button"
                  className="es-producer__draft-load"
                  onClick={() => void loadDraft(draft)}
                  disabled={saving}
                >
                  <strong>{display(draft.parsedPlan.eventTitle, "Untitled draft")}</strong>
                  <p>
                    {draft.sourceText.slice(0, 140)}
                    {draft.sourceText.length > 140 ? "…" : ""}
                  </p>
                </button>
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
