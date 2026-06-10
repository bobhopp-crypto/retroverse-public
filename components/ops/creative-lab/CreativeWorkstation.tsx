"use client";

import { useMemo, useState } from "react";

import { deriveWorkstationStatus } from "@/lib/ops/creative-lab/workstation-state";
import type { CreativeLabProjectFile } from "@/lib/ops/creative-lab/types";
import { VISUAL_WORLDS, type VisualWorldId } from "@/lib/ops/creative-lab/visual-worlds";

import type { BrowserSelection } from "./WorkstationBrowser";
import { WorkstationBrowser } from "./WorkstationBrowser";
import { WorkstationInspector } from "./WorkstationInspector";
import { WorkstationSidebar } from "./WorkstationSidebar";
import { WorkstationStatusStrip } from "./WorkstationStatusStrip";
import { VisualWorldCard } from "./VisualWorldCard";
import { YearTokenInput } from "./YearTokenInput";

type ProjectRow = { id: string; name: string; event: string; updatedAt: string };

type Props = {
  project: CreativeLabProjectFile | null;
  projects: ProjectRow[];
  projectId: string | null;
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
  onOpenProject: (id: string) => void;
  onNewProject: () => void;
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
    projects,
    projectId,
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
    onOpenProject,
    onNewProject,
    onGenerateFrontConcepts,
    onSelectFront,
    onLockFront,
    onGenerateBacks,
    onSelectBack,
    onExportPackage,
    onOpenAdvanced,
  } = props;

  const [setupOpen, setSetupOpen] = useState(true);
  const [inspectTarget, setInspectTarget] = useState<BrowserSelection>(null);

  const selectedWorld = useMemo(
    () => VISUAL_WORLDS.find((w) => w.id === selectedVisualWorldId) ?? null,
    [selectedVisualWorldId],
  );

  const status = useMemo(() => deriveWorkstationStatus(project), [project]);

  const eventReady = Boolean(event.trim() && venue.trim() && date.trim() && years.length > 0);
  const worldReady = Boolean(selectedVisualWorldId);
  const canGenerateFronts = eventReady && worldReady;
  const frontLocked = project?.frontLocked === true;
  const hasFronts = Boolean(project && project.generatedPrompts.some((p) => (p.passSide ?? "front") !== "back"));
  const hasBacks = Boolean(project?.backVariationSetId);
  const canLockFront = Boolean(project?.selectedConceptPromptId && !frontLocked);
  const canGenerateBacks = frontLocked && !hasBacks;
  const canExport = status.exportStatus === "Ready";

  return (
    <div className="cl-ws">
      <WorkstationStatusStrip status={status} />

      <div className="cl-ws__body">
        <WorkstationSidebar
          projects={projects}
          activeProjectId={projectId}
          busy={busy}
          onOpenProject={onOpenProject}
          onNewProject={onNewProject}
        />

        <div className="cl-ws__center">
          <div className="cl-ws__actions" aria-label="Workflow actions">
            <button
              type="button"
              className="cl-ws__action-btn"
              disabled={busy || !canGenerateFronts || frontLocked}
              onClick={onGenerateFrontConcepts}
            >
              {busy ? "Working…" : "Generate Fronts"}
            </button>
            <button
              type="button"
              className="cl-ws__action-btn"
              disabled={busy || !canLockFront}
              onClick={onLockFront}
            >
              Lock Front
            </button>
            <button
              type="button"
              className="cl-ws__action-btn"
              disabled={busy || !canGenerateBacks}
              onClick={onGenerateBacks}
            >
              Generate Backs
            </button>
            <button
              type="button"
              className="cl-ws__action-btn cl-ws__action-btn--export"
              disabled={busy || !canExport}
              onClick={onExportPackage}
            >
              Export
            </button>
            <button type="button" className="cl-ws__action-link" onClick={onOpenAdvanced}>
              Advanced →
            </button>
          </div>

          <details className="cl-ws__setup" open={setupOpen} onToggle={(e) => setSetupOpen(e.currentTarget.open)}>
            <summary className="cl-ws__setup-summary">Event & visual world setup</summary>
            <div className="cl-ws__setup-body">
              <div className="cl-ws__setup-fields">
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
              {selectedWorld ? (
                <p className="cl-ws__setup-world ops-dim">
                  Visual world: <strong>{selectedWorld.title}</strong>
                </p>
              ) : null}
              <div className="cl-ws__world-strip">
                {VISUAL_WORLDS.map((world) => (
                  <VisualWorldCard
                    key={world.id}
                    world={world}
                    selected={selectedVisualWorldId === world.id}
                    onSelect={() => onVisualWorldSelect(world.id)}
                  />
                ))}
              </div>
            </div>
          </details>

          {project && hasFronts ? (
            <WorkstationBrowser
              project={project}
              busy={busy}
              selection={inspectTarget}
              onSelect={setInspectTarget}
              onSelectFront={onSelectFront}
              onSelectBack={onSelectBack}
            />
          ) : (
            <section className="cl-ws__browser cl-ws__browser--empty">
              <p className="ops-dim">
                {canGenerateFronts
                  ? "Generate fronts to fill the asset browser."
                  : "Complete event details and pick a visual world."}
              </p>
            </section>
          )}
        </div>

        <WorkstationInspector project={project} target={inspectTarget} />
      </div>
    </div>
  );
}
