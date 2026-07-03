"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import {
  createPassTemplate,
  generatePassBatch,
  regeneratePassTemplateArtwork,
  type NewPassTemplateInput,
} from "@/app/ops/event-studio/create/pass-generator/actions";
import type { GeneratedPass, PassTemplate } from "@/lib/ops/event-studio/pass-studio/types";

import "./pass-studio.css";
import { DesignsStep } from "./steps/DesignsStep";
import { EventStep } from "./steps/EventStep";
import { PreviewStep } from "./steps/PreviewStep";
import { PrintStep } from "./steps/PrintStep";
import { QuantitiesStep, type DraftRow } from "./steps/QuantitiesStep";

type Step = "event" | "designs" | "quantities" | "preview" | "print";

const STEPS: { id: Step; number: number; label: string }[] = [
  { id: "event", number: 1, label: "Event" },
  { id: "designs", number: 2, label: "Designs" },
  { id: "quantities", number: 3, label: "How Many" },
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
};

export function PassStudioWorkspace({ event, initialTemplates, initialLibrary }: Props) {
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

  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

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

  async function handleGenerate() {
    setGenerating(true);
    setGenerateError(null);
    try {
      const result = await generatePassBatch({
        eventName: event.eventName,
        venue: event.venue,
        date: event.date,
        rows: rows.map((row) => ({ passType: row.passType, quantity: row.quantity, templateId: row.templateId })),
      });
      setLastGenerated(result.passes);
      setLibrary((prev) => [...prev, ...result.passes]);
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
      <h1 className="ps-workspace__title">Pass Studio</h1>

      <nav className="ps-rail" aria-label="Pass Studio production steps">
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
          onContinue={() => setStep("quantities")}
        />
      </div>

      <div className={`ps-workspace__panel${step === "quantities" ? "" : " ps-workspace__panel--hidden"}`}>
        <QuantitiesStep
          rows={rows}
          onQuantityChange={handleQuantityChange}
          perSheet={perSheet}
          busy={generating}
          error={generateError}
          onGenerate={() => void handleGenerate()}
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
          passes={activeSet}
          templates={templates}
          perSheet={perSheet}
          onPerSheetChange={setPerSheet}
          onDone={() => setStep("event")}
        />
      </div>
    </div>
  );
}
