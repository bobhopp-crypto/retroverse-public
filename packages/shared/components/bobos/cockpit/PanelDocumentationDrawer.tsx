"use client";

import Link from "next/link";
import { useEffect, useId, useRef } from "react";

import { panelManualHref, type PanelDocumentation } from "@/lib/bobos/cockpit/panel-docs";

import { PanelDocumentationView } from "./PanelDocumentationView";

type Props = {
  docs: PanelDocumentation;
  onClose: () => void;
};

/** Operator-manual side sheet for a Cockpit panel. */
export function PanelDocumentationDrawer({ docs, onClose }: Props) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const manualHref = panelManualHref(docs.rvId);

  useEffect(() => {
    closeRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div className="cockpit-docs-backdrop" role="presentation" onClick={onClose}>
      <aside
        className="cockpit-docs-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="cockpit-docs__head">
          <div className="cockpit-docs__head-copy">
            <p className="cockpit-docs__kicker">Operator Manual · RV00-00 Library</p>
            <p className="cockpit-docs__head-hint">Same record as the panel documentation library.</p>
          </div>
          <div className="cockpit-docs__head-actions">
            <Link href={manualHref} className="cockpit-docs__action cockpit-docs__action--primary">
              Open Manual
            </Link>
            <button
              ref={closeRef}
              type="button"
              className="cockpit-docs__action cockpit-docs__action--close"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </header>

        <div className="cockpit-docs__scroll">
          <PanelDocumentationView docs={docs} titleId={titleId} />
        </div>
      </aside>
    </div>
  );
}
