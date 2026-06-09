"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { STYLE_CATALOG } from "@/lib/ops/creative-lab/style-catalog";
import type {
  CreativeLabModuleId,
  CreativeLabPresetFile,
  CreativeLabProjectFile,
  StyleDefinition,
  StyleSelection,
} from "@/lib/ops/creative-lab/types";
import {
  buildCreativeLabHref,
  type CreativeLabPanel,
} from "@/lib/ops/creative-lab/workspace/urls";

import { ConceptVariationsPanel } from "./ConceptVariationsPanel";
import { PresetGallery } from "./PresetGallery";
import { PromptPreviewPanel } from "./PromptPreviewPanel";
import { selectionHasWeights, StyleWeightEditor, weightedStylesSummary } from "./StyleWeightEditor";
import { StyleBoard, type StyleBoardMode } from "./StyleBoard";

type ModuleInfo = {
  id: CreativeLabModuleId;
  label: string;
  description: string;
  available: boolean;
};

const PANELS: Array<{ id: CreativeLabPanel; label: string }> = [
  { id: "projects", label: "Projects" },
  { id: "styles", label: "Styles" },
  { id: "presets", label: "Presets" },
  { id: "pass-lab", label: "Pass Lab" },
];

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export function CreativeLabWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const panel = (searchParams.get("panel") as CreativeLabPanel | null) ?? "projects";
  const projectId = searchParams.get("project");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [modules, setModules] = useState<ModuleInfo[]>([]);
  const [styles, setStyles] = useState<StyleDefinition[]>([]);
  const [presets, setPresets] = useState<CreativeLabPresetFile[]>([]);
  const [projects, setProjects] = useState<
    Array<{ id: string; name: string; event: string; updatedAt: string }>
  >([]);
  const [project, setProject] = useState<CreativeLabProjectFile | null>(null);
  const [busy, setBusy] = useState(false);

  const [newName, setNewName] = useState("");
  const [newEvent, setNewEvent] = useState("");
  const [newVenue, setNewVenue] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newYears, setNewYears] = useState("1967, 1978, 1992");
  const [newTheme, setNewTheme] = useState("");
  const [presetName, setPresetName] = useState("");
  const [styleMode, setStyleMode] = useState<StyleBoardMode>("simple");

  const navigate = useCallback(
    (patch: { panel?: CreativeLabPanel; project?: string | null }) => {
      router.push(
        buildCreativeLabHref({
          panel: patch.panel ?? panel,
          project: patch.project === null ? undefined : patch.project ?? projectId ?? undefined,
        }),
      );
    },
    [router, panel, projectId],
  );

  const loadIndex = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ops/creative-lab", { cache: "no-store" });
      const data = (await res.json()) as {
        ok?: boolean;
        modules?: ModuleInfo[];
        styles?: StyleDefinition[];
        presets?: CreativeLabPresetFile[];
        projects?: typeof projects;
        error?: string;
      };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "load_failed");
      setModules(data.modules ?? []);
      setStyles(data.styles ?? []);
      setPresets(data.presets ?? []);
      setProjects(data.projects ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "load_failed");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadProject = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/ops/creative-lab/projects/${encodeURIComponent(id)}`, {
        cache: "no-store",
      });
      const data = (await res.json()) as { ok?: boolean; project?: CreativeLabProjectFile; error?: string };
      if (!res.ok || !data.ok || !data.project) throw new Error(data.error ?? "project_load_failed");
      setProject(data.project);
    } catch (e) {
      setError(e instanceof Error ? e.message : "project_load_failed");
    }
  }, []);

  useEffect(() => {
    void loadIndex();
  }, [loadIndex]);

  useEffect(() => {
    if (projectId) void loadProject(projectId);
    else setProject(null);
  }, [projectId, loadProject]);

  const draftSelection = project?.styleSelection;

  async function createProject() {
    if (!newName.trim()) return;
    setBusy(true);
    setNotice(null);
    try {
      const years = newYears
        .split(/[,\s]+/)
        .map((y) => Number.parseInt(y.trim(), 10))
        .filter((y) => Number.isFinite(y));
      const res = await fetch("/api/ops/creative-lab/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          event: newEvent,
          venue: newVenue,
          date: newDate,
          featuredYears: years,
          theme: newTheme,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; project?: CreativeLabProjectFile; error?: string };
      if (!res.ok || !data.ok || !data.project) throw new Error(data.error ?? "create_failed");
      setNotice(`Created ${data.project.name}`);
      await loadIndex();
      navigate({ panel: "projects", project: data.project.id });
    } catch (e) {
      setError(e instanceof Error ? e.message : "create_failed");
    } finally {
      setBusy(false);
    }
  }

  async function saveProjectPatch(patch: Partial<CreativeLabProjectFile>) {
    if (!project) return;
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch(`/api/ops/creative-lab/projects/${encodeURIComponent(project.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = (await res.json()) as { ok?: boolean; project?: CreativeLabProjectFile; error?: string };
      if (!res.ok || !data.ok || !data.project) throw new Error(data.error ?? "save_failed");
      setProject(data.project);
      setNotice("Saved.");
      await loadIndex();
    } catch (e) {
      setError(e instanceof Error ? e.message : "save_failed");
    } finally {
      setBusy(false);
    }
  }

  async function applyPreset(preset: CreativeLabPresetFile) {
    if (!project) {
      setNotice(`Apply preset from a project — open or create one first.`);
      return;
    }
    await saveProjectPatch({
      styleSelection: preset.styleSelection,
      activePresetId: preset.id,
      conceptStrategies: preset.conceptStrategies,
    });
    setNotice(`Applied preset ${preset.name}`);
  }

  async function duplicatePreset(preset: CreativeLabPresetFile) {
    const name = `${preset.name} Copy`;
    const id = `${slugify(preset.id)}-copy-${Date.now().toString(36).slice(-4)}`;
    setBusy(true);
    try {
      const res = await fetch("/api/ops/creative-lab/presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op: "duplicate", sourceId: preset.id, newId: id, newName: name }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "duplicate_failed");
      setNotice(`Duplicated as ${name}`);
      await loadIndex();
    } catch (e) {
      setError(e instanceof Error ? e.message : "duplicate_failed");
    } finally {
      setBusy(false);
    }
  }

  async function savePresetAsCustom(base: CreativeLabPresetFile) {
    const name = `${base.name} Custom`;
    const id = slugify(name) || `custom-${Date.now()}`;
    setBusy(true);
    try {
      const res = await fetch("/api/ops/creative-lab/presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          name,
          description: `Custom variant based on ${base.name}`,
          styleSelection: base.styleSelection,
          credentialStyle: base.credentialStyle,
          illustrationStyle: base.illustrationStyle,
          colorStyle: base.colorStyle,
          densityStyle: base.densityStyle,
          defaultConceptStrategy: base.defaultConceptStrategy,
          conceptStrategies: base.conceptStrategies,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "custom_preset_failed");
      setNotice(`Saved custom preset ${name}`);
      await loadIndex();
    } catch (e) {
      setError(e instanceof Error ? e.message : "custom_preset_failed");
    } finally {
      setBusy(false);
    }
  }

  async function saveAsPreset() {
    if (!project || !draftSelection) return;
    const name = presetName.trim() || `${project.name} Styles`;
    const id = slugify(name) || `preset-${Date.now()}`;
    setBusy(true);
    try {
      const res = await fetch("/api/ops/creative-lab/presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          name,
          description: `Saved from ${project.name}`,
          styleSelection: draftSelection,
          credentialStyle: draftSelection.credential[0]?.id,
          illustrationStyle: draftSelection.illustration[0]?.id,
          colorStyle: draftSelection.color[0]?.id,
          densityStyle: draftSelection.density[0]?.id,
          defaultConceptStrategy: project.conceptStrategies?.A ?? "credential-focus",
          conceptStrategies: project.conceptStrategies,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; preset?: CreativeLabPresetFile; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "preset_save_failed");
      setNotice(`Saved preset ${name}`);
      setPresetName("");
      await loadIndex();
    } catch (e) {
      setError(e instanceof Error ? e.message : "preset_save_failed");
    } finally {
      setBusy(false);
    }
  }

  async function generateConcept() {
    if (!project) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/ops/creative-lab/projects/${encodeURIComponent(project.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op: "generateConcept", module: "pass-lab" }),
      });
      const data = (await res.json()) as { ok?: boolean; project?: CreativeLabProjectFile; error?: string };
      if (!res.ok || !data.ok || !data.project) throw new Error(data.error ?? "concept_failed");
      setProject(data.project);
      setNotice("Generated Concept A–D prompt variations (no images yet).");
    } catch (e) {
      setError(e instanceof Error ? e.message : "concept_failed");
    } finally {
      setBusy(false);
    }
  }

  const activePreset = useMemo(
    () => (project?.activePresetId ? presets.find((p) => p.id === project.activePresetId) : null),
    [project?.activePresetId, presets],
  );

  const modulePlaceholders = useMemo(
    () => modules.filter((m) => !m.available),
    [modules],
  );

  if (loading) {
    return <p className="ops-dim cl-workspace__loading">Loading Creative Lab…</p>;
  }

  return (
    <div className="cl-workspace">
      <aside className="cl-workspace__sidebar">
        <p className="cl-workspace__sidebar-label">Creative Lab</p>
        <nav className="cl-workspace__nav" aria-label="Creative Lab panels">
          {PANELS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`cl-workspace__nav-btn${panel === p.id ? " cl-workspace__nav-btn--on" : ""}`}
              onClick={() => navigate({ panel: p.id })}
            >
              {p.label}
            </button>
          ))}
        </nav>

        <p className="cl-workspace__sidebar-label">Modules</p>
        <ul className="cl-workspace__modules">
          {modules.map((m) => (
            <li
              key={m.id}
              className={`cl-workspace__module${m.available ? "" : " cl-workspace__module--soon"}`}
            >
              <span>{m.label}</span>
              {!m.available ? <em>soon</em> : null}
            </li>
          ))}
        </ul>
      </aside>

      <div className="cl-workspace__main">
        {error ? <p className="mc-notice mc-notice--error">{error}</p> : null}
        {notice ? <p className="mc-notice">{notice}</p> : null}

        {panel === "projects" ? (
          <div className="cl-panel">
            <header className="cl-panel__head">
              <h2>Projects</h2>
              <p className="ops-dim">Event metadata + style weights + generated concepts.</p>
            </header>

            <div className="cl-panel__grid">
              <section className="cl-card">
                <h3>New project</h3>
                <div className="cl-form">
                  <label>
                    Name
                    <input className="ops-input" value={newName} onChange={(e) => setNewName(e.target.value)} />
                  </label>
                  <label>
                    Event
                    <input className="ops-input" value={newEvent} onChange={(e) => setNewEvent(e.target.value)} />
                  </label>
                  <label>
                    Venue
                    <input className="ops-input" value={newVenue} onChange={(e) => setNewVenue(e.target.value)} />
                  </label>
                  <label>
                    Date
                    <input className="ops-input" value={newDate} onChange={(e) => setNewDate(e.target.value)} placeholder="June 14, 2026" />
                  </label>
                  <label>
                    Featured years
                    <input className="ops-input" value={newYears} onChange={(e) => setNewYears(e.target.value)} />
                  </label>
                  <label>
                    Theme
                    <input className="ops-input" value={newTheme} onChange={(e) => setNewTheme(e.target.value)} />
                  </label>
                  <button type="button" className="ops-btn ops-btn--ok" disabled={busy} onClick={() => void createProject()}>
                    Create project
                  </button>
                </div>
              </section>

              <section className="cl-card">
                <h3>Open project</h3>
                <ul className="cl-project-list">
                  {projects.length === 0 ? (
                    <li className="ops-dim">No projects yet.</li>
                  ) : (
                    projects.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          className={`cl-project-list__btn${projectId === p.id ? " cl-project-list__btn--on" : ""}`}
                          onClick={() => navigate({ panel: "projects", project: p.id })}
                        >
                          <strong>{p.name}</strong>
                          <span>{p.event || "—"}</span>
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              </section>
            </div>

            {project ? (
              <section className="cl-card cl-card--wide">
                <h3>{project.name}</h3>
                <dl className="cl-meta-dl">
                  <dt>Event</dt>
                  <dd>
                    <input
                      className="ops-input"
                      value={project.event}
                      onChange={(e) => setProject({ ...project, event: e.target.value })}
                    />
                  </dd>
                  <dt>Venue</dt>
                  <dd>
                    <input
                      className="ops-input"
                      value={project.venue}
                      onChange={(e) => setProject({ ...project, venue: e.target.value })}
                    />
                  </dd>
                  <dt>Date</dt>
                  <dd>
                    <input
                      className="ops-input"
                      value={project.date}
                      onChange={(e) => setProject({ ...project, date: e.target.value })}
                    />
                  </dd>
                  <dt>Years</dt>
                  <dd>
                    <input
                      className="ops-input"
                      value={project.featuredYears.join(", ")}
                      onChange={(e) =>
                        setProject({
                          ...project,
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
                    <input
                      className="ops-input"
                      value={project.theme}
                      onChange={(e) => setProject({ ...project, theme: e.target.value })}
                    />
                  </dd>
                </dl>
                <div className="cl-actions">
                  <button
                    type="button"
                    className="ops-btn ops-btn--ok"
                    disabled={busy}
                    onClick={() =>
                      void saveProjectPatch({
                        name: project.name,
                        event: project.event,
                        venue: project.venue,
                        date: project.date,
                        featuredYears: project.featuredYears,
                        theme: project.theme,
                      })
                    }
                  >
                    Save metadata
                  </button>
                  <button type="button" className="ops-btn" disabled={busy} onClick={() => navigate({ panel: "styles", project: project.id })}>
                    Edit styles →
                  </button>
                </div>
              </section>
            ) : null}
          </div>
        ) : null}

        {panel === "styles" ? (
          <div className="cl-panel">
            <header className="cl-panel__head">
              <h2>Style boards</h2>
              <p className="ops-dim">
                {project ? `${project.name} — ${weightedStylesSummary(project.styleSelection)}` : "Select a project to pick styles."}
              </p>
            </header>
            {!project || !draftSelection ? (
              <p className="ops-dim">Open a project from the Projects panel first.</p>
            ) : (
              <>
                <div className="cl-style-mode">
                  <span className="cl-style-mode__label">Selection mode</span>
                  <button
                    type="button"
                    className={`ops-btn${styleMode === "simple" ? " ops-btn--ok" : ""}`}
                    onClick={() => setStyleMode("simple")}
                  >
                    Simple — click cards
                  </button>
                  <button
                    type="button"
                    className={`ops-btn${styleMode === "advanced" ? " ops-btn--ok" : ""}`}
                    onClick={() => setStyleMode("advanced")}
                  >
                    Advanced — manual weights
                  </button>
                </div>
                <div className="cl-style-boards">
                  <StyleBoard
                    category="credential"
                    title="Credential style"
                    styles={STYLE_CATALOG.credential}
                    selection={draftSelection}
                    mode={styleMode}
                    onChange={(next) => setProject({ ...project, styleSelection: next })}
                  />
                  <StyleBoard
                    category="illustration"
                    title="Illustration style"
                    styles={STYLE_CATALOG.illustration}
                    selection={draftSelection}
                    mode={styleMode}
                    onChange={(next) => setProject({ ...project, styleSelection: next })}
                  />
                  <StyleBoard
                    category="color"
                    title="Color style"
                    styles={STYLE_CATALOG.color}
                    selection={draftSelection}
                    mode={styleMode}
                    onChange={(next) => setProject({ ...project, styleSelection: next })}
                  />
                  {styleMode === "advanced" ? (
                    <StyleWeightEditor
                      category="density"
                      title="Print density"
                      styles={STYLE_CATALOG.density}
                      selection={draftSelection}
                      onChange={(next) => setProject({ ...project, styleSelection: next })}
                    />
                  ) : (
                    <StyleBoard
                      category="density"
                      title="Print density"
                      styles={STYLE_CATALOG.density}
                      selection={draftSelection}
                      mode="simple"
                      onChange={(next) => setProject({ ...project, styleSelection: next })}
                    />
                  )}
                </div>
                <PromptPreviewPanel project={project} activePreset={activePreset} />
                <div className="cl-actions">
                  <button
                    type="button"
                    className="ops-btn ops-btn--ok"
                    disabled={busy || !selectionHasWeights(draftSelection)}
                    onClick={() => void saveProjectPatch({ styleSelection: draftSelection })}
                  >
                    Save styles
                  </button>
                  <input
                    className="ops-input cl-preset-name"
                    placeholder="Preset name"
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                  />
                  <button type="button" className="ops-btn" disabled={busy} onClick={() => void saveAsPreset()}>
                    Save as preset
                  </button>
                </div>
              </>
            )}
          </div>
        ) : null}

        {panel === "presets" ? (
          <div className="cl-panel">
            <header className="cl-panel__head">
              <h2>Preset gallery</h2>
              <p className="ops-dim">
                {presets.length} presets — one-click styles + concept strategies. Stored in RETROVERSE_DATA/creative_lab/styles/
              </p>
            </header>
            <PresetGallery
              presets={presets}
              projectName={project?.name}
              hasProject={Boolean(project)}
              busy={busy}
              onApply={(preset) => void applyPreset(preset)}
              onDuplicate={(preset) => void duplicatePreset(preset)}
              onSaveCustom={(preset) => void savePresetAsCustom(preset)}
            />
          </div>
        ) : null}

        {panel === "pass-lab" ? (
          <div className="cl-panel">
            <header className="cl-panel__head">
              <h2>Pass Lab</h2>
              <p className="ops-dim">Prompt variations only — image generation not enabled yet.</p>
            </header>
            {!project ? (
              <p className="ops-dim">Select a project to build pass concepts.</p>
            ) : (
              <>
                <section className="cl-card cl-card--wide">
                  <h3>{project.name}</h3>
                  <p>{project.event} · {project.venue} · {project.date}</p>
                  <p className="cl-preset-summary">{weightedStylesSummary(project.styleSelection)}</p>
                  <div className="cl-actions">
                    <button
                      type="button"
                      className="ops-btn ops-btn--ok"
                      disabled={busy || !selectionHasWeights(project.styleSelection)}
                      onClick={() => void generateConcept()}
                    >
                      Generate Concept A–D
                    </button>
                  </div>
                </section>
                <PromptPreviewPanel project={project} activePreset={activePreset} />
                <section className="cl-card cl-card--wide">
                  <h3>Concept variations</h3>
                  <ConceptVariationsPanel prompts={project.generatedPrompts} />
                </section>
              </>
            )}
            {modulePlaceholders.length > 0 ? (
              <p className="ops-dim cl-soon">
                Coming soon: {modulePlaceholders.map((m) => m.label).join(", ")}
              </p>
            ) : null}
          </div>
        ) : null}

        {panel === "styles" && styles.length > 0 ? (
          <details className="cl-catalog-ref">
            <summary>Style catalog reference ({styles.length} styles)</summary>
            <ul className="cl-catalog-ref__list">
              {styles.map((s) => (
                <li key={s.id}>
                  <strong>{s.label}</strong> — {s.description}
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </div>
    </div>
  );
}
