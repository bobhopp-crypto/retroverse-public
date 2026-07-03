"use client";

import type { CreativeLabProjectFile } from "@/lib/ops/creative-lab/types";

type Props = {
  project: CreativeLabProjectFile | null;
  busy: boolean;
  onSave: () => void;
  onRevealProject: () => void;
  onRevealExports: () => void;
  onExportPackage: () => void;
  onExportFinals: () => void;
};

export function ProjectToolbar(props: Props) {
  const {
    project,
    busy,
    onSave,
    onRevealProject,
    onRevealExports,
    onExportPackage,
    onExportFinals,
  } = props;

  return (
    <section className="cl-project-toolbar" aria-label="Project toolbar">
      <div className="cl-project-toolbar__meta">
        <strong>{project?.name ?? "No project open"}</strong>
        {project ? (
          <span className="ops-dim">
            {project.folderSlug} · {project.assets.length} assets
          </span>
        ) : (
          <span className="ops-dim">Open or create a project to enable storage actions.</span>
        )}
      </div>
      <div className="cl-project-toolbar__actions">
        <button type="button" className="ops-btn ops-btn--ok" disabled={!project || busy} onClick={onSave}>
          Save Project
        </button>
        <button type="button" className="ops-btn" disabled={!project || busy} onClick={onRevealProject}>
          Reveal Project Folder
        </button>
        <button type="button" className="ops-btn" disabled={!project || busy} onClick={onRevealExports}>
          Open Exports Folder
        </button>
        <button type="button" className="ops-btn" disabled={!project || busy} onClick={onExportPackage}>
          Export Project Package
        </button>
        <button type="button" className="ops-btn" disabled={!project || busy} onClick={onExportFinals}>
          Export Finals
        </button>
      </div>
    </section>
  );
}
