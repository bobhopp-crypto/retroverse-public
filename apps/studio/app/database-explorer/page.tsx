import type { Metadata } from "next";
import { Suspense } from "react";

import { isInspectEnabled } from "@/lib/inspect/dev-gate";

import InspectClient from "../inspect/inspect-client";
import "../inspect/inspect.css";

export const metadata: Metadata = {
  title: "Database Explorer — Retroverse (local)",
  robots: { index: false, follow: false },
};

function DatabaseExplorerDisabled() {
  return (
    <main className="inspect-page ops-command-surface">
      <div className="ops-page__grain" aria-hidden />
      <div className="inspect-page__inner">
        <p className="inspect-banner inspect-banner--warn">
          Database Explorer is only available in local development.
        </p>
        <p>
          <a href="/">← Home</a>
        </p>
      </div>
    </main>
  );
}

export default function DatabaseExplorerPage() {
  if (!isInspectEnabled()) {
    return <DatabaseExplorerDisabled />;
  }

  return (
    <Suspense fallback={<p className="inspect-loading">Loading explorer…</p>}>
      <InspectClient />
    </Suspense>
  );
}
