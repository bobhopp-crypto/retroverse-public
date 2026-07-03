"use client";

import { useMemo, useState } from "react";

import type { PassWorkspaceTemplate } from "@/lib/bobos/project-zero/load-pass-workspace-data";
import { computeBatchRows, padSerial, totalPassesForRows } from "@/lib/ops/event-studio/pass-studio/serials";

function passTypeLabel(template: PassWorkspaceTemplate): string {
  return template.name.replace(/\s+Pass$/i, "").trim() || template.name;
}

type StartMode = "next" | "custom";

type Props = {
  templates: PassWorkspaceTemplate[];
  quantities: Record<string, number>;
  onQuantityChange: (templateId: string, quantity: number) => void;
  nextSerial: number;
  generating: boolean;
  generateError: string | null;
  layoutDirty: boolean;
  onIssue: (startAt: number | null) => void;
};

/**
 * Issue Passes — creates the numbered inventory. Quantities per pass type, a starting
 * serial choice, and the estimated serial range each type will receive. Printing never
 * creates serials; only this step does.
 */
export function IssuePassesPanel({
  templates,
  quantities,
  onQuantityChange,
  nextSerial,
  generating,
  generateError,
  layoutDirty,
  onIssue,
}: Props) {
  const [startMode, setStartMode] = useState<StartMode>("next");
  const [customStart, setCustomStart] = useState(nextSerial);

  const startAt = startMode === "custom" ? Math.max(1, customStart) : nextSerial;

  const estimate = useMemo(() => {
    const draftRows = templates.map((t) => ({
      id: t.id,
      passType: passTypeLabel(t),
      quantity: quantities[t.id] ?? 0,
      templateId: t.id,
    }));
    const rows = computeBatchRows(draftRows, startAt);
    return {
      rows,
      totalPasses: totalPassesForRows(draftRows),
      missingArtwork: templates.filter(
        (t) => (quantities[t.id] ?? 0) > 0 && (!t.generationId || !t.frontArtworkUrl),
      ),
    };
  }, [templates, quantities, startAt]);

  const canIssue = estimate.totalPasses > 0 && estimate.missingArtwork.length === 0 && !generating;

  return (
    <section className="pzw-section pzw-batch" aria-label="Issue Passes">
      <h2 className="ps-step__title">4 · Issue Passes</h2>
      <p className="pzw-batch__hint">
        Creates the numbered inventory — each pass gets its own serial and QR code. Printing
        never creates new numbers.
      </p>

      <div className="pzw-issue__grid">
        <div className="pzw-issue__quantities">
          {templates.map((template) => (
            <label key={template.id} className="pzw-issue__qty">
              <span>{passTypeLabel(template)} Quantity</span>
              <input
                type="number"
                min={0}
                value={quantities[template.id] ?? 0}
                onChange={(e) =>
                  onQuantityChange(template.id, Math.max(0, Math.floor(Number(e.target.value)) || 0))
                }
              />
            </label>
          ))}
        </div>

        <fieldset className="pzw-issue__start">
          <legend>Starting Serial</legend>
          <label className="pzw-issue__radio">
            <input
              type="radio"
              name="pzw-start-mode"
              checked={startMode === "next"}
              onChange={() => setStartMode("next")}
            />
            <span>
              Continue from Next Available <em>({padSerial(nextSerial)})</em>
            </span>
          </label>
          <label className="pzw-issue__radio">
            <input
              type="radio"
              name="pzw-start-mode"
              checked={startMode === "custom"}
              onChange={() => setStartMode("custom")}
            />
            <span>Custom Starting Serial</span>
          </label>
          {startMode === "custom" ? (
            <input
              className="pzw-issue__custom-start"
              type="number"
              min={1}
              value={customStart}
              aria-label="Custom starting serial"
              onChange={(e) => setCustomStart(Math.max(1, Math.floor(Number(e.target.value)) || 1))}
            />
          ) : null}
        </fieldset>

        <div className="pzw-issue__ranges">
          <span className="pzw-issue__ranges-title">Estimated Serial Range</span>
          {estimate.totalPasses > 0 ? (
            <dl className="pzw-issue__ranges-list">
              {estimate.rows
                .filter((row) => row.quantity > 0)
                .map((row) => (
                  <div key={row.id} className="pzw-issue__range">
                    <dt>{row.passType}</dt>
                    <dd>
                      {padSerial(row.firstSerial)}–{padSerial(row.lastSerial)}
                    </dd>
                  </div>
                ))}
              <div className="pzw-issue__range pzw-issue__range--total">
                <dt>Total</dt>
                <dd>{estimate.totalPasses} passes</dd>
              </div>
            </dl>
          ) : (
            <p className="pzw-issue__ranges-empty">Set a quantity to see the serial range.</p>
          )}
        </div>
      </div>

      {estimate.missingArtwork.length > 0 ? (
        <p className="ps-step__error">
          Generate artwork for: {estimate.missingArtwork.map((t) => t.name).join(", ")}
        </p>
      ) : null}

      {layoutDirty ? (
        <p className="pzw-batch__warn">
          Save the Production Layout above first — passes are issued with the last saved layout.
        </p>
      ) : null}

      {generateError ? <p className="ps-step__error">{generateError}</p> : null}

      <button
        type="button"
        className="ps-btn ps-btn--primary ps-btn--hero"
        disabled={!canIssue}
        onClick={() => onIssue(startMode === "custom" ? Math.max(1, customStart) : null)}
      >
        {generating ? "Issuing Passes…" : "Issue Passes"}
      </button>
    </section>
  );
}
