"use client";

import { strategyById } from "@/lib/ops/creative-lab/concept-strategies";
import { presetStyleSummaryLabel } from "@/lib/ops/creative-lab/preset-display";
import { styleById } from "@/lib/ops/creative-lab/style-catalog";
import type { CreativeLabPresetFile } from "@/lib/ops/creative-lab/types";

type Props = {
  presets: CreativeLabPresetFile[];
  projectName?: string;
  busy: boolean;
  hasProject: boolean;
  onApply: (preset: CreativeLabPresetFile) => void;
  onDuplicate: (preset: CreativeLabPresetFile) => void;
  onSaveCustom: (preset: CreativeLabPresetFile) => void;
};

function thumbHue(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) % 360;
  return hash;
}

function styleLabel(id: string): string {
  return styleById(id)?.label ?? id;
}

export function PresetGallery(props: Props) {
  const { presets, projectName, busy, hasProject, onApply, onDuplicate, onSaveCustom } = props;

  if (!presets.length) {
    return <p className="ops-dim">No presets found.</p>;
  }

  return (
    <ul className="cl-preset-gallery">
      {presets.map((preset) => {
        const hue = thumbHue(preset.id);
        const strategy = strategyById(preset.defaultConceptStrategy);
        return (
          <li key={preset.id} className="cl-preset-card">
            <div
              className="cl-preset-card__thumb"
              style={{
                background: `linear-gradient(145deg, hsl(${hue} 58% 68%), hsl(${(hue + 56) % 360} 46% 42%))`,
              }}
              aria-hidden
            >
              <span className="cl-preset-card__thumb-title">{preset.name.slice(0, 2)}</span>
              {preset.builtin ? <span className="cl-preset-card__badge">Built-in</span> : null}
            </div>
            <div className="cl-preset-card__body">
              <h3>{preset.name}</h3>
              <p className="cl-preset-card__desc">{preset.description}</p>
              <dl className="cl-preset-card__styles">
                <div>
                  <dt>Credential</dt>
                  <dd>{styleLabel(preset.credentialStyle)}</dd>
                </div>
                <div>
                  <dt>Illustration</dt>
                  <dd>{styleLabel(preset.illustrationStyle)}</dd>
                </div>
                <div>
                  <dt>Color</dt>
                  <dd>{styleLabel(preset.colorStyle)}</dd>
                </div>
                <div>
                  <dt>Density</dt>
                  <dd>{styleLabel(preset.densityStyle)}</dd>
                </div>
              </dl>
              <p className="cl-preset-card__strategy">
                Default strategy: <strong>{strategy.label}</strong>
              </p>
              <p className="cl-preset-summary">{presetStyleSummaryLabel(preset)}</p>
              <div className="cl-preset-card__actions">
                <button
                  type="button"
                  className="ops-btn ops-btn--ok"
                  disabled={!hasProject || busy}
                  onClick={() => onApply(preset)}
                >
                  Apply{projectName ? ` to ${projectName}` : ""}
                </button>
                <button type="button" className="ops-btn" disabled={busy} onClick={() => onDuplicate(preset)}>
                  Duplicate
                </button>
                <button type="button" className="ops-btn" disabled={busy} onClick={() => onSaveCustom(preset)}>
                  Save as custom
                </button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
