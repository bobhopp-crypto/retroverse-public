"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { RvIdPageTitle } from "@/components/bobos/rv-ids";

import {
  createPassTemplate,
  generateDesignBuilderPassBatch,
  regeneratePassTemplateArtwork,
  type NewPassTemplateInput,
} from "@/app/ops/event-studio/create/pass-generator/actions";
import type { ProductionLayout } from "@/lib/bobos/project-zero/production-layout";
import type { PassWorkspaceSlug } from "@/lib/bobos/project-zero/pass-workspace-slugs";
import { designBuilderProjectId } from "@/lib/ops/event-studio/pass-studio/design-builder-workspace";
import type { PrintBatch } from "@/lib/ops/event-studio/pass-studio/print-batch-types";
import type { GeneratedPass, PassTemplate } from "@/lib/ops/event-studio/pass-studio/types";

import "./pass-studio.css";
import { DesignsStep } from "./steps/DesignsStep";
import { EditStep } from "./steps/EditStep";
import { EventStep } from "./steps/EventStep";
import { PreviewStep } from "./steps/PreviewStep";
import { PrintStep } from "./steps/PrintStep";
import type { DraftRow } from "./steps/QuantitiesStep";

type Step = "event" | "designs" | "edit" | "preview" | "print";

type LayoutsBySlug = Record<PassWorkspaceSlug, ProductionLayout>;

const STEPS: { id: Step; number: number; label: string }[] = [
  { id: "event", number: 1, label: "Event" },
  { id: "designs", number: 2, label: "Designs" },
  { id: "edit", number: 3, label: "Edit" },
  { id: "preview", number: 4, label: "Preview" },
  { id: "print", number: 5, label: "Print" },
];

/** Approximate real-world mix for the producer defaults; anything else starts at 5. */
const DEFAULT_QUANTITY_BY_PASS_TYPE: Record<string, number> = {
  general: 10,
  vip: 2,
  backstage: 2,
};

function passTypeLabel(template: PassTemplate): string {
  return template.name.replace(/\s+Pass$/i, "").trim() || template.name;
}

function defaultQuantityFor(template: PassTemplate): number {
  const key = passTypeLabel(template).toLowerCase();
  return DEFAULT_QUANTITY_BY_PASS_TYPE[key] ?? 5;
}

type Props = {
  event: { eventName: string; venue: string; date: string };
  initialTemplates: PassTemplate[];
  initialLibrary: GeneratedPass[];
  initialProductionLayouts: LayoutsBySlug;
  initialNextSerial: number;
};

