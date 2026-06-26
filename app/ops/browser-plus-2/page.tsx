import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BrowserPlus2Client } from "@/components/ops/browser-plus-2/BrowserPlus2Client";
import { RetroverseShell, StudioProductChrome } from "@/components/ops/shell";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

import "../ops.css";
import "../studio/studio-design-tokens.css";
import "./browser-plus-2.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Browser+ 2.0 — Studio Operations Center",
  robots: { index: false, follow: false },
};

export default async function BrowserPlus2Page() {
  if (!isOpsEnabled()) notFound();

  return (
    <RetroverseShell
      product="studio"
      fillViewport
      productChrome={<StudioProductChrome active="mission-control" />}
    >
      <main className="ops-page ops-page--bp2">
        <div className="ops-page__grain" aria-hidden="true" />
        <div className="ops-page__inner ops-page__inner--bp2">
          <BrowserPlus2Client />
        </div>
      </main>
    </RetroverseShell>
  );
}
