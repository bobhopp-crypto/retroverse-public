"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { ContentCreatorGallery } from "@/components/ops/content-creator/ContentCreatorGallery";
import {
  ExportCompletePanel,
  type ExportCompleteState,
} from "@/components/ops/content-creator/ExportCompletePanel";
import { projectSecondaryLine } from "@/lib/ops/creative-lab/project-secondary-line";
import { emptyQrZoneAudit } from "@/lib/ops/creative-lab/qr-zone-render";
import { CONTENT_CREATOR_DEFAULTS } from "@/lib/ops/content-creator/defaults";
import { resolveVisualWorldFromRvbr } from "@/lib/ops/content-creator/resolve-visual-world";
import type { ContentArtifactType, ContentCreatorEraOption } from "@/lib/ops/content-creator/types";
import { workflowStatusMessage } from "@/lib/ops/content-creator/workflow-status";
import {
  CONTROLLED_PASS_TYPE_LABELS,
  normalizePassTypeLabel,
  type ControlledPassTypeLabel,
} from "@/lib/ops/creative-lab/pass-text-governance";
import type { CreativeLabProjectFile } from "@/lib/ops/creative-lab/types";
import { deriveWorkstationStatus } from "@/lib/ops/creative-lab/workstation-state";
import type { RvbrProfile } from "@/lib/ops/rvbr/types";

type Props = {
  eras: ContentCreatorEraOption[];
};

const ARTIFACT_TYPES: Array<{ id: ContentArtifactType; label: string; enabled: boolean }> = [
  { id: "pass", label: "Pass", enabled: true },
  { id: "poster", label: "Poster", enabled: false },
  { id: "bumper", label: "Bumper", enabled: false },
  { id: "slide", label: "Slide", enabled: false },
  { id: "social", label: "Social", enabled: false },
];

const WORKFLOW_STEPS = [
  "Artifact",
  "Era",
  "Generate",
  "Select",
  "Approve",
  "Export",
] as const;

function projectDisplayName(event: string): string {
  return `${event.trim() || "Creative Session"} VIP Pass`;
}

function eraToRvbrProfile(era: ContentCreatorEraOption): RvbrProfile {
  const [startRaw, endRaw] = era.years.split("–");
  return {
    id: era.retroverseEraId,
    retroverseEraId: era.retroverseEraId,
    slug: era.slug,
    name: era.name,
    eraStartYear: Number.parseInt(startRaw ?? "0", 10),
    eraEndYear: Number.parseInt(endRaw ?? "0", 10),
    narrative: era.narrative,
    visualIdentity: {
      canonSource: "data/rvbr/eras-canon.json",
      title: era.name,
      accent: era.visualIdentity.accent,
      subtitle: era.visualIdentity.subtitle,
      sections: era.visualIdentity.sections,
    },
    promptFragments: era.promptFragments,
    notes: null,
    createdAt: "",
    updatedAt: "",
  };
}

function workflowStepIndex(args: {
  hasFronts: boolean;
  frontLocked: boolean;
  hasBacks: boolean;
  exportReady: boolean;
  busy: boolean;
  generating: boolean;
}): number {
  if (args.exportReady) return 5;
  if (args.frontLocked && args.hasBacks) return 4;
  if (args.frontLocked) return 4;
  if (args.hasFronts) return 3;
  if (args.generating || args.busy) return 2;
  return 1;
}

