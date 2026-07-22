import type { Metadata } from "next";

import { PanelDocumentationIndex } from "@/components/bobos/cockpit/PanelDocumentationIndex";
import { buildPanelDocumentationIndex } from "@/lib/bobos/cockpit/panel-docs";

import "@/components/bobos/cockpit/cockpit.css";

export const metadata: Metadata = {
  title: "Panel Documentation — RV00-00",
  robots: { index: false, follow: false },
};

export default function BobosPanelDocumentationLibraryPage() {
  const rows = buildPanelDocumentationIndex();

  return (
    <main className="bobos-docs-page">
      <PanelDocumentationIndex rows={rows} />
    </main>
  );
}
