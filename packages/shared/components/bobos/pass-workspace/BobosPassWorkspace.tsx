"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import {
  buildBobosPrintSheetsForPasses,
  generateBobosPassBatch,
  savePassCreativeBrief,
  savePrintSheetGrid,
} from "@/app/bobos/pass-workspace/actions";
import "@/components/bobos/pass-studio/pass-studio.css";
import type { PassCreativeBrief as PassCreativeBriefData } from "@/lib/bobos/project-zero/creative-brief";
import type { PassWorkspaceTemplate } from "@/lib/bobos/project-zero/load-pass-workspace-data";
import type { PassArtworkAdjustments } from "@/lib/bobos/project-zero/pass-artwork-adjustments";
import type { BobosPrintSheetSet } from "@/lib/bobos/project-zero/pass-production-spec";
import type { ProductionLayout } from "@/lib/bobos/project-zero/production-layout";
import type { PrintSheetGridId } from "@/lib/bobos/project-zero/print-sheet-grid";
import { PASS_WORKSPACE_SLUGS, type PassWorkspaceSlug } from "@/lib/bobos/project-zero/pass-workspace-slugs";
import type { PassWorkspaceVersion } from "@/lib/bobos/project-zero/pass-workspace-store";
import type { GeneratedPass } from "@/lib/bobos/pass-studio/types";

import { BobosPassPreview } from "./BobosPassPreview";
import { BobosPrintSheets } from "./BobosPrintSheets";
import { BuildPrintSheetsPanel } from "./BuildPrintSheetsPanel";
import { IssuePassesPanel } from "./IssuePassesPanel";
import { PassArtworkPanel } from "./PassArtworkPanel";
import { PassCreativeBrief, type RvbrEraOption } from "./PassCreativeBrief";
import { ProductionLayoutEditor } from "./ProductionLayoutEditor";
import "./bobos-pass-workspace.css";

const DEFAULT_QUANTITY_BY_PASS_TYPE: Record<string, number> = {
  general: 10,
  vip: 2,
  backstage: 2,
};

function passTypeLabel(template: PassWorkspaceTemplate): string {
  return template.name.replace(/\s+Pass$/i, "").trim() || template.name;
}

function defaultQuantityFor(template: PassWorkspaceTemplate): number {
  const key = passTypeLabel(template).toLowerCase();
  return DEFAULT_QUANTITY_BY_PASS_TYPE[key] ?? 5;
}

type LayoutsBySlug = Record<PassWorkspaceSlug, ProductionLayout>;

type Props = {
  projectId: string;
  context: { title: string; venue: string; date: string; theme: string };
  initialTemplates: PassWorkspaceTemplate[];
  initialLibrary: GeneratedPass[];
  initialCreative: PassCreativeBriefData;
  initialProductionLayouts: LayoutsBySlug;
  initialPrintSheetGrid: PrintSheetGridId;
  initialNextSerial: number;
  eras: RvbrEraOption[];
};

