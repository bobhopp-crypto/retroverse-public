"use client";

import { useMemo } from "react";

import { renderLivePreview } from "@/lib/ops/creative-lab/prompt-renderer";
import type { CreativeLabPresetFile, CreativeLabProjectFile } from "@/lib/ops/creative-lab/types";

type Props = {
  project: CreativeLabProjectFile;
  activePreset?: CreativeLabPresetFile | null;
};

export function PromptPreviewPanel(props: Props) {
  const { project, activePreset } = props;
  const text = useMemo(
    () => renderLivePreview(project, activePreset ?? null),
    [project, activePreset],
  );

  return (
    <section className="cl-prompt-preview">
      <header className="cl-prompt-preview__head">
        <h3>Prompt preview</h3>
        <p className="ops-dim">Live provider-neutral prompt — updates as metadata and styles change.</p>
      </header>
      <pre className="cl-prompt-preview__text">{text}</pre>
    </section>
  );
}
