"use client";

import { useState } from "react";

import type { PassCreativeBrief } from "@/lib/bobos/project-zero/creative-brief";
import {
  PASS_COLOR_SCHEME_OPTIONS,
  PASS_STYLE_OPTIONS,
  type PassColorSchemeId,
  type PassStyleId,
} from "@/lib/bobos/project-zero/creative-brief";

import { PassTextPreview } from "./PassTextPreview";

export type RvbrEraOption = { slug: string; name: string; years: string };

type Props = {
  brief: PassCreativeBrief;
  eras: RvbrEraOption[];
  onChange: (brief: PassCreativeBrief) => void;
};

/**
 * Event Information — the simplified production brief. Three text fields plus a Style
 * and Color Scheme dropdown; everything implementation-flavored (era selector, notes,
 * variation toggles) lives behind Advanced. A live typography preview shows where each
 * field lands on the finished pass.
 */
export function PassCreativeBrief({ brief, eras, onChange }: Props) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const eraOptions =
    eras.length > 0 ? eras : [{ slug: brief.eraSlug, name: brief.eraSlug, years: "" }];

  function set<K extends keyof PassCreativeBrief>(key: K, value: PassCreativeBrief[K]) {
    onChange({ ...brief, [key]: value });
  }

  return (
    <section className="pzw-brief" aria-label="Event Information">
      <div className="pzw-brief__head">
        <h2 className="ps-step__title">1 · Event Information</h2>
        <p className="pzw-brief__hint">What are you making passes for?</p>
      </div>

      <div className="pzw-brief__layout">
        <div className="pzw-brief__fields">
          <div className="pzw-brief__grid">
            <label className="pzw-brief__field">
              <span>Event</span>
              <input value={brief.event} onChange={(e) => set("event", e.target.value)} />
            </label>
            <label className="pzw-brief__field">
              <span>Venue</span>
              <input value={brief.venue} onChange={(e) => set("venue", e.target.value)} />
            </label>
            <label className="pzw-brief__field">
              <span>Date</span>
              <input value={brief.date} onChange={(e) => set("date", e.target.value)} />
            </label>
            <label className="pzw-brief__field">
              <span>Style</span>
              <select value={brief.style} onChange={(e) => set("style", e.target.value as PassStyleId)}>
                {PASS_STYLE_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="pzw-brief__field">
              <span>Color Scheme</span>
              <select
                value={brief.colorScheme}
                onChange={(e) => set("colorScheme", e.target.value as PassColorSchemeId)}
              >
                {PASS_COLOR_SCHEME_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            {brief.colorScheme === "custom" ? (
              <label className="pzw-brief__field">
                <span>Custom Colors</span>
                <input
                  value={brief.customColors}
                  placeholder="e.g. deep teal with copper accents"
                  onChange={(e) => set("customColors", e.target.value)}
                />
              </label>
            ) : null}
          </div>

          <button
            type="button"
            className="pzw-brief__advanced-toggle"
            onClick={() => setShowAdvanced((v) => !v)}
            aria-expanded={showAdvanced}
          >
            {showAdvanced ? "Hide Advanced" : "Advanced"}
          </button>

          {showAdvanced ? (
            <div className="pzw-brief__advanced">
              <div className="pzw-brief__grid">
                <label className="pzw-brief__field">
                  <span>Series</span>
                  <input
                    value={brief.series}
                    placeholder="e.g. Retro Sundays"
                    onChange={(e) => set("series", e.target.value)}
                  />
                </label>
                <label className="pzw-brief__field">
                  <span>Theme</span>
                  <input value={brief.theme} onChange={(e) => set("theme", e.target.value)} />
                </label>
                <label className="pzw-brief__field">
                  <span>Era</span>
                  <select value={brief.eraSlug} onChange={(e) => set("eraSlug", e.target.value)}>
                    {eraOptions.map((era) => (
                      <option key={era.slug} value={era.slug}>
                        {era.years ? `${era.years} — ${era.name}` : era.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="pzw-brief__field pzw-brief__field--notes">
                <span>Creative Notes</span>
                <textarea
                  value={brief.notes}
                  rows={2}
                  placeholder="Extra direction — mood, motifs, things to lean into or avoid."
                  onChange={(e) => set("notes", e.target.value)}
                />
              </label>

              <div className="pzw-brief__toggles">
                <label className="pzw-brief__toggle">
                  <input
                    type="checkbox"
                    checked={brief.avoidEraTropes}
                    onChange={(e) => set("avoidEraTropes", e.target.checked)}
                  />
                  <span>Avoid Common Era Tropes</span>
                </label>
                <label className="pzw-brief__toggle">
                  <input
                    type="checkbox"
                    checked={brief.maximizeVariation}
                    onChange={(e) => set("maximizeVariation", e.target.checked)}
                  />
                  <span>Maximize Variation</span>
                </label>
              </div>
            </div>
          ) : null}
        </div>

        <PassTextPreview brief={brief} />
      </div>
    </section>
  );
}
