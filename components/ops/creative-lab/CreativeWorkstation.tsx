"use client";

import { useMemo, useState } from "react";

import { ARTIFACT_TYPES, artifactTypeById, type ArtifactTypeId } from "@/lib/ops/creative-lab/artifact-types";
import { WORKSTATION_FEATURED_PRESET_IDS, WORKSTATION_OUTPUTS } from "@/lib/ops/creative-lab/workstation-presets";
import { STYLE_CATALOG } from "@/lib/ops/creative-lab/style-catalog";
import type { CreativeLabPresetFile, CreativeLabProjectFile, StyleSelection } from "@/lib/ops/creative-lab/types";

import { ConceptDeck } from "./ConceptDeck";
import { PresetWorkstationCard } from "./PresetWorkstationCard";
import { StyleWeightEditor, weightedStylesSummary } from "./StyleWeightEditor";
import { StyleBoard, type StyleBoardMode } from "./StyleBoard";
import { YearTokenInput } from "./YearTokenInput";

type Props = {
  presets: CreativeLabPresetFile[];
  project: CreativeLabProjectFile | null;
  styleSelection: StyleSelection | null;
  busy: boolean;
  event: string;
  venue: string;
  date: string;
  years: number[];
  outputId: string;
  selectedPresetId: string | null;
  artifactTypeId: ArtifactTypeId;
  showAdvancedOutputs: boolean;
  showStyleAdvanced: boolean;
  onEventChange: (v: string) => void;
  onVenueChange: (v: string) => void;
  onDateChange: (v: string) => void;
  onYearsChange: (years: number[]) => void;
  onOutputChange: (id: string) => void;
  onPresetSelect: (id: string) => void;
  onArtifactTypeChange: (id: ArtifactTypeId) => void;
  onToggleAdvancedOutputs: () => void;
  onToggleStyleAdvanced: () => void;
  onGenerate: () => void;
  onSelectWinner: (promptId: string) => void;
  onGenerateRefinement: () => void;
  onSelectVariation: (index: number) => void;
  onStyleChange: (selection: CreativeLabProjectFile["styleSelection"]) => void;
  onOpenAdvanced: () => void;
};

