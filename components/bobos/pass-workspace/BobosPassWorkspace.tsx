"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { buildBobosPrintSheetsForPasses, generateBobosPassBatch } from "@/app/bobos/pass-workspace/actions";
import "@/components/ops/event-studio/pass-studio/pass-studio.css";
import type { PassWorkspaceTemplate } from "@/lib/bobos/project-zero/load-pass-workspace-data";
import type { PassArtworkAdjustments } from "@/lib/bobos/project-zero/pass-artwork-adjustments";
import type { BobosPrintSheetSet } from "@/lib/bobos/project-zero/pass-production";
import type { PassWorkspaceSlug, PassWorkspaceVersion } from "@/lib/bobos/project-zero/pass-workspace-store";
import type { GeneratedPass } from "@/lib/ops/event-studio/pass-studio/types";

import { BobosPassPreview } from "./BobosPassPreview";
import { BobosPrintSheets } from "./BobosPrintSheets";
import { PassArtworkPanel } from "./PassArtworkPanel";
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

type Props = {
  projectId: string;
  context: { title: string; venue: string; date: string; theme: string };
  initialTemplates: PassWorkspaceTemplate[];
  initialLibrary: GeneratedPass[];
};

/** Pass Studio, owned by BobOS — the project's Shared Context is already known, so there is
 *  no event picker and no wizard. Every pass type starts empty; artwork only exists once
 *  Generate is explicitly run for THIS project. */
export function BobosPassWorkspace({ projectId, context, initialTemplates, initialLibrary }: Props) {
  const router = useRouter();
  const [templates, setTemplates] = useState<PassWorkspaceTemplate[]>(initialTemplates);
  const [library, setLibrary] = useState<GeneratedPass[]>(initialLibrary);
  const [lastGenerated, setLastGenerated] = useState<GeneratedPass[]>([]);

  const [quantities, setQuantities] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    for (const template of initialTemplates) map[template.id] = defaultQuantityFor(template);
    return map;
  });

  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const [printSheets, setPrintSheets] = useState<BobosPrintSheetSet | null>(null);
  const [sheetsStatus, setSheetsStatus] = useState<"idle" | "building" | "ready" | "error">("idle");
  const [sheetsError, setSheetsError] = useState<string | null>(null);

  const [previewIndex, setPreviewIndex] = useState(0);
  /** Bumped whenever Print Boost changes refresh the finished images on disk at their
   *  existing URLs — forces the preview <img> tags to re-fetch instead of showing a
   *  browser-cached, pre-adjustment copy. */
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
            }
          : t,
      ),
    );
  }

  function handleAdjustmentsChange(slug: PassWorkspaceSlug, adjustments: PassArtworkAdjustments) {
    setTemplates((prev) => prev.map((t) => (t.slug === slug ? { ...t, adjustments } : t)));
  }

  async function handleGenerateBatch() {
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
      });
      setLastGenerated(result.passes);
      setLibrary((prev) => [...prev, ...result.passes]);
      setPrintSheets(result.printSheets);
      setSheetsStatus("ready");
      setSheetsError(null);
      setPreviewIndex(0);
      setPreviewNonce((n) => n + 1);
      requestAnimationFrame(() => {
        document.getElementById("pzw-open-sheets")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
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
      const sheets = await buildBobosPrintSheetsForPasses(projectId, activeSet);
      setPrintSheets(sheets);
      setSheetsStatus("ready");
      setPreviewNonce((n) => n + 1);
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
      <h1 className="ps-workspace__title">Pass Workspace</h1>

      <div className="pzw-context">
        <div className="pzw-context__item">
          <span className="pzw-context__label">Event</span>
          <span className="pzw-context__value">{context.title || "Untitled event"}</span>
        </div>
        <div className="pzw-context__item">
          <span className="pzw-context__label">Venue</span>
          <span className="pzw-context__value">{context.venue || "—"}</span>
        </div>
        <div className="pzw-context__item">
          <span className="pzw-context__label">Date</span>
          <span className="pzw-context__value">{context.date || "—"}</span>
        </div>
        <div className="pzw-context__item">
          <span className="pzw-context__label">Theme</span>
          <span className="pzw-context__value">{context.theme || "—"}</span>
        </div>
      </div>

      <PassArtworkPanel
        projectId={projectId}
        context={context}
        templates={templates}
        quantities={quantities}
        onQuantityChange={handleQuantityChange}
        onVersionCreated={handleVersionCreated}
        onAdjustmentsChange={handleAdjustmentsChange}
        generating={generating}
        generateError={generateError}
        onGenerate={() => void handleGenerateBatch()}
      />

      <div className="pzw-section pzw-panel">
        <BobosPassPreview
          passes={activeSet}
          index={previewIndex}
          onIndexChange={setPreviewIndex}
          cacheBust={previewNonce}
        />
      </div>

      <div className="pzw-section pzw-panel">
        <BobosPrintSheets
          passCount={activeSet.length}
          sheets={printSheets}
          status={sheetsStatus}
          error={sheetsError}
          onBuild={() => void handleBuildPrintSheets()}
          onDone={() => router.push(`/bobos/project/${projectId}`)}
        />
      </div>
    </div>
  );
}
