"use client";

import { useMemo } from "react";

import type { CreativeLabProjectFile } from "@/lib/ops/creative-lab/types";
import { VISUAL_WORLDS, type VisualWorldId } from "@/lib/ops/creative-lab/visual-worlds";

import { ConceptDeck } from "./ConceptDeck";
import { VisualWorldCard } from "./VisualWorldCard";
import { YearTokenInput } from "./YearTokenInput";

type Props = {
  project: CreativeLabProjectFile | null;
  busy: boolean;
  event: string;
  venue: string;
  date: string;
  years: number[];
  selectedVisualWorldId: VisualWorldId | null;
  onEventChange: (v: string) => void;
  onVenueChange: (v: string) => void;
  onDateChange: (v: string) => void;
  onYearsChange: (years: number[]) => void;
  onVisualWorldSelect: (id: VisualWorldId) => void;
  onGenerateFrontConcepts: () => void;
  onSelectFront: (promptId: string) => void;
  onLockFront: () => void;
  onGenerateBacks: () => void;
  onSelectBack: (promptId: string) => void;
  onExportPackage: () => void;
  onOpenAdvanced: () => void;
};

export function CreativeWorkstation(props: Props) {
  const {
    project,
    busy,
    event,
    venue,
    date,
    years,
    selectedVisualWorldId,
    onEventChange,
    onVenueChange,
    onDateChange,
    onYearsChange,
    onVisualWorldSelect,
    onGenerateFrontConcepts,
    onSelectFront,
    onLockFront,
    onGenerateBacks,
    onSelectBack,
    onExportPackage,
    onOpenAdvanced,
  } = props;

  const selectedWorld = useMemo(
    () => VISUAL_WORLDS.find((w) => w.id === selectedVisualWorldId) ?? null,
    [selectedVisualWorldId],
  );

  const eventReady = Boolean(event.trim() && venue.trim() && date.trim() && years.length > 0);
  const worldReady = Boolean(selectedVisualWorldId);
  const canGenerate = eventReady && worldReady;
  const hasConcepts = Boolean(project?.generatedPrompts.length);
  const frontLocked = project?.frontLocked === true;

  return (
    <div className="cl-desk">
      <header className="cl-desk__masthead">
        <p className="cl-desk__kicker">Retroverse Creative Lab</p>
        <h1 className="cl-desk__title">Front approval · back generation</h1>
      </header>

      <section className="cl-desk__step">
        <p className="cl-desk__step-label">Step 1 — Confirm event</p>
        <div className="cl-desk__event-panel">
          <label className="cl-desk__field">
            <span>Event</span>
            <input className="cl-desk__input" value={event} onChange={(e) => onEventChange(e.target.value)} />
          </label>
          <label className="cl-desk__field">
            <span>Venue</span>
            <input className="cl-desk__input" value={venue} onChange={(e) => onVenueChange(e.target.value)} />
          </label>
          <label className="cl-desk__field">
            <span>Date</span>
            <input className="cl-desk__input" value={date} onChange={(e) => onDateChange(e.target.value)} />
          </label>
          <div className="cl-desk__field cl-desk__field--years">
            <span>Years</span>
            <YearTokenInput years={years} onChange={onYearsChange} />
          </div>
        </div>
      </section>

      <section className="cl-desk__step">
        <p className="cl-desk__step-label">Step 2 — Choose one visual world</p>
        <div className="cl-world-grid">
          {VISUAL_WORLDS.map((world) => (
            <VisualWorldCard
              key={world.id}
              world={world}
              selected={selectedVisualWorldId === world.id}
              onSelect={() => onVisualWorldSelect(world.id)}
            />
          ))}
        </div>
      </section>

      <section className="cl-desk__step cl-desk__step--action">
        {selectedWorld ? (
          <div className={`cl-desk__ready${canGenerate ? " cl-desk__ready--armed" : ""}`}>
            <p className="cl-desk__ready-kicker">{canGenerate ? "✓ READY TO GENERATE" : "Almost there"}</p>
            <p className="cl-desk__ready-line">
              <strong>Visual world:</strong> {selectedWorld.title}
            </p>
            <p className="cl-desk__ready-line">
              <strong>Event:</strong> {event || "—"} · {date || "—"}
            </p>
          </div>
        ) : null}
        <button
          type="button"
          className={`cl-desk__generate-btn${canGenerate ? " cl-desk__generate-btn--armed" : ""}`}
          disabled={busy || !canGenerate || frontLocked}
          onClick={onGenerateFrontConcepts}
        >
          {busy ? "GENERATING FRONTS…" : "GENERATE FRONT CONCEPTS"}
        </button>
        {!canGenerate ? (
          <p className="cl-desk__hint ops-dim">Confirm event details and pick one visual world.</p>
        ) : frontLocked ? (
          <p className="cl-desk__hint ops-dim">Front is locked — regenerate only from Advanced Workshop.</p>
        ) : busy ? (
          <p className="cl-desk__hint ops-dim">Creating four illustrated front concepts — this takes a minute.</p>
        ) : (
          <p className="cl-desk__hint ops-dim">Step 3 — four front concepts only. Backs come after lock.</p>
        )}
      </section>

      {hasConcepts && project ? (
        <ConceptDeck
          prompts={project.generatedPrompts}
          project={project}
          busy={busy}
          onSelectFront={onSelectFront}
          onLockFront={onLockFront}
          onGenerateBacks={onGenerateBacks}
          onSelectBack={onSelectBack}
          onExportPackage={onExportPackage}
        />
      ) : null}

      <footer className="cl-desk__footer">
        <button type="button" className="cl-desk__advanced-link" onClick={onOpenAdvanced}>
          Advanced Workshop →
        </button>
      </footer>
    </div>
  );
}