export function ContentCreatorWorkspace({ eras }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("project");

  const [artifactType, setArtifactType] = useState<ContentArtifactType>("pass");
  const [selectedEraSlug, setSelectedEraSlug] = useState<string>("1982-1985");
  const [event, setEvent] = useState(CONTENT_CREATOR_DEFAULTS.event);
  const [venue, setVenue] = useState(CONTENT_CREATOR_DEFAULTS.venue);
  const [date, setDate] = useState(CONTENT_CREATOR_DEFAULTS.date);
  const [secondaryLine, setSecondaryLine] = useState(CONTENT_CREATOR_DEFAULTS.secondaryLine);
  const [passTypeLabel, setPassTypeLabel] = useState<ControlledPassTypeLabel>(
    CONTENT_CREATOR_DEFAULTS.passTypeLabel,
  );
  const [qrUrl, setQrUrl] = useState(CONTENT_CREATOR_DEFAULTS.qrUrl);
  const [quantity, setQuantity] = useState(CONTENT_CREATOR_DEFAULTS.quantity);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [project, setProject] = useState<CreativeLabProjectFile | null>(null);
  const [busy, setBusy] = useState(false);
  const [backGenerating, setBackGenerating] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [exportResult, setExportResult] = useState<ExportCompleteState | null>(null);

  const selectedEra = useMemo(
    () => eras.find((e) => e.slug === selectedEraSlug) ?? eras[0] ?? null,
    [eras, selectedEraSlug],
  );

  const selectedRvbrProfile = useMemo(
    () => (selectedEra ? eraToRvbrProfile(selectedEra) : null),
    [selectedEra],
  );

  const visualWorldId = useMemo(
    () => resolveVisualWorldFromRvbr(selectedRvbrProfile),
    [selectedRvbrProfile],
  );

  const status = useMemo(() => deriveWorkstationStatus(project), [project]);

  const hasFronts = Boolean(
    project?.generatedPrompts.some((p) => (p.passSide ?? "front") !== "back"),
  );
  const frontLocked = project?.frontLocked === true;
  const hasBacks = Boolean(project?.backVariationSetId);
  const hasFrontSelection = Boolean(project?.selectedConceptPromptId);
  const hasBackSelection = Boolean(project?.selectedBackPromptId);
  const exportReady = status.exportStatus === "Ready";

  const generating = busy && (!hasFronts || backGenerating);
  const statusMessage = useMemo(
    () => workflowStatusMessage({ project, busy, backGenerating, nowMs }),
    [project, busy, backGenerating, nowMs],
  );
  const activeStep = workflowStepIndex({
    hasFronts,
    frontLocked,
    hasBacks,
    exportReady,
    busy,
    generating,
  });

  const navigateProject = useCallback(
    (id: string | null) => {
      const q = new URLSearchParams(searchParams.toString());
      if (id) q.set("project", id);
      else q.delete("project");
      const path = q.toString() ? `/ops/content-creator?${q}` : "/ops/content-creator";
      router.push(path);
    },
    [router, searchParams],
  );

  const applyProject = useCallback((p: CreativeLabProjectFile) => {
    setProject(p);
    if (p.eraSlug) {
      setSelectedEraSlug(p.eraSlug);
    } else {
      const theme = p.theme ?? "";
      const eraMatch = /^rvbr:(\d{4}-\d{4})$/.exec(theme);
      if (eraMatch) setSelectedEraSlug(eraMatch[1]);
    }
    setEvent(p.event);
    setVenue(p.venue);
    setDate(p.date);
    setSecondaryLine(projectSecondaryLine(p) || secondaryLine);
    if (p.qrUrl) setQrUrl(p.qrUrl);
    if (p.passTypeLabel) setPassTypeLabel(normalizePassTypeLabel(p.passTypeLabel));
    if (p.quantity) setQuantity(p.quantity);
  }, [secondaryLine]);

  const loadProject = useCallback(async (id: string) => {
    const res = await fetch(`/api/ops/creative-lab/projects/${encodeURIComponent(id)}`, {
      cache: "no-store",
    });
    const data = (await res.json()) as { ok?: boolean; project?: CreativeLabProjectFile; error?: string };
    if (!res.ok || !data.ok || !data.project) throw new Error(data.error ?? "project_load_failed");
    applyProject(data.project);
  }, [applyProject]);

  useEffect(() => {
    if (projectId) {
      loadProject(projectId).catch((e) => {
        setError(e instanceof Error ? e.message : "project_load_failed");
      });
    } else {
      setProject(null);
    }
  }, [projectId, loadProject]);

  useEffect(() => {
    if (!busy) return;
    const tick = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(tick);
  }, [busy]);

  useEffect(() => {
    if (!projectId || exportResult || !exportReady) return;
    void fetch(`/api/ops/creative-lab/projects/${encodeURIComponent(projectId)}/export`, {
      cache: "no-store",
    })
      .then((res) => res.json())
      .then(
        (data: {
          ok?: boolean;
          exportDir?: string;
          zipRel?: string | null;
          zipFilename?: string | null;
          frontFilename?: string;
          backFilename?: string;
          report?: ExportCompleteState["report"];
        }) => {
          if (!data.ok || !data.exportDir || !data.zipRel) return;
          setExportResult({
            exportDir: data.exportDir,
            zipRel: data.zipRel,
            zipFilename: data.zipFilename ?? data.zipRel.split("/").pop() ?? "export.zip",
            frontFilename: data.frontFilename ?? "final-front.png",
            backFilename: data.backFilename ?? "final-back.png",
            report: data.report ?? {
              exportedAt: "",
              projectId,
              qrUrl,
              front: { filename: "final-front.png", path: "" },
              back: { filename: "final-back.png", path: "" },
              package: { filename: data.zipFilename ?? "export.zip", path: "", rel: data.zipRel },
              qrVerification: {
                ok: false,
                decodedUrl: null,
                expectedUrl: qrUrl,
                notes: [],
                physicalWidthIn: 0,
                physicalHeightIn: 0,
                pixelSize: { width: 0, height: 0 },
                minSizeIn: 1.5,
                sizePass: false,
                decodePass: false,
                zoneAudit: emptyQrZoneAudit(),
              },
              textGovernance: { note: "Loaded from disk." },
            },
          });
        },
      )
      .catch(() => {});
  }, [projectId, exportReady, exportResult, qrUrl]);

  useEffect(() => {
    if (!busy || !projectId) return;
    const poll = window.setInterval(() => {
      void fetch(`/api/ops/creative-lab/projects/${encodeURIComponent(projectId)}`, {
        cache: "no-store",
      })
        .then((res) => res.json())
        .then((data: { ok?: boolean; project?: CreativeLabProjectFile }) => {
          if (data.ok && data.project) applyProject(data.project);
        })
        .catch(() => {});
    }, 2000);
    return () => window.clearInterval(poll);
  }, [busy, projectId, applyProject]);

  function textPatch() {
    return {
      name: projectDisplayName(event),
      event,
      venue,
      date,
      secondaryLine,
      eraSlug: selectedEraSlug,
      theme: selectedEra?.name ?? "",
      qrUrl,
      passTypeLabel,
      quantity,
      selectedArtDirectionId: visualWorldId,
      artifactType: "vip-pass" as const,
    };
  }

  async function projectOp(body: Record<string, unknown>) {
    if (!project) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/ops/creative-lab/projects/${encodeURIComponent(project.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        project?: CreativeLabProjectFile;
        error?: string;
        code?: string;
        textAudit?: { summary?: string };
      };
      if (!res.ok || !data.ok || !data.project) {
        if (data.code === "text_violation") {
          throw new Error(data.textAudit?.summary ?? data.error ?? "text_violation");
        }
        throw new Error(data.error ?? "project_op_failed");
      }
      setProject(data.project);
    } catch (e) {
      setError(e instanceof Error ? e.message : "project_op_failed");
    } finally {
      setBusy(false);
    }
  }

  async function createProject(): Promise<CreativeLabProjectFile> {
    const res = await fetch("/api/ops/creative-lab/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: projectDisplayName(event),
        event,
        venue,
        date,
        secondaryLine,
        eraSlug: selectedEraSlug,
        theme: selectedEra?.name ?? "",
        qrUrl,
        passTypeLabel,
        quantity,
        artifactType: "vip-pass",
      }),
    });
    const data = (await res.json()) as { ok?: boolean; project?: CreativeLabProjectFile; error?: string };
    if (!res.ok || !data.ok || !data.project) throw new Error(data.error ?? "create_failed");
    return data.project;
  }

  async function generatePassOptions() {
    if (artifactType !== "pass") return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      let active = project;
      if (!active) {
        active = await createProject();
        setProject(active);
        navigateProject(active.id);
      }

      const patchRes = await fetch(`/api/ops/creative-lab/projects/${encodeURIComponent(active.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(textPatch()),
      });
      const patchData = (await patchRes.json()) as {
        ok?: boolean;
        project?: CreativeLabProjectFile;
        error?: string;
      };
      if (!patchRes.ok || !patchData.ok || !patchData.project) {
        throw new Error(patchData.error ?? "save_failed");
      }
      active = patchData.project;
      setProject(active);

      const genRes = await fetch(`/api/ops/creative-lab/projects/${encodeURIComponent(active.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op: "generatePasses", visualWorldId }),
      });
      const genData = (await genRes.json()) as { ok?: boolean; project?: CreativeLabProjectFile; error?: string };
      if (!genRes.ok || !genData.ok || !genData.project) {
        throw new Error(genData.error ?? "pass_generation_failed");
      }
      setProject(genData.project);
      setNotice("Options ready — pick your favorite.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "generate_failed");
    } finally {
      setBusy(false);
    }
  }

  async function generateBackOptions() {
    if (!project) return;
    setBusy(true);
    setBackGenerating(true);
    setError(null);
    setNotice(null);
    try {
      await fetch(`/api/ops/creative-lab/projects/${encodeURIComponent(project.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(textPatch()),
      });
      const res = await fetch(`/api/ops/creative-lab/projects/${encodeURIComponent(project.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op: "generateBackPasses" }),
      });
      const data = (await res.json()) as { ok?: boolean; project?: CreativeLabProjectFile; error?: string };
      if (!res.ok || !data.ok || !data.project) throw new Error(data.error ?? "back_generation_failed");
      setProject(data.project);
      setNotice("Back options ready.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "back_generation_failed");
    } finally {
      setBusy(false);
      setBackGenerating(false);
    }
  }

  async function approveBack() {
    if (!project?.selectedBackPromptId) return;
    const backPrompt = project.generatedPrompts.find((p) => p.id === project.selectedBackPromptId);
    const assetId = backPrompt?.assetId;
    if (!assetId) return;
    await projectOp({ op: "approveAsset", assetId });
    setNotice("Back approved.");
  }

  async function exportPackage() {
    if (!project) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await fetch(`/api/ops/creative-lab/projects/${encodeURIComponent(project.id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(textPatch()),
      });
      const res = await fetch(`/api/ops/creative-lab/projects/${encodeURIComponent(project.id)}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op: "exportPassPair" }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        zipRel?: string;
        zipFilename?: string;
        exportDir?: string;
        frontFilename?: string;
        backFilename?: string;
        report?: ExportCompleteState["report"];
        project?: CreativeLabProjectFile;
        error?: string;
      };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "export_failed");
      if (data.project) applyProject(data.project);
      const zipRel = data.zipRel;
      const zipFilename =
        data.zipFilename ?? (zipRel ? zipRel.split("/").pop() ?? "export.zip" : "export.zip");
      if (zipRel && data.exportDir) {
        setExportResult({
          exportDir: data.exportDir,
          zipRel,
          zipFilename,
          frontFilename: data.frontFilename ?? "final-front.png",
          backFilename: data.backFilename ?? "final-back.png",
          report:
            data.report ??
            ({
              exportedAt: new Date().toISOString(),
              projectId: data.project?.id ?? project.id,
              qrUrl,
              front: { filename: "final-front.png", path: "" },
              back: { filename: "final-back.png", path: "" },
              package: { filename: zipFilename, path: "", rel: zipRel },
              qrVerification: {
                ok: false,
                decodedUrl: null,
                expectedUrl: qrUrl,
                notes: [],
                physicalWidthIn: 0,
                physicalHeightIn: 0,
                pixelSize: { width: 0, height: 0 },
                minSizeIn: 1.5,
                sizePass: false,
                decodePass: false,
                zoneAudit: emptyQrZoneAudit(),
              },
              textGovernance: { note: "Export complete." },
            } as ExportCompleteState["report"]),
        });
      }
      setNotice("Export complete — see panel below.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "export_failed");
    } finally {
      setBusy(false);
    }
  }

  const eventReady = Boolean(event.trim() && venue.trim() && date.trim() && secondaryLine.trim());
  const canGenerate = artifactType === "pass" && eventReady && Boolean(selectedEra);
  const backAssetId = project?.selectedBackPromptId
    ? project.generatedPrompts.find((p) => p.id === project.selectedBackPromptId)?.assetId
    : null;
  const backApproved = backAssetId
    ? project?.assets.find((a) => a.id === backAssetId)?.status === "approved" ||
      project?.assets.find((a) => a.id === backAssetId)?.status === "final"
    : false;

  const selectedFrontAsset = project?.selectedConceptPromptId
    ? project.assets.find(
        (a) => a.id === project.generatedPrompts.find((p) => p.id === project.selectedConceptPromptId)?.assetId,
      )
    : null;
  const selectedBackAsset = backAssetId ? project?.assets.find((a) => a.id === backAssetId) : null;
  const frontTextBlocked = selectedFrontAsset?.textAudit?.status === "fail";
  const backTextBlocked = selectedBackAsset?.textAudit?.status === "fail";

  return (
    <div className="cc-browser">
      <header className="cc-chrome">
        <div className="cc-chrome__brand">
          <span className="cc-chrome__title">Content Creator</span>
          {selectedEra ? (
            <span className="cc-chrome__context">
              {event} · {selectedEra.years}
            </span>
          ) : null}
        </div>

        <nav className="cc-steps" aria-label="Workflow">
          {WORKFLOW_STEPS.map((step, i) => (
            <span
              key={step}
              className={`cc-steps__item${i === activeStep ? " cc-steps__item--on" : ""}${i < activeStep ? " cc-steps__item--done" : ""}`}
            >
              {step}
            </span>
          ))}
        </nav>

        <div className="cc-chrome__actions">
          <a href="/ops/content-creator/debug" className="cc-btn cc-btn--ghost">
            Debug
          </a>
          <button
            type="button"
            className="cc-btn cc-btn--primary"
            disabled={busy || !canGenerate || frontLocked}
            onClick={() => void generatePassOptions()}
          >
            {generating ? "Generating…" : "Generate"}
          </button>
          <button
            type="button"
            className="cc-btn"
            disabled={busy || !hasFrontSelection || frontLocked || frontTextBlocked}
            title={frontTextBlocked ? selectedFrontAsset?.textAudit?.summary : undefined}
            onClick={() => void projectOp({ op: "lockFront" })}
          >
            Approve Front
          </button>
          <button
            type="button"
            className="cc-btn"
            disabled={busy || !frontLocked || hasBacks}
            onClick={() => void generateBackOptions()}
          >
            Generate Back
          </button>
          <button
            type="button"
            className="cc-btn"
            disabled={busy || !hasBackSelection || backApproved || backTextBlocked}
            title={backTextBlocked ? selectedBackAsset?.textAudit?.summary : undefined}
            onClick={() => void approveBack()}
          >
            Approve Back
          </button>
          <button
            type="button"
            className="cc-btn cc-btn--export"
            disabled={busy || !exportReady}
            onClick={() => void exportPackage()}
          >
            Export
          </button>
          <button
            type="button"
            className={`cc-btn cc-btn--ghost${drawerOpen ? " cc-btn--ghost-on" : ""}`}
            onClick={() => setDrawerOpen((v) => !v)}
            aria-expanded={drawerOpen}
          >
            Event
          </button>
        </div>
      </header>

      <div className="cc-rail">
        <div className="cc-rail__artifacts" role="tablist" aria-label="Artifact type">
          {ARTIFACT_TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={artifactType === t.id}
              className={`cc-chip${artifactType === t.id ? " cc-chip--on" : ""}${!t.enabled ? " cc-chip--off" : ""}`}
              disabled={!t.enabled}
              onClick={() => t.enabled && setArtifactType(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <label className="cc-rail__secondary-line">
          <span>Secondary Line</span>
          <input value={secondaryLine} onChange={(e) => setSecondaryLine(e.target.value)} />
        </label>

        <div className="cc-rail__eras" role="listbox" aria-label="Era">
          {eras.map((era) => (
            <button
              key={era.slug}
              type="button"
              role="option"
              aria-selected={selectedEraSlug === era.slug}
              className={`cc-era${selectedEraSlug === era.slug ? " cc-era--on" : ""}`}
              style={{ ["--cc-era-accent" as string]: era.accent ?? "#6b6b6b" }}
              onClick={() => setSelectedEraSlug(era.slug)}
              title={era.name}
            >
              <span className="cc-era__swatch" aria-hidden />
              <span className="cc-era__years">{era.years}</span>
            </button>
          ))}
        </div>
      </div>

      <div className={`cc-status${busy ? " cc-status--busy" : ""}`} role="status" aria-live="polite">
        <strong className="cc-status__label">{statusMessage}</strong>
        {busy && project?.generationProgress ? (
          <span className="cc-status__detail">
            Step {project.generationProgress.step} of {project.generationProgress.total}
          </span>
        ) : null}
        {error ? <span className="cc-status__error">{error}</span> : null}
        {!error && notice ? <span className="cc-status__notice">{notice}</span> : null}
      </div>

      <main className="cc-stage">
        {!hasFronts && !generating ? (
          <div className="cc-stage__empty">
            <p className="cc-stage__empty-title">Choose an era, then Generate</p>
            <p className="cc-stage__empty-hint">
              {selectedEra ? selectedEra.name : "Pick a visual era above"}
            </p>
            {selectedEra?.accent ? (
              <div
                className="cc-stage__empty-swatch"
                style={{ background: selectedEra.accent }}
                aria-hidden
              />
            ) : null}
          </div>
        ) : null}

        {generating ? (
          <div className="cc-stage__loading">
            <div className="cc-stage__loading-pulse" aria-hidden />
            <p>{statusMessage}</p>
            <p className="cc-stage__loading-hint">Usually 1–5 minutes. Do not close this tab.</p>
          </div>
        ) : null}

        {hasFronts && project && !generating ? (
          <ContentCreatorGallery
            project={project}
            busy={busy}
            onSelectFront={(promptId) => void projectOp({ op: "setSelectedConcept", promptId })}
            onSelectBack={(promptId) => void projectOp({ op: "setSelectedBack", promptId })}
          />
        ) : null}
      </main>

      <aside className={`cc-drawer${drawerOpen ? " cc-drawer--open" : ""}`} aria-label="Event details">
        <div className="cc-drawer__head">
          <h2>Event details</h2>
          <button type="button" className="cc-drawer__close" onClick={() => setDrawerOpen(false)}>
            Close
          </button>
        </div>
        <div className="cc-drawer__body">
          <label className="cc-drawer__field">
            <span>Event name</span>
            <input value={event} onChange={(e) => setEvent(e.target.value)} />
          </label>
          <label className="cc-drawer__field">
            <span>Venue</span>
            <input value={venue} onChange={(e) => setVenue(e.target.value)} />
          </label>
          <label className="cc-drawer__field">
            <span>Date</span>
            <input value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="cc-drawer__field">
            <span>Pass type</span>
            <select
              value={passTypeLabel}
              onChange={(e) => setPassTypeLabel(normalizePassTypeLabel(e.target.value))}
            >
              {CONTROLLED_PASS_TYPE_LABELS.map((label) => (
                <option key={label} value={label}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="cc-drawer__field">
            <span>QR URL</span>
            <input value={qrUrl} onChange={(e) => setQrUrl(e.target.value)} />
          </label>
          <label className="cc-drawer__field">
            <span>Quantity</span>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Number.parseInt(e.target.value, 10) || 1)}
            />
          </label>
        </div>
      </aside>
      {exportResult && project ? (
        <ExportCompletePanel
          projectId={project.id}
          exportResult={exportResult}
          onDismiss={() => setExportResult(null)}
        />
      ) : null}

      {drawerOpen ? (
        <button
          type="button"
          className="cc-drawer__scrim"
          aria-label="Close event details"
          onClick={() => setDrawerOpen(false)}
        />
      ) : null}
    </div>
  );
}
