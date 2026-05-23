import type { Metadata } from "next";
import { Suspense } from "react";

import { isInspectEnabled } from "@/lib/inspect/dev-gate";

import InspectClient from "./inspect-client";
import "./inspect.css";

export const metadata: Metadata = {
  title: "Graph Inspector — Retroverse (local)",
  robots: { index: false, follow: false },
};

function InspectDisabled() {
  return (
    <main className="inspect-page">
      <div className="inspect-page__inner">
        <p className="inspect-banner inspect-banner--warn">
          Graph Inspector is only available in local development.
        </p>
        <p>
          <a href="/">← Home</a>
        </p>
      </div>
    </main>
  );
}

export default function InspectPage() {
  if (!isInspectEnabled()) {
    return <InspectDisabled />;
  }

  return (
    <Suspense fallback={<p className="inspect-loading">Loading inspector…</p>}>
      <InspectClient />
    </Suspense>
  );
}
