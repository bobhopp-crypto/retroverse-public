"use client";

import { STYLE_CATALOG } from "@/lib/ops/creative-lab/style-catalog";
import type {
  CreativeLabModuleId,
  CreativeLabPresetFile,
  CreativeLabProjectFile,
  FinalAssetSlot,
  StyleDefinition,
} from "@/lib/ops/creative-lab/types";
import type { CreativeLabPanel } from "@/lib/ops/creative-lab/workspace/urls";

import { AssetLibrary } from "./AssetLibrary";
import { ConceptVariationsPanel } from "./ConceptVariationsPanel";
import { PresetGallery } from "./PresetGallery";
import { ProjectToolbar } from "./ProjectToolbar";
import { PromptPreviewPanel } from "./PromptPreviewPanel";
import { selectionHasWeights, StyleWeightEditor, weightedStylesSummary } from "./StyleWeightEditor";
import { StyleBoard, type StyleBoardMode } from "./StyleBoard";

const ADVANCED_PANELS: Array<{ id: CreativeLabPanel; label: string }> = [
  { id: "projects", label: "Projects" },
  { id: "styles", label: "Styles" },
  { id: "presets", label: "Presets" },
  { id: "pass-lab", label: "Pass Lab" },
  { id: "assets", label: "Assets" },
];

type ModuleInfo = {
  id: CreativeLabModuleId;
  label: string;
  description: string;
  available: boolean;
};

type Props = {
  panel: CreativeLabPanel;
  projectId: string | null;
  project: CreativeLabProjectFile | null;
  projects: Array<{ id: string; name: string; event: string; updatedAt: string }>;
  presets: CreativeLabPresetFile[];
  styles: StyleDefinition[];
  modules: ModuleInfo[];
  busy: boolean;
  activePreset: CreativeLabPresetFile | null;
  draftSelection: CreativeLabProjectFile["styleSelection"] | undefined;
  styleMode: StyleBoardMode;
  presetName: string;
  newName: string;
  newEvent: string;
  newVenue: string;
  newDate: string;
  newYears: string;
  newTheme: string;
  modulePlaceholders: ModuleInfo[];
  onNavigate: (panel: CreativeLabPanel) => void;
  onBackToDesk: () => void;
  onSaveProject: () => void;
  onRevealProject: () => void;
  onRevealExports: () => void;
  onExportPackage: () => void;
  onExportFinals: () => void;
  onCreateProject: () => void;
  onOpenProject: (id: string) => void;
  onSaveMetadata: () => void;
  onSetProject: (p: CreativeLabProjectFile) => void;
  onStyleModeChange: (mode: StyleBoardMode) => void;
  onSaveStyles: () => void;
  onSaveAsPreset: () => void;
  onPresetNameChange: (v: string) => void;
  onNewNameChange: (v: string) => void;
  onNewEventChange: (v: string) => void;
  onNewVenueChange: (v: string) => void;
  onNewDateChange: (v: string) => void;
  onNewYearsChange: (v: string) => void;
  onNewThemeChange: (v: string) => void;
  onApplyPreset: (preset: CreativeLabPresetFile) => void;
  onDuplicatePreset: (preset: CreativeLabPresetFile) => void;
  onSaveCustomPreset: (preset: CreativeLabPresetFile) => void;
  onGenerateConcept: () => void;
  onApproveAsset: (id: string) => void;
  onRejectAsset: (id: string) => void;
  onSetFinalAsset: (id: string, slot: FinalAssetSlot) => void;
};

