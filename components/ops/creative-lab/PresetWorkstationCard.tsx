"use client";

import { presetCardVisual } from "@/lib/ops/creative-lab/preset-visuals";
import type { CreativeLabPresetFile } from "@/lib/ops/creative-lab/types";

type Props = {
  preset: CreativeLabPresetFile;
  selected: boolean;
  onSelect: () => void;
};

const LAYOUT_LABELS = {
  "pub-night": "Pub Night",
  broadcast: "Broadcast",
  collector: "Collector",
  festival: "Festival",
  stadium: "Stadium",
  bingo: "Game Night",
} as const;

export function PresetWorkstationCard(props: Props) {
  const { preset, selected, onSelect } = props;
  const visual = presetCardVisual(preset);

  return (
    <button
      type="button"
      className={`cl-preset-ws${selected ? " cl-preset-ws--on" : ""}`}
      onClick={onSelect}
    >
      {selected ? <span className="cl-preset-ws__selected">✓ SELECTED</span> : null}
      <div className={`cl-preset-ws__mock cl-preset-ws__mock--${visual.layout}`} aria-hidden>
        <div className="cl-preset-ws__mock-pass" style={{ borderColor: visual.palette[2] }}>
          <div className="cl-preset-ws__mock-header" style={{ background: visual.palette[0] }}>
            <span style={{ color: visual.palette[3] }}>{LAYOUT_LABELS[visual.layout]}</span>
          </div>
          <div className="cl-preset-ws__mock-body" style={{ background: visual.palette[1] }}>
            <div className="cl-preset-ws__mock-swatch-row">
              {visual.palette.map((c) => (
                <span key={c} className="cl-preset-ws__mock-swatch" style={{ background: c }} />
              ))}
            </div>
          </div>
          <div className="cl-preset-ws__mock-footer" style={{ background: visual.palette[3] }} />
        </div>
      </div>
      <span className="cl-preset-ws__name">{preset.name}</span>
      <div className="cl-preset-ws__tags">
        <span className="cl-preset-ws__tag">{visual.credentialLabel}</span>
        <span className="cl-preset-ws__tag">{visual.illustrationLabel}</span>
        <span className="cl-preset-ws__tag">{visual.colorLabel}</span>
      </div>
      <span className="cl-preset-ws__use">{visual.intendedUse}</span>
    </button>
  );
}
