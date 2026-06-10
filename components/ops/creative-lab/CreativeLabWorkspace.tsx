"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import type {
  CreativeLabModuleId,
  CreativeLabPresetFile,
  CreativeLabProjectFile,
  FinalAssetSlot,
  StyleDefinition,
  StyleSelection,
} from "@/lib/ops/creative-lab/types";
import {
  buildCreativeLabHref,
  isAdvancedPanel,
  type CreativeLabPanel,
} from "@/lib/ops/creative-lab/workspace/urls";
import { DEFAULT_ARTIFACT_TYPE, type ArtifactTypeId } from "@/lib/ops/creative-lab/artifact-types";
import { WORKSTATION_EVENT_DEFAULTS } from "@/lib/ops/creative-lab/workstation-defaults";
import { WORKSTATION_OUTPUTS } from "@/lib/ops/creative-lab/workstation-presets";

import { AdvancedWorkshop } from "./AdvancedWorkshop";
import { CreativeWorkstation } from "./CreativeWorkstation";
import { type StyleBoardMode } from "./StyleBoard";

type ModuleInfo = {
  id: CreativeLabModuleId;
  label: string;
  description: string;
  available: boolean;
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function parseYears(raw: string): number[] {
  return raw
    .split(/[,\s]+/)
    .map((y) => Number.parseInt(y.trim(), 10))
    .filter((y) => Number.isFinite(y));
}

const { event: DEFAULT_EVENT, venue: DEFAULT_VENUE, date: DEFAULT_DATE, featuredYears: DEFAULT_YEARS } =
  WORKSTATION_EVENT_DEFAULTS;

function projectDisplayName(event: string, outputId: string): string {
  const eventName = event.trim() || "Creative Session";
  const output = WORKSTATION_OUTPUTS.find((o) => o.id === outputId);
  return output ? `${eventName} ${output.label}` : eventName;
}

export function CreativeLabWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawPanel = searchParams.get("panel") as CreativeLabPanel | null;
  const panel: CreativeLabPanel = rawPanel ?? "workstation";
  const isAdvanced = isAdvancedPanel(panel);
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

  const [deskEvent, setDeskEvent] = useState(DEFAULT_EVENT);
  const [deskVenue, setDeskVenue] = useState(DEFAULT_VENUE);
  const [deskDate, setDeskDate] = useState(DEFAULT_DATE);
  const [deskYears, setDeskYears] = useState<number[]>([...DEFAULT_YEARS]);
  const [outputId, setOutputId] = useState("pass");
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>("sunday-nights-classic");
  const [artifactTypeId, setArtifactTypeId] = useState<ArtifactTypeId>(DEFAULT_ARTIFACT_TYPE);
  const [deskSelection, setDeskSelection] = useState<StyleSelection | null>(null);
  const [showAdvancedOutputs, setShowAdvancedOutputs] = useState(false);
  const [showStyleAdvanced, setShowStyleAdvanced] = useState(false);

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
      const nextPanel = patch.panel ?? panel;
      router.push(
        buildCreativeLabHref({
          panel: nextPanel === "workstation" ? undefined : nextPanel,
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

  useEffect(() => {
    if (!presets.length || deskSelection) return;
    const preset = presets.find((p) => p.id === selectedPresetId) ?? presets[0];
    if (preset) {
      setSelectedPresetId(preset.id);
      setDeskSelection(preset.styleSelection);
    }
  }, [presets, deskSelection, selectedPresetId]);

  useEffect(() => {
    if (!project) return;
    setDeskEvent(project.event);
    setDeskVenue(project.venue);
    setDeskDate(project.date);
    setDeskYears(project.featuredYears.length ? [...project.featuredYears] : [...DEFAULT_YEARS]);
    setDeskSelection(project.styleSelection);
    if (project.activePresetId) setSelectedPresetId(project.activePresetId);
    if (project.artifactType) setArtifactTypeId(project.artifactType);
  }, [project?.id]);

  const draftSelection = project?.styleSelection ?? deskSelection;

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
      setDeskSelection(data.project.styleSelection);
      setNotice("Saved.");
      await loadIndex();
    } catch (e) {
      setError(e instanceof Error ? e.message : "save_failed");
    } finally {
      setBusy(false);
    }
  }

  async function createProjectFromDesk(): Promise<CreativeLabProjectFile> {
    const name = projectDisplayName(deskEvent, outputId);
    const res = await fetch("/api/ops/creative-lab/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        event: deskEvent,
        venue: deskVenue,
        date: deskDate,
        featuredYears: deskYears,
        theme: "",
        artifactType: artifactTypeId,
      }),
    });
    const data = (await res.json()) as { ok?: boolean; project?: CreativeLabProjectFile; error?: string };
    if (!res.ok || !data.ok || !data.project) throw new Error(data.error ?? "create_failed");
    await loadIndex();
    return data.project;
  }

  async function createProject() {
    if (!newName.trim()) return;
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch("/api/ops/creative-lab/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          event: newEvent,
          venue: newVenue,
          date: newDate,
          featuredYears: parseYears(newYears),
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

  async function applyPreset(preset: CreativeLabPresetFile, target?: CreativeLabProjectFile) {
    const targetProject = target ?? project;
    if (!targetProject) {
      setDeskSelection(preset.styleSelection);
      setSelectedPresetId(preset.id);
      return;
    }
    await saveProjectPatch({
      styleSelection: preset.styleSelection,
      activePresetId: preset.id,
      conceptStrategies: preset.conceptStrategies,
    });
    setSelectedPresetId(preset.id);
    setDeskSelection(preset.styleSelection);
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

  async function projectOp(body: Record<string, unknown>) {
    if (!project) return;
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch(`/api/ops/creative-lab/projects/${encodeURIComponent(project.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { ok?: boolean; project?: CreativeLabProjectFile; error?: string };
      if (!res.ok || !data.ok || !data.project) throw new Error(data.error ?? "project_op_failed");
      setProject(data.project);
    } catch (e) {
      setError(e instanceof Error ? e.message : "project_op_failed");
    } finally {
      setBusy(false);
    }
  }

  async function revealFolder(target: "project" | "exports") {
    if (!project) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/ops/creative-lab/projects/${encodeURIComponent(project.id)}/reveal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "reveal_failed");
      setNotice(target === "exports" ? "Opened exports folder in Finder." : "Revealed project folder in Finder.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "reveal_failed");
    } finally {
      setBusy(false);
    }
  }

  async function exportProject(op: "package" | "finals") {
    if (!project) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/ops/creative-lab/projects/${encodeURIComponent(project.id)}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op: op === "finals" ? "exportFinals" : "exportPackage" }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        zipPath?: string;
        zipRel?: string;
        files?: string[];
        error?: string;
      };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "export_failed");
      setNotice(
        op === "finals"
          ? `Exported ${data.files?.length ?? 0} final deliverables.`
          : `Exported project package (${data.zipRel ?? "exports"}).`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "export_failed");
    } finally {
      setBusy(false);
    }
  }

  async function generateConcept(module: CreativeLabModuleId = "pass-lab") {
    if (!project) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/ops/creative-lab/projects/${encodeURIComponent(project.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op: "generateConcept", module }),
      });
      const data = (await res.json()) as { ok?: boolean; project?: CreativeLabProjectFile; error?: string };
      if (!res.ok || !data.ok || !data.project) throw new Error(data.error ?? "concept_failed");
      setProject(data.project);
      setNotice("Generated Concept A–D.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "concept_failed");
    } finally {
      setBusy(false);
    }
  }

  async function workstationGenerate() {
    const preset = presets.find((p) => p.id === selectedPresetId);
    const output = WORKSTATION_OUTPUTS.find((o) => o.id === outputId) ?? WORKSTATION_OUTPUTS[0];
    if (!preset || !output.available) return;

    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      let active = project;
      if (!active) {
        active = await createProjectFromDesk();
        setProject(active);
        navigate({ project: active.id });
      }

      const patchRes = await fetch(`/api/ops/creative-lab/projects/${encodeURIComponent(active.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: projectDisplayName(deskEvent, outputId),
          event: deskEvent,
          venue: deskVenue,
          date: deskDate,
          featuredYears: deskYears,
          styleSelection: deskSelection ?? preset.styleSelection,
          activePresetId: preset.id,
          conceptStrategies: preset.conceptStrategies,
          artifactType: artifactTypeId,
        }),
      });
      const patchData = (await patchRes.json()) as {
        ok?: boolean;
        project?: CreativeLabProjectFile;
        error?: string;
      };
      if (!patchRes.ok || !patchData.ok || !patchData.project) throw new Error(patchData.error ?? "save_failed");
      active = patchData.project;
      setProject(active);

      const genRes = await fetch(`/api/ops/creative-lab/projects/${encodeURIComponent(active.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op: "generateConcept", module: output.module }),
      });
      const genData = (await genRes.json()) as { ok?: boolean; project?: CreativeLabProjectFile; error?: string };
      if (!genRes.ok || !genData.ok || !genData.project) throw new Error(genData.error ?? "concept_failed");
      setProject(genData.project);
      setNotice("Concept deck ready — four directions generated.");
      await loadIndex();
    } catch (e) {
      setError(e instanceof Error ? e.message : "generate_failed");
    } finally {
      setBusy(false);
    }
  }

  function onPresetSelect(id: string) {
    setSelectedPresetId(id);
    const preset = presets.find((p) => p.id === id);
    if (preset) {
      setDeskSelection(preset.styleSelection);
      if (project) void applyPreset(preset);
    }
  }

  const activePreset = useMemo(
    () => (selectedPresetId ? presets.find((p) => p.id === selectedPresetId) : null) ?? null,
    [selectedPresetId, presets],
  );

  const modulePlaceholders = useMemo(() => modules.filter((m) => !m.available), [modules]);

  if (loading) {
    return <p className="ops-dim cl-workspace__loading">Loading Creative Lab…</p>;
  }

  const statusBar = (
    <>
      {error ? <p className="mc-notice mc-notice--error">{error}</p> : null}
      {notice ? <p className="mc-notice">{notice}</p> : null}
    </>
  );

  if (!isAdvanced) {
    return (
      <>
        {statusBar}
        <CreativeWorkstation
          presets={presets}
          project={project}
          styleSelection={deskSelection}
          busy={busy}
          event={deskEvent}
          venue={deskVenue}
          date={deskDate}
          years={deskYears}
          outputId={outputId}
          selectedPresetId={selectedPresetId}
          artifactTypeId={artifactTypeId}
          showAdvancedOutputs={showAdvancedOutputs}
          showStyleAdvanced={showStyleAdvanced}
          onEventChange={setDeskEvent}
          onVenueChange={setDeskVenue}
          onDateChange={setDeskDate}
          onYearsChange={setDeskYears}
          onOutputChange={setOutputId}
          onPresetSelect={onPresetSelect}
          onArtifactTypeChange={setArtifactTypeId}
          onToggleAdvancedOutputs={() => setShowAdvancedOutputs((v) => !v)}
          onToggleStyleAdvanced={() => setShowStyleAdvanced((v) => !v)}
          onGenerate={() => void workstationGenerate()}
          onSelectWinner={(promptId) => void projectOp({ op: "setSelectedConcept", promptId })}
          onGenerateRefinement={() => void projectOp({ op: "generateRefinementVariations" })}
          onSelectVariation={(variationIndex) =>
            void projectOp({ op: "setSelectedVariation", variationIndex })
          }
          onStyleChange={(next) => {
            setDeskSelection(next);
            if (project) setProject({ ...project, styleSelection: next });
          }}
          onOpenAdvanced={() => navigate({ panel: "projects", project: projectId })}
        />
      </>
    );
  }

  return (
    <>
      {statusBar}
      <AdvancedWorkshop
        panel={panel}
        projectId={projectId}
        project={project}
        projects={projects}
        presets={presets}
        styles={styles}
        modules={modules}
        busy={busy}
        activePreset={activePreset}
        draftSelection={draftSelection ?? undefined}
        styleMode={styleMode}
        presetName={presetName}
        newName={newName}
        newEvent={newEvent}
        newVenue={newVenue}
        newDate={newDate}
        newYears={newYears}
        newTheme={newTheme}
        modulePlaceholders={modulePlaceholders}
        onNavigate={(p) => navigate({ panel: p })}
        onBackToDesk={() => navigate({ panel: "workstation", project: projectId })}
        onSaveProject={() => void projectOp({ op: "saveProject" })}
        onRevealProject={() => void revealFolder("project")}
        onRevealExports={() => void revealFolder("exports")}
        onExportPackage={() => void exportProject("package")}
        onExportFinals={() => void exportProject("finals")}
        onCreateProject={() => void createProject()}
        onOpenProject={(id) => navigate({ panel, project: id })}
        onSaveMetadata={() =>
          project
            ? void saveProjectPatch({
                name: project.name,
                event: project.event,
                venue: project.venue,
                date: project.date,
                featuredYears: project.featuredYears,
                theme: project.theme,
              })
            : undefined
        }
        onSetProject={setProject}
        onStyleModeChange={setStyleMode}
        onSaveStyles={() => draftSelection && void saveProjectPatch({ styleSelection: draftSelection })}
        onSaveAsPreset={() => void saveAsPreset()}
        onPresetNameChange={setPresetName}
        onNewNameChange={setNewName}
        onNewEventChange={setNewEvent}
        onNewVenueChange={setNewVenue}
        onNewDateChange={setNewDate}
        onNewYearsChange={setNewYears}
        onNewThemeChange={setNewTheme}
        onApplyPreset={(preset) => void applyPreset(preset)}
        onDuplicatePreset={(preset) => void duplicatePreset(preset)}
        onSaveCustomPreset={(preset) => void savePresetAsCustom(preset)}
        onGenerateConcept={() => void generateConcept("pass-lab")}
        onApproveAsset={(id) => void projectOp({ op: "approveAsset", assetId: id })}
        onRejectAsset={(id) => void projectOp({ op: "rejectAsset", assetId: id })}
        onSetFinalAsset={(id, slot) => void projectOp({ op: "setFinalAsset", assetId: id, slot })}
      />
    </>
  );
}
