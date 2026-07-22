"use client";

import { useState } from "react";

import type { NewPassTemplateInput } from "@/app/bobos/passes/actions";
import type { GeneratedPass, PassTemplate } from "@/lib/bobos/pass-studio/types";

import { PassFace } from "../PassFace";

type Props = {
  event: { eventName: string; venue: string; date: string };
  templates: PassTemplate[];
  selectedTemplateIds: string[];
  onToggleTemplate: (templateId: string, next: boolean) => void;
  onRegenerateArtwork: (templateId: string) => Promise<void>;
  regeneratingId: string | null;
  onCreate: (input: NewPassTemplateInput) => Promise<void>;
  busy: boolean;
  onContinue: () => void;
};

const EMPTY_FORM: NewPassTemplateInput = {
  name: "",
  frontArtworkUrl: "",
  backArtworkUrl: "",
  primaryColor: "#1a0f2e",
  secondaryColor: "#ffffff",
  accentColor: "#c494ff",
  headingFont: "",
  bodyFont: "",
  qrSide: "back",
  logoUrl: "",
  backgroundUrl: "",
  style: "Festival Pass",
};

function passTypeLabel(template: PassTemplate): string {
  return template.name.replace(/\s+Pass$/i, "").trim() || template.name;
}

/** Fake, unsaved pass used only to render a large front/back look at a design. */
function buildPreviewPass(template: PassTemplate, event: Props["event"]): GeneratedPass {
  return {
    id: `preview-${template.id}`,
    serial: "0000",
    serialNumber: 0,
    passType: passTypeLabel(template),
    eventId: "preview",
    eventName: event.eventName,
    venue: event.venue,
    date: event.date,
    batchId: "preview",
    templateId: template.id,
    generationId: template.generationId,
    front: { artworkUrl: template.frontArtworkUrl },
    back: { artworkUrl: template.backArtworkUrl },
    qr: { url: "https://retroverse.live/pass/000000", svg: "" },
    status: "available",
    registration: null,
    createdAt: new Date().toISOString(),
  };
}

