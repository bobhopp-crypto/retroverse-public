"use client";

import { useMemo, useState } from "react";

import { WORKSTATION_FEATURED_PRESET_IDS, WORKSTATION_OUTPUTS } from "@/lib/ops/creative-lab/workstation-presets";
import { STYLE_CATALOG } from "@/lib/ops/creative-lab/style-catalog";
import { styleById } from "@/lib/ops/creative-lab/style-catalog";
import type { CreativeLabPresetFile, CreativeLabProjectFile, StyleSelection } from "@/lib/ops/creative-lab/types";

import { ConceptDeck } from "./ConceptDeck";
import { StyleWeightEditor, weightedStylesSummary } from "./StyleWeightEditor";
import { StyleBoard, type StyleBoardMode } from "./StyleBoard";

type Props = {
  presets: CreativeLabPresetFile[];
  project: CreativeLabProjectFile | null;
  styleSelection: StyleSelection | null;
  busy: boolean;
  event: string;
  venue: string;
  date: string;
  years: string;
  outputId: string;
  selectedPresetId: string | null;
  showAdvancedOutputs: boolean;
  showStyleAdvanced: boolean;
  onEventChange: (v: string) => void;
  onVenueChange: (v: string) => void;
  onDateChange: (v: string) => void;
  onYearsChange: (v: string) => void;
  onOutputChange: (id: string) => void;
  onPresetSelect: (id: string) => void;
  onToggleAdvancedOutputs: () => void;
  onToggleStyleAdvanced: () => void;
  onGenerate: () => void;
  onStyleChange: (selection: CreativeLabProjectFile["styleSelection"]) => void;
  onOpenAdvanced: () => void;
};

function presetThumbHue(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) % 360;
  return hash;
}

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
    showAdvancedOutputs,
    showStyleAdvanced,
    onEventChange,
    onVenueChange,
    onDateChange,
    onYearsChange,
    onOutputChange,
    onPresetSelect,
    onToggleAdvancedOutputs,
    onToggleStyleAdvanced,
    onGenerate,
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
  const output = WORKSTATION_OUTPUTS.find((o) => o.id === outputId) ?? WORKSTATION_OUTPUTS[0];
  const canGenerate = Boolean(event.trim() && venue.trim() && date.trim() && selectedPresetId && output.available);

  const visibleOutputs = WORKSTATION_OUTPUTS.filter((o) => !o.advanced || showAdvancedOutputs);

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
            <input
              className="cl-desk__input"
              value={event}
              placeholder="Sunday Nights"
              onChange={(e) => onEventChange(e.target.value)}
            />
          </label>
          <label className="cl-desk__field">
            <span>Venue</span>
            <input
              className="cl-desk__input"
              value={venue}
              placeholder="The Main Pub"
              onChange={(e) => onVenueChange(e.target.value)}
            />
          </label>
          <label className="cl-desk__field">
            <span>Date</span>
            <input
              className="cl-desk__input"
              value={date}
              placeholder="June 15, 2026"
              onChange={(e) => onDateChange(e.target.value)}
            />
          </label>
          <label className="cl-desk__field">
            <span>Years</span>
            <input
              className="cl-desk__input"
              value={years}
              placeholder="1967, 1978, 1992"
              onChange={(e) => onYearsChange(e.target.value)}
            />
          </label>
        </div>
      </section>

      <section className="cl-desk__step">
        <p className="cl-desk__step-label">Step 3 — Visual style</p>
        <div className="cl-desk__preset-grid">
          {featuredPresets.map((preset) => {
            const hue = presetThumbHue(preset.id);
            const on = selectedPresetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                className={`cl-desk__preset-card${on ? " cl-desk__preset-card--on" : ""}`}
                onClick={() => onPresetSelect(preset.id)}
              >
                <div
                  className="cl-desk__preset-thumb"
                  style={{
                    background: `linear-gradient(135deg, hsl(${hue} 58% 65%), hsl(${(hue + 50) % 360} 45% 42%))`,
                  }}
                  aria-hidden
                />
                <span className="cl-desk__preset-name">{preset.name}</span>
                <span className="cl-desk__preset-desc">{preset.description}</span>
              </button>
            );
          })}
        </div>
        <button type="button" className="cl-desk__link-btn" onClick={onToggleStyleAdvanced}>
          {showStyleAdvanced ? "Hide style editing" : "Advanced — edit style weights"}
        </button>
        {showStyleAdvanced && styleSelection ? (
          <div className="cl-desk__style-advanced">
            <p className="ops-dim">{weightedStylesSummary(styleSelection)}</p>
            <div className="cl-style-boards">
              <StyleBoard
                category="credential"
                title="Credential"
                styles={STYLE_CATALOG.credential}
                selection={styleSelection}
                mode={styleMode}
                onChange={onStyleChange}
              />
              <StyleBoard
                category="illustration"
                title="Illustration"
                styles={STYLE_CATALOG.illustration}
                selection={styleSelection}
                mode={styleMode}
                onChange={onStyleChange}
              />
              <StyleBoard
                category="color"
                title="Color"
                styles={STYLE_CATALOG.color}
                selection={styleSelection}
                mode={styleMode}
                onChange={onStyleChange}
              />
              <StyleWeightEditor
                category="density"
                title="Density"
                styles={STYLE_CATALOG.density}
                selection={styleSelection}
                onChange={onStyleChange}
              />
            </div>
          </div>
        ) : null}
        {selectedPreset ? (
          <p className="cl-desk__preset-meta">
            {styleById(selectedPreset.credentialStyle)?.label} ·{" "}
            {styleById(selectedPreset.illustrationStyle)?.label} ·{" "}
            {styleById(selectedPreset.colorStyle)?.label}
          </p>
        ) : null}
      </section>

      <section className="cl-desk__step cl-desk__step--action">
        <button
          type="button"
          className="cl-desk__generate-btn"
          disabled={busy || !canGenerate}
          onClick={onGenerate}
        >
          GENERATE CONCEPTS
        </button>
        {!canGenerate ? (
          <p className="cl-desk__hint ops-dim">Fill event, venue, date, and pick a visual style.</p>
        ) : null}
      </section>

      {project?.generatedPrompts.length ? <ConceptDeck prompts={project.generatedPrompts} /> : null}

      <footer className="cl-desk__footer">
        <button type="button" className="cl-desk__advanced-link" onClick={onOpenAdvanced}>
          Advanced Workshop →
        </button>
      </footer>
    </div>
  );
}