export function PassStudioWorkspace({
  event,
  initialTemplates,
  initialLibrary,
  initialProductionLayouts,
  initialNextSerial,
}: Props) {
  const projectId = designBuilderProjectId(event.eventName);
  const [step, setStep] = useState<Step>("event");
  const [templates, setTemplates] = useState<PassTemplate[]>(initialTemplates);
  const [library, setLibrary] = useState<GeneratedPass[]>(initialLibrary);
  const [lastGenerated, setLastGenerated] = useState<GeneratedPass[]>([]);

  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>(
    initialTemplates.map((template) => template.id),
  );
  const [quantities, setQuantities] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    for (const template of initialTemplates) map[template.id] = defaultQuantityFor(template);
    return map;
  });

  const [savedLayouts, setSavedLayouts] = useState<LayoutsBySlug>(initialProductionLayouts);
  const [draftLayouts, setDraftLayouts] = useState<LayoutsBySlug>(initialProductionLayouts);
  const [nextSerial, setNextSerial] = useState(initialNextSerial);
  const [printBatch, setPrintBatch] = useState<PrintBatch | null>(null);

  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const layoutDirty = (["general", "vip", "backstage"] as PassWorkspaceSlug[]).some(
    (slug) => JSON.stringify(savedLayouts[slug]) !== JSON.stringify(draftLayouts[slug]),
  );

  const [previewIndex, setPreviewIndex] = useState(0);
  const [perSheet, setPerSheet] = useState<2 | 4 | 8>(4);

  const [templateBusy, setTemplateBusy] = useState(false);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

  const rows: DraftRow[] = useMemo(
    () =>
      selectedTemplateIds
        .map((id) => templates.find((t) => t.id === id))
        .filter((t): t is PassTemplate => Boolean(t))
        .map((template) => ({
          templateId: template.id,
          passType: passTypeLabel(template),
          quantity: quantities[template.id] ?? 0,
        })),
    [selectedTemplateIds, templates, quantities],
  );

  const activeSet = lastGenerated.length > 0 ? lastGenerated : library;
  const canPreview = activeSet.length > 0;

  function handleToggleTemplate(templateId: string, next: boolean) {
    setSelectedTemplateIds((prev) => {
      if (next) return prev.includes(templateId) ? prev : [...prev, templateId];
      return prev.filter((id) => id !== templateId);
    });
    setQuantities((prev) => {
      if (prev[templateId] !== undefined) return prev;
      const template = templates.find((t) => t.id === templateId);
      return template ? { ...prev, [templateId]: defaultQuantityFor(template) } : prev;
    });
  }

  function handleQuantityChange(templateId: string, quantity: number) {
    setQuantities((prev) => ({ ...prev, [templateId]: Math.max(0, Math.floor(quantity) || 0) }));
  }

  function handleLayoutDraftChange(slug: PassWorkspaceSlug, layout: ProductionLayout) {
    setDraftLayouts((prev) => ({ ...prev, [slug]: layout }));
  }

  function handleLayoutSaved(slug: PassWorkspaceSlug, layout: ProductionLayout) {
    setSavedLayouts((prev) => ({ ...prev, [slug]: layout }));
    setDraftLayouts((prev) => ({ ...prev, [slug]: layout }));
  }

  async function handleGenerate(startAt: number | null) {
    setGenerating(true);
    setGenerateError(null);
    try {
      const templateById = new Map(templates.map((template) => [template.id, template]));
      const result = await generateDesignBuilderPassBatch({
        projectId,
        eventName: event.eventName,
        venue: event.venue,
        date: event.date,
        rows: rows.map((row) => {
          const template = templateById.get(row.templateId)!;
          return {
            passType: row.passType,
            quantity: row.quantity,
            templateId: row.templateId,
            generationId: template.generationId,
            frontArtworkUrl: template.frontArtworkUrl,
            backArtworkUrl: template.backArtworkUrl,
          };
        }),
        startAt,
      });
      setNextSerial(result.batch.serialEnd + 1);
      setLastGenerated(result.passes);
      setLibrary((prev) => [...prev, ...result.passes]);
      setPrintBatch(result.printBatch);
      setPreviewIndex(0);
      setStep("preview");
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "Generate failed");
    } finally {
      setGenerating(false);
    }
  }

  async function handleCreateTemplate(input: NewPassTemplateInput) {
    setTemplateBusy(true);
    try {
      const template = await createPassTemplate(input);
      setTemplates((prev) => [template, ...prev]);
      setSelectedTemplateIds((prev) => [...prev, template.id]);
      setQuantities((prev) => ({ ...prev, [template.id]: defaultQuantityFor(template) }));
    } finally {
      setTemplateBusy(false);
    }
  }

  async function handleRegenerateArtwork(templateId: string) {
    setRegeneratingId(templateId);
    try {
      const updated = await regeneratePassTemplateArtwork(templateId);
      setTemplates((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } finally {
      setRegeneratingId(null);
    }
  }

  return (
    <div className="ps-workspace">
      <Link href="/bobos/event" className="ps-back-link">
        ← Event Hub
      </Link>
      <p className="ps-workspace__kicker">BobOS</p>
      <RvIdPageTitle rvId="RV02-03" label="Design Builder" className="ps-workspace__title" />

      <nav className="ps-rail" aria-label="Design Builder production steps">
        {STEPS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`ps-rail__step${step === item.id ? " is-active" : ""}`}
            aria-current={step === item.id ? "step" : undefined}
            disabled={(item.id === "preview" || item.id === "print") && !canPreview}
            onClick={() => setStep(item.id)}
          >
            <span className="ps-rail__number">{item.number}</span>
            <span className="ps-rail__label">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className={`ps-workspace__panel${step === "event" ? "" : " ps-workspace__panel--hidden"}`}>
        <EventStep event={event} onContinue={() => setStep("designs")} />
      </div>

      <div className={`ps-workspace__panel${step === "designs" ? "" : " ps-workspace__panel--hidden"}`}>
        <DesignsStep
          event={event}
          templates={templates}
          selectedTemplateIds={selectedTemplateIds}
          onToggleTemplate={handleToggleTemplate}
          onRegenerateArtwork={handleRegenerateArtwork}
          regeneratingId={regeneratingId}
          onCreate={handleCreateTemplate}
          busy={templateBusy}
          onContinue={() => setStep("edit")}
        />
      </div>

      <div className={`ps-workspace__panel${step === "edit" ? "" : " ps-workspace__panel--hidden"}`}>
        <EditStep
          projectId={projectId}
          rows={rows}
          templates={templates}
          savedLayouts={savedLayouts}
          draftLayouts={draftLayouts}
          onDraftLayoutChange={handleLayoutDraftChange}
          onLayoutSaved={handleLayoutSaved}
          onQuantityChange={handleQuantityChange}
          nextSerial={nextSerial}
          perSheet={perSheet}
          busy={generating}
          error={generateError}
          layoutDirty={layoutDirty}
          onGenerate={(startAt) => void handleGenerate(startAt)}
        />
      </div>

      <div className={`ps-workspace__panel${step === "preview" ? "" : " ps-workspace__panel--hidden"}`}>
        <PreviewStep
          passes={activeSet}
          templates={templates}
          index={previewIndex}
          onIndexChange={setPreviewIndex}
        />
      </div>

      <div className={`ps-workspace__panel${step === "print" ? "" : " ps-workspace__panel--hidden"}`}>
        <PrintStep
          projectId={projectId}
          passes={activeSet}
          printBatch={printBatch}
          onPrintBatchChange={setPrintBatch}
          onDone={() => setStep("event")}
        />
      </div>
    </div>
  );
}