/** Step 2 — review and select generated pass designs. */
export function DesignsStep({
  event,
  templates,
  selectedTemplateIds,
  onToggleTemplate,
  onRegenerateArtwork,
  regeneratingId,
  onCreate,
  busy,
  onContinue,
}: Props) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [form, setForm] = useState<NewPassTemplateInput>(EMPTY_FORM);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [previewSide, setPreviewSide] = useState<"front" | "back">("front");

  function field<K extends keyof NewPassTemplateInput>(key: K, value: NewPassTemplateInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleCreate() {
    await onCreate(form);
    setForm(EMPTY_FORM);
    setShowAdvanced(false);
  }

  function openPreview(templateId: string) {
    setPreviewSide("front");
    setPreviewingId(templateId);
  }

  const previewingTemplate = templates.find((t) => t.id === previewingId) ?? null;

  return (
    <div className="ps-step">
      <p className="ps-step__eyebrow">Step 2 of 5</p>
      <h2 className="ps-step__title">Gallery</h2>
      <p className="ps-step__hint">Review the generated artwork and choose the design to produce.</p>

      <div className="ps-card-grid">
        {templates.map((template) => {
          const selected = selectedTemplateIds.includes(template.id);
          const regenerating = regeneratingId === template.id;
          return (
            <div key={template.id} className={`ps-card${selected ? " is-selected" : ""}`}>
              <span className="ps-card__art">
                {template.frontArtworkUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={template.frontArtworkUrl} alt="" />
                ) : (
                  <span
                    className="ps-card__art-fallback ps-card__art-fallback--empty"
                    style={{ background: template.colors.primary }}
                  >
                    <span className="ps-card__art-empty-label">No artwork yet</span>
                    <a
                      href="/bobos/passes"
                      className="ps-card__art-generate-link"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Generate Artwork →
                    </a>
                  </span>
                )}
                {selected ? <span className="ps-card__badge">✓ Selected</span> : null}
              </span>
              <span className="ps-card__name">{passTypeLabel(template)} Pass</span>

              <button type="button" className="ps-card__preview" onClick={() => openPreview(template.id)}>
                Preview
              </button>

              <button
                type="button"
                className={`ps-card__use${selected ? " is-selected" : ""}`}
                aria-pressed={selected}
                onClick={() => onToggleTemplate(template.id, !selected)}
              >
                {selected ? "✓ Selected" : "Use This Design"}
              </button>

              <button
                type="button"
                className="ps-card__secondary"
                disabled={regenerating}
                onClick={() => void onRegenerateArtwork(template.id)}
              >
                {regenerating ? "Checking…" : "Refresh from Library"}
              </button>
            </div>
          );
        })}
      </div>

      {showAdvanced ? (
        <div className="ps-admin-panel">
          <h3>Advanced: New Custom Design</h3>
          <p className="ps-step__hint">
            Most events never need this — use it only for manually supplied artwork.
          </p>

          <label className="ps-admin-panel__name">
            <span>Name</span>
            <input type="text" value={form.name} onChange={(e) => field("name", e.target.value)} />
          </label>

          <div className="ps-admin-panel__columns">
            <div className="ps-admin-panel__col">
              <h4>Artwork</h4>
              <label>
                <span>Front artwork URL</span>
                <input
                  type="text"
                  value={form.frontArtworkUrl}
                  onChange={(e) => field("frontArtworkUrl", e.target.value)}
                />
              </label>
              <label>
                <span>Back artwork URL</span>
                <input
                  type="text"
                  value={form.backArtworkUrl}
                  onChange={(e) => field("backArtworkUrl", e.target.value)}
                />
              </label>
              <label>
                <span>Logo URL</span>
                <input type="text" value={form.logoUrl} onChange={(e) => field("logoUrl", e.target.value)} />
              </label>
              <label>
                <span>Background URL</span>
                <input
                  type="text"
                  value={form.backgroundUrl}
                  onChange={(e) => field("backgroundUrl", e.target.value)}
                />
              </label>
            </div>

            <div className="ps-admin-panel__col">
              <h4>Colors, fonts &amp; style</h4>
              <div className="ps-admin-panel__row">
                <label>
                  <span>Primary</span>
                  <input type="color" value={form.primaryColor} onChange={(e) => field("primaryColor", e.target.value)} />
                </label>
                <label>
                  <span>Secondary</span>
                  <input
                    type="color"
                    value={form.secondaryColor}
                    onChange={(e) => field("secondaryColor", e.target.value)}
                  />
                </label>
                <label>
                  <span>Accent</span>
                  <input type="color" value={form.accentColor} onChange={(e) => field("accentColor", e.target.value)} />
                </label>
              </div>
              <div className="ps-admin-panel__row">
                <label>
                  <span>Heading font</span>
                  <input type="text" value={form.headingFont} onChange={(e) => field("headingFont", e.target.value)} />
                </label>
                <label>
                  <span>Body font</span>
                  <input type="text" value={form.bodyFont} onChange={(e) => field("bodyFont", e.target.value)} />
                </label>
              </div>
              <label>
                <span>QR position</span>
                <select value={form.qrSide} onChange={(e) => field("qrSide", e.target.value as "front" | "back")}>
                  <option value="back">Back</option>
                  <option value="front">Front</option>
                </select>
              </label>
              <label>
                <span>Style</span>
                <input type="text" value={form.style} onChange={(e) => field("style", e.target.value)} />
              </label>
            </div>
          </div>

          <div className="ps-admin-panel__actions">
            <button
              type="button"
              className="ps-btn ps-btn--primary ps-btn--large"
              disabled={busy || !form.name.trim()}
              onClick={() => void handleCreate()}
            >
              {busy ? "Saving…" : "Save Design"}
            </button>
            <button type="button" className="ps-btn ps-btn--large" onClick={() => setShowAdvanced(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="ps-btn ps-btn--quiet" onClick={() => setShowAdvanced(true)}>
          + Advanced: Add Custom Design
        </button>
      )}

      <button
        type="button"
        className="ps-btn ps-btn--primary ps-btn--hero"
        disabled={selectedTemplateIds.length === 0}
        onClick={onContinue}
      >
        Continue
      </button>

      {previewingTemplate ? (
        <div className="ps-design-preview" role="dialog" aria-modal="true">
          <button
            type="button"
            className="ps-design-preview__backdrop"
            aria-label="Close preview"
            onClick={() => setPreviewingId(null)}
          />
          <div className="ps-design-preview__panel">
            <button
              type="button"
              className="ps-design-preview__close"
              aria-label="Close preview"
              onClick={() => setPreviewingId(null)}
            >
              ✕
            </button>

            <div className="ps-design-preview__face">
              <PassFace
                pass={buildPreviewPass(previewingTemplate, event)}
                template={previewingTemplate}
                side={previewSide}
              />
            </div>

            <p className="ps-design-preview__name">{passTypeLabel(previewingTemplate)} Pass</p>

            <div className="ps-design-preview__toggle">
              <button
                type="button"
                className={`ps-btn ps-btn--hero${previewSide === "front" ? " ps-btn--primary" : ""}`}
                onClick={() => setPreviewSide("front")}
              >
                Front
              </button>
              <button
                type="button"
                className={`ps-btn ps-btn--hero${previewSide === "back" ? " ps-btn--primary" : ""}`}
                onClick={() => setPreviewSide("back")}
              >
                Back
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
