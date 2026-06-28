"use client";

import { useOperatorGuideOptional } from "./OperatorGuideProvider";

export function OperatorGuideToggle() {
  const guide = useOperatorGuideOptional();
  if (!guide) return null;

  const { enabled, toggle } = guide;

  return (
    <button
      type="button"
      className={`rs-guide-toggle ${enabled ? "rs-guide-toggle--on" : ""}`}
      onClick={toggle}
      aria-pressed={enabled}
      title={enabled ? "Turn off Operator Guide" : "Turn on Operator Guide — explain metrics and panels"}
    >
      <span className="rs-guide-toggle__icon" aria-hidden>
        ?
      </span>
      <span className="rs-guide-toggle__label">Operator Guide</span>
    </button>
  );
}
