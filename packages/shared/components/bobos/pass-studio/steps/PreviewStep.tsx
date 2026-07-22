"use client";

import { useEffect, useState } from "react";

import { PassFace } from "../PassFace";

import type { GeneratedPass, PassTemplate } from "@/lib/bobos/pass-studio/types";

type Props = {
  passes: GeneratedPass[];
  templates: PassTemplate[];
  index: number;
  onIndexChange: (index: number) => void;
};

const STATUS_LABEL: Record<string, string> = {
  available: "Available",
  registered: "Registered",
  checked_in: "Checked In",
  archived: "Archived",
};

/** Step 4 — one pass, nearly full screen. Nothing else. */
export function PreviewStep({ passes, templates, index, onIndexChange }: Props) {
  const [side, setSide] = useState<"front" | "back">("front");
  const [showLibrary, setShowLibrary] = useState(false);

  useEffect(() => {
    setSide("front");
  }, [index]);

  if (passes.length === 0) {
    return (
      <div className="ps-step ps-step--center">
        <p className="ps-step__eyebrow">Step 4 of 5</p>
        <h2 className="ps-step__title">Preview</h2>
        <p className="ps-step__hint">Generate a batch to preview passes here.</p>
      </div>
    );
  }

  const clampedIndex = Math.min(Math.max(0, index), passes.length - 1);
  const pass = passes[clampedIndex]!;
  const template = templates.find((t) => t.id === pass.templateId);

  return (
    <div className="ps-step">
      <div className="ps-preview">
        <div className="ps-preview__face-wrap">
          <PassFace pass={pass} template={template} side={side} />
        </div>

        <div className="ps-preview__info">
          <p className="ps-preview__serial">No. {pass.serial}</p>
          <p className="ps-preview__type">{pass.passType}</p>
          <p className="ps-preview__status">{STATUS_LABEL[pass.status] ?? pass.status}</p>
          {pass.qr.url ? <p className="ps-preview__qr-url">{pass.qr.url}</p> : null}

          <div className="ps-preview__toggle">
            <button
              type="button"
              className={`ps-btn ps-btn--hero${side === "front" ? " ps-btn--primary" : ""}`}
              onClick={() => setSide("front")}
            >
              Front
            </button>
            <button
              type="button"
              className={`ps-btn ps-btn--hero${side === "back" ? " ps-btn--primary" : ""}`}
              onClick={() => setSide("back")}
            >
              Back
            </button>
          </div>

          <div className="ps-preview__nav">
            <button
              type="button"
              className="ps-btn ps-btn--hero"
              disabled={clampedIndex === 0}
              onClick={() => onIndexChange(clampedIndex - 1)}
            >
              Previous
            </button>
            <button
              type="button"
              className="ps-btn ps-btn--hero"
              disabled={clampedIndex === passes.length - 1}
              onClick={() => onIndexChange(clampedIndex + 1)}
            >
              Next
            </button>
          </div>

          <p className="ps-preview__counter">
            Pass {clampedIndex + 1} of {passes.length}
          </p>
        </div>
      </div>

      <button type="button" className="ps-btn ps-btn--quiet" onClick={() => setShowLibrary((v) => !v)}>
        {showLibrary ? "Hide Pass Library" : "View Pass Library"}
      </button>

      {showLibrary ? (
        <div className="ps-library">
          <table className="ps-library__table">
            <thead>
              <tr>
                <th>Serial</th>
                <th>Type</th>
                <th>Status</th>
                <th>Registrant</th>
                <th>Registration Date</th>
              </tr>
            </thead>
            <tbody>
              {passes.map((p, i) => (
                <tr
                  key={p.id}
                  className={i === clampedIndex ? "is-active" : undefined}
                  onClick={() => onIndexChange(i)}
                >
                  <td>{p.serial}</td>
                  <td>{p.passType}</td>
                  <td>{STATUS_LABEL[p.status] ?? p.status}</td>
                  <td>
                    {p.registration ? `${p.registration.firstName} ${p.registration.lastName}`.trim() : "—"}
                  </td>
                  <td>{p.registration ? new Date(p.registration.registeredAt).toLocaleString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