export function BobosPassWorkspace({
  projectId,
  context,
  initialTemplates,
  initialLibrary,
  initialCreative,
  initialProductionLayouts,
  initialPrintSheetGrid,
  initialNextSerial,
  eras,
}: Props) {
  const [templates, setTemplates] = useState<PassWorkspaceTemplate[]>(initialTemplates);
  const [library, setLibrary] = useState<GeneratedPass[]>(initialLibrary);
  const [lastGenerated, setLastGenerated] = useState<GeneratedPass[]>([]);

  const [brief, setBrief] = useState<PassCreativeBriefData>(initialCreative);
  // Every pass type owns an independent Production Layout — saved and draft per slug.
  const [savedLayouts, setSavedLayouts] = useState<LayoutsBySlug>(initialProductionLayouts);
  const [draftLayouts, setDraftLayouts] = useState<LayoutsBySlug>(initialProductionLayouts);
  const [activeLayoutSlug, setActiveLayoutSlug] = useState<PassWorkspaceSlug>("general");
  const [printSheetGrid, setPrintSheetGrid] = useState<PrintSheetGridId>(initialPrintSheetGrid);

  const layoutDirty = PASS_WORKSPACE_SLUGS.some(
    (slug) => JSON.stringify(savedLayouts[slug]) !== JSON.stringify(draftLayouts[slug]),
  );

  const briefSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gridSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (briefSaveTimer.current) clearTimeout(briefSaveTimer.current);
      if (gridSaveTimer.current) clearTimeout(gridSaveTimer.current);
    };
  }, []);

  function handleBriefChange(next: PassCreativeBriefData) {
    setBrief(next);
    if (briefSaveTimer.current) clearTimeout(briefSaveTimer.current);
    briefSaveTimer.current = setTimeout(() => {
      void savePassCreativeBrief(projectId, next);
    }, 400);
  }

  const [quantities, setQuantities] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    for (const template of initialTemplates) map[template.id] = defaultQuantityFor(template);
    return map;
  });

  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [nextSerial, setNextSerial] = useState(initialNextSerial);

  const [printSheets, setPrintSheets] = useState<BobosPrintSheetSet | null>(null);
  const [sheetsStatus, setSheetsStatus] = useState<"idle" | "building" | "ready" | "error">("idle");
  const [sheetsError, setSheetsError] = useState<string | null>(null);

  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewNonce, setPreviewNonce] = useState(0);

  const activeSet = lastGenerated.length > 0 ? lastGenerated : library;

  function handleQuantityChange(templateId: string, quantity: number) {
    setQuantities((prev) => ({ ...prev, [templateId]: quantity }));
  }

  function handleVersionCreated(slug: PassWorkspaceSlug, version: PassWorkspaceVersion) {
    setTemplates((prev) =>
      prev.map((t) =>
        t.slug === slug
          ? {
              ...t,
              version: version.version,
              generationId: version.generationId,
              frontArtworkUrl: version.frontArtworkUrl,
              backArtworkUrl: version.backArtworkUrl,
              history: [...t.history, version],
              approved: false,
            }
          : t,
      ),
    );
  }

  function handleApproved(slug: PassWorkspaceSlug) {
    setTemplates((prev) => prev.map((t) => (t.slug === slug ? { ...t, approved: true } : t)));
  }

  function handleAdjustmentsChange(slug: PassWorkspaceSlug, adjustments: PassArtworkAdjustments) {
    setTemplates((prev) => prev.map((t) => (t.slug === slug ? { ...t, adjustments } : t)));
  }

  function handleLayoutDraftChange(slug: PassWorkspaceSlug, layout: ProductionLayout) {
    setDraftLayouts((prev) => ({ ...prev, [slug]: layout }));
  }

  function handleLayoutSaved(slug: PassWorkspaceSlug, layout: ProductionLayout) {
    setSavedLayouts((prev) => ({ ...prev, [slug]: layout }));
    setDraftLayouts((prev) => ({ ...prev, [slug]: layout }));
  }

  function handlePrintSheetGridChange(gridId: PrintSheetGridId) {
    setPrintSheetGrid(gridId);
    setPrintSheets(null);
    setSheetsStatus("idle");
    setSheetsError(null);
    if (gridSaveTimer.current) clearTimeout(gridSaveTimer.current);
    gridSaveTimer.current = setTimeout(() => {
      void savePrintSheetGrid(projectId, gridId);
    }, 300);
  }

  async function handleIssuePasses(startAt: number | null) {
    setGenerating(true);
    setGenerateError(null);
    try {
      const rows = templates
        .map((template) => ({
          templateId: template.id,
          passType: passTypeLabel(template),
          quantity: quantities[template.id] ?? 0,
          generationId: template.generationId,
          frontArtworkUrl: template.frontArtworkUrl,
          backArtworkUrl: template.backArtworkUrl,
        }))
        .filter((row) => row.quantity > 0);

      const result = await generateBobosPassBatch({
        projectId,
        eventName: context.title,
        venue: context.venue,
        date: context.date,
        rows,
        startAt,
      });
      setNextSerial(result.batch.serialEnd + 1);
      setLastGenerated(result.passes);
      setLibrary((prev) => [...prev, ...result.passes]);
      setPrintSheets(null);
      setSheetsStatus("idle");
      setSheetsError(null);
      setPreviewIndex(0);
      setPreviewNonce((n) => n + 1);
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "Generate failed");
    } finally {
      setGenerating(false);
    }
  }

  async function handleBuildPrintSheets() {
    if (activeSet.length === 0) return;
    setSheetsStatus("building");
    setSheetsError(null);
    try {
      const sheets = await buildBobosPrintSheetsForPasses(projectId, activeSet, printSheetGrid);
      setPrintSheets(sheets);
      setSheetsStatus("ready");
    } catch (err) {
      setSheetsStatus("error");
      setSheetsError(err instanceof Error ? err.message : "Could not build print sheets");
    }
  }

  return (
    <div className="ps-workspace pzw-workspace">
      <Link href={`/bobos/project/${projectId}`} className="ps-back-link">
        ← Return to Project
      </Link>
      <p className="ps-workspace__kicker">BobOS</p>
      <h1 className="ps-workspace__title">Pass Workspace</h1>

      <PassCreativeBrief brief={brief} eras={eras} onChange={handleBriefChange} />

      <PassArtworkPanel
        projectId={projectId}
        brief={brief}
        onBriefChange={handleBriefChange}
        templates={templates}
        onVersionCreated={handleVersionCreated}
        onApproved={handleApproved}
        onAdjustmentsChange={handleAdjustmentsChange}
      />

      <div className="pzw-section">
        <ProductionLayoutEditor
          projectId={projectId}
          templates={templates}
          activeSlug={activeLayoutSlug}
          onActiveSlugChange={setActiveLayoutSlug}
          savedLayouts={savedLayouts}
          draftLayouts={draftLayouts}
          onDraftChange={handleLayoutDraftChange}
          onSaved={handleLayoutSaved}
        />
      </div>

      <IssuePassesPanel
        templates={templates}
        quantities={quantities}
        onQuantityChange={handleQuantityChange}
        nextSerial={nextSerial}
        generating={generating}
        generateError={generateError}
        layoutDirty={layoutDirty}
        onIssue={(startAt) => void handleIssuePasses(startAt)}
      />

      <BobosPassPreview
        passes={activeSet}
        index={previewIndex}
        onIndexChange={setPreviewIndex}
        cacheBust={previewNonce}
      />

      <BuildPrintSheetsPanel
        passCount={activeSet.length}
        gridId={printSheetGrid}
        onGridChange={handlePrintSheetGridChange}
        status={sheetsStatus}
        error={sheetsError}
        sheetCount={printSheets?.sheetCount ?? null}
        onBuild={() => void handleBuildPrintSheets()}
      />

      <BobosPrintSheets sheets={printSheets} />
    </div>
  );
}