export function CreativeWorkstation(props: Props) {
  const {
    presets,
    project,
    styleSelection,
    busy,
    event,
    venue,
    date,
    years,
    outputId,
    selectedPresetId,
    artifactTypeId,
    showAdvancedOutputs,
    showStyleAdvanced,
    onEventChange,
    onVenueChange,
    onDateChange,
    onYearsChange,
    onOutputChange,
    onPresetSelect,
    onArtifactTypeChange,
    onToggleAdvancedOutputs,
    onToggleStyleAdvanced,
    onGenerate,
    onSelectWinner,
    onGenerateRefinement,
    onSelectVariation,
    onStyleChange,
    onOpenAdvanced,
  } = props;

  const [styleMode] = useState<StyleBoardMode>("simple");

  const featuredPresets = useMemo(
    () =>
      WORKSTATION_FEATURED_PRESET_IDS.map((id) => presets.find((p) => p.id === id)).filter(
        (p): p is CreativeLabPresetFile => p != null,
      ),
    [presets],
  );

  const selectedPreset = featuredPresets.find((p) => p.id === selectedPresetId) ?? null;
  const selectedArtifact = artifactTypeById(artifactTypeId);
  const output = WORKSTATION_OUTPUTS.find((o) => o.id === outputId) ?? WORKSTATION_OUTPUTS[0];
  const canGenerate = Boolean(
    event.trim() && venue.trim() && date.trim() && years.length > 0 && selectedPresetId && artifactTypeId && output.available,
  );

  const visibleOutputs = WORKSTATION_OUTPUTS.filter((o) => !o.advanced || showAdvancedOutputs);
  const hasConcepts = Boolean(project?.generatedPrompts.length);

  return (
    <div className="cl-desk">
      <header className="cl-desk__masthead">
        <p className="cl-desk__kicker">Retroverse Creative Control</p>
        <h1 className="cl-desk__title">What are you making tonight?</h1>
      </header>

      <section className="cl-desk__step">
        <p className="cl-desk__step-label">Step 1 — Output</p>
        <div className="cl-desk__output-grid" role="group" aria-label="Output type">
          {visibleOutputs.map((o) => (
            <button
              key={o.id}
              type="button"
              className={`cl-desk__output-btn${outputId === o.id ? " cl-desk__output-btn--on" : ""}${!o.available ? " cl-desk__output-btn--soon" : ""}`}
              disabled={!o.available}
              onClick={() => onOutputChange(o.id)}
            >
              <span className="cl-desk__output-label">{o.label}</span>
              {!o.available ? <span className="cl-desk__output-soon">Coming soon</span> : null}
            </button>
          ))}
        </div>
        <button type="button" className="cl-desk__link-btn" onClick={onToggleAdvancedOutputs}>
          {showAdvancedOutputs ? "Hide card & magazine" : "Advanced outputs (Card, Magazine)"}
        </button>
      </section>

      <section className="cl-desk__step">
        <p className="cl-desk__step-label">Step 2 — Event</p>
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
        <p className="cl-desk__step-label">Step 3 — Visual style</p>
        <div className="cl-desk__preset-grid">
          {featuredPresets.map((preset) => (
            <PresetWorkstationCard
              key={preset.id}
              preset={preset}
              selected={selectedPresetId === preset.id}
              onSelect={() => onPresetSelect(preset.id)}
            />
          ))}
        </div>
        <button type="button" className="cl-desk__link-btn" onClick={onToggleStyleAdvanced}>
          {showStyleAdvanced ? "Hide style editing" : "Advanced — edit style weights"}
        </button>
        {showStyleAdvanced && styleSelection ? (
          <div className="cl-desk__style-advanced">
            <p className="ops-dim">{weightedStylesSummary(styleSelection)}</p>
            <div className="cl-style-boards">
              <StyleBoard category="credential" title="Credential" styles={STYLE_CATALOG.credential} selection={styleSelection} mode={styleMode} onChange={onStyleChange} />
              <StyleBoard category="illustration" title="Illustration" styles={STYLE_CATALOG.illustration} selection={styleSelection} mode={styleMode} onChange={onStyleChange} />
              <StyleBoard category="color" title="Color" styles={STYLE_CATALOG.color} selection={styleSelection} mode={styleMode} onChange={onStyleChange} />
              <StyleWeightEditor category="density" title="Density" styles={STYLE_CATALOG.density} selection={styleSelection} onChange={onStyleChange} />
            </div>
          </div>
        ) : null}
      </section>

      <section className="cl-desk__step">
        <p className="cl-desk__step-label">Step 4 — Artifact type</p>
        <div className="cl-desk__artifact-grid" role="group" aria-label="Artifact type">
          {ARTIFACT_TYPES.map((artifact) => {
            const on = artifactTypeId === artifact.id;
            return (
              <button
                key={artifact.id}
                type="button"
                className={`cl-desk__artifact-btn${on ? " cl-desk__artifact-btn--on" : ""}`}
                onClick={() => onArtifactTypeChange(artifact.id)}
              >
                {on ? <span className="cl-desk__artifact-selected">✓ SELECTED</span> : null}
                <span className="cl-desk__artifact-label">{artifact.label}</span>
                <span className="cl-desk__artifact-desc">{artifact.description}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="cl-desk__step cl-desk__step--action">
        {selectedPreset || selectedArtifact ? (
          <div className={`cl-desk__ready${canGenerate ? " cl-desk__ready--armed" : ""}`}>
            <p className="cl-desk__ready-kicker">{canGenerate ? "✓ READY TO GENERATE" : "Selection"}</p>
            {selectedPreset ? (
              <p className="cl-desk__ready-line">
                <strong>Selected Preset:</strong> {selectedPreset.name}
              </p>
            ) : null}
            <p className="cl-desk__ready-line">
              <strong>Selected Artifact:</strong> {selectedArtifact.shortLabel}
            </p>
          </div>
        ) : null}
        <button
          type="button"
          className={`cl-desk__generate-btn${canGenerate ? " cl-desk__generate-btn--armed" : ""}`}
          disabled={busy || !canGenerate}
          onClick={onGenerate}
        >
          GENERATE CONCEPTS
        </button>
        {!canGenerate ? (
          <p className="cl-desk__hint ops-dim">Fill event, venue, date, years, preset, and artifact type.</p>
        ) : null}
      </section>

      {hasConcepts && project ? (
        <ConceptDeck
          prompts={project.generatedPrompts}
          project={project}
          busy={busy}
          onSelectWinner={onSelectWinner}
          onGenerateRefinement={onGenerateRefinement}
          onSelectVariation={onSelectVariation}
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