export function AdvancedWorkshop(props: Props) {
  const p = props;

  return (
    <div className="cl-workspace cl-workspace--advanced">
      <aside className="cl-workspace__sidebar">
        <button type="button" className="cl-desk__back-btn" onClick={p.onBackToDesk}>
          ← Creative Desk
        </button>
        <p className="cl-workspace__sidebar-label">Advanced Workshop</p>
        <nav className="cl-workspace__nav" aria-label="Advanced panels">
          {ADVANCED_PANELS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`cl-workspace__nav-btn${p.panel === item.id ? " cl-workspace__nav-btn--on" : ""}`}
              onClick={() => p.onNavigate(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <p className="cl-workspace__sidebar-label">Modules</p>
        <ul className="cl-workspace__modules">
          {p.modules.map((m) => (
            <li key={m.id} className={`cl-workspace__module${m.available ? "" : " cl-workspace__module--soon"}`}>
              <span>{m.label}</span>
              {!m.available ? <em>soon</em> : null}
            </li>
          ))}
        </ul>
      </aside>

      <div className="cl-workspace__main">
        <ProjectToolbar
          project={p.project}
          busy={p.busy}
          onSave={p.onSaveProject}
          onRevealProject={p.onRevealProject}
          onRevealExports={p.onRevealExports}
          onExportPackage={p.onExportPackage}
          onExportFinals={p.onExportFinals}
        />

        {p.panel === "projects" ? (
          <div className="cl-panel">
            <header className="cl-panel__head">
              <h2>Projects</h2>
              <p className="ops-dim">Power-user project storage and metadata.</p>
            </header>
            <div className="cl-panel__grid">
              <section className="cl-card">
                <h3>New project</h3>
                <div className="cl-form">
                  <label>Name<input className="ops-input" value={p.newName} onChange={(e) => p.onNewNameChange(e.target.value)} /></label>
                  <label>Event<input className="ops-input" value={p.newEvent} onChange={(e) => p.onNewEventChange(e.target.value)} /></label>
                  <label>Venue<input className="ops-input" value={p.newVenue} onChange={(e) => p.onNewVenueChange(e.target.value)} /></label>
                  <label>Date<input className="ops-input" value={p.newDate} onChange={(e) => p.onNewDateChange(e.target.value)} /></label>
                  <label>Years<input className="ops-input" value={p.newYears} onChange={(e) => p.onNewYearsChange(e.target.value)} /></label>
                  <label>Theme<input className="ops-input" value={p.newTheme} onChange={(e) => p.onNewThemeChange(e.target.value)} /></label>
                  <button type="button" className="ops-btn ops-btn--ok" disabled={p.busy} onClick={p.onCreateProject}>Create project</button>
                </div>
              </section>
              <section className="cl-card">
                <h3>Open project</h3>
                <ul className="cl-project-list">
                  {p.projects.map((row) => (
                    <li key={row.id}>
                      <button
                        type="button"
                        className={`cl-project-list__btn${p.projectId === row.id ? " cl-project-list__btn--on" : ""}`}
                        onClick={() => p.onOpenProject(row.id)}
                      >
                        <strong>{row.name}</strong>
                        <span>{row.event || "—"}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
            {p.project ? (
              <section className="cl-card cl-card--wide">
                <h3>{p.project.name}</h3>
                <dl className="cl-meta-dl">
                  <dt>Event</dt>
                  <dd>
                    <input className="ops-input" value={p.project.event} onChange={(e) => p.onSetProject({ ...p.project!, event: e.target.value })} />
                  </dd>
                  <dt>Venue</dt>
                  <dd>
                    <input className="ops-input" value={p.project.venue} onChange={(e) => p.onSetProject({ ...p.project!, venue: e.target.value })} />
                  </dd>
                  <dt>Date</dt>
                  <dd>
                    <input className="ops-input" value={p.project.date} onChange={(e) => p.onSetProject({ ...p.project!, date: e.target.value })} />
                  </dd>
                  <dt>Years</dt>
                  <dd>
                    <input
                      className="ops-input"
                      value={p.project.featuredYears.join(", ")}
                      onChange={(e) =>
                        p.onSetProject({
                          ...p.project!,
                          featuredYears: e.target.value
                            .split(/[,\s]+/)
                            .map((y) => Number.parseInt(y.trim(), 10))
                            .filter((y) => Number.isFinite(y)),
                        })
                      }
                    />
                  </dd>
                  <dt>Theme</dt>
                  <dd>
                    <input className="ops-input" value={p.project.theme} onChange={(e) => p.onSetProject({ ...p.project!, theme: e.target.value })} />
                  </dd>
                </dl>
                <button type="button" className="ops-btn ops-btn--ok" disabled={p.busy} onClick={p.onSaveMetadata}>Save metadata</button>
              </section>
            ) : null}
          </div>
        ) : null}

        {p.panel === "styles" && p.project && p.draftSelection ? (
          <div className="cl-panel">
            <header className="cl-panel__head"><h2>Style boards</h2></header>
            <div className="cl-style-mode">
              <button type="button" className={`ops-btn${p.styleMode === "simple" ? " ops-btn--ok" : ""}`} onClick={() => p.onStyleModeChange("simple")}>Simple</button>
              <button type="button" className={`ops-btn${p.styleMode === "advanced" ? " ops-btn--ok" : ""}`} onClick={() => p.onStyleModeChange("advanced")}>Advanced</button>
            </div>
            <div className="cl-style-boards">
              <StyleBoard category="credential" title="Credential" styles={STYLE_CATALOG.credential} selection={p.draftSelection} mode={p.styleMode} onChange={(next) => p.onSetProject({ ...p.project!, styleSelection: next })} />
              <StyleBoard category="illustration" title="Illustration" styles={STYLE_CATALOG.illustration} selection={p.draftSelection} mode={p.styleMode} onChange={(next) => p.onSetProject({ ...p.project!, styleSelection: next })} />
              <StyleBoard category="color" title="Color" styles={STYLE_CATALOG.color} selection={p.draftSelection} mode={p.styleMode} onChange={(next) => p.onSetProject({ ...p.project!, styleSelection: next })} />
              <StyleWeightEditor category="density" title="Density" styles={STYLE_CATALOG.density} selection={p.draftSelection} onChange={(next) => p.onSetProject({ ...p.project!, styleSelection: next })} />
            </div>
            <PromptPreviewPanel project={p.project} activePreset={p.activePreset} />
            <button type="button" className="ops-btn ops-btn--ok" disabled={p.busy || !selectionHasWeights(p.draftSelection)} onClick={p.onSaveStyles}>Save styles</button>
            <input className="ops-input cl-preset-name" placeholder="Preset name" value={p.presetName} onChange={(e) => p.onPresetNameChange(e.target.value)} />
            <button type="button" className="ops-btn" disabled={p.busy} onClick={p.onSaveAsPreset}>Save as preset</button>
          </div>
        ) : null}

        {p.panel === "presets" ? (
          <div className="cl-panel">
            <header className="cl-panel__head"><h2>Preset gallery</h2></header>
            <PresetGallery presets={p.presets} projectName={p.project?.name} hasProject={Boolean(p.project)} busy={p.busy} onApply={p.onApplyPreset} onDuplicate={p.onDuplicatePreset} onSaveCustom={p.onSaveCustomPreset} />
          </div>
        ) : null}

        {p.panel === "pass-lab" && p.project ? (
          <div className="cl-panel">
            <header className="cl-panel__head"><h2>Pass Lab</h2></header>
            <p>{p.project.event} · {weightedStylesSummary(p.project.styleSelection)}</p>
            <button type="button" className="ops-btn ops-btn--ok" disabled={p.busy} onClick={p.onGenerateConcept}>Generate Concept A–D</button>
            <PromptPreviewPanel project={p.project} activePreset={p.activePreset} />
            <ConceptVariationsPanel prompts={p.project.generatedPrompts} />
          </div>
        ) : null}

        {p.panel === "assets" && p.project ? (
          <div className="cl-panel">
            <header className="cl-panel__head"><h2>Asset library</h2></header>
            <AssetLibrary project={p.project} busy={p.busy} onApprove={p.onApproveAsset} onReject={p.onRejectAsset} onSetFinal={p.onSetFinalAsset} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
