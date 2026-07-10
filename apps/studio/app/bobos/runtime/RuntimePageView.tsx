"use client";

import { BobosPageHeader } from "@/components/bobos/BobosPageHeader";

import "@/components/bobos/cockpit/cockpit.css";

import { RetroverseRuntimePanel } from "./RetroverseRuntimePanel";

/** Full Runtime application — every control moved out of the Cockpit widget. */
export function RuntimePageView() {
  return (
    <main className="bobos-page">
      <BobosPageHeader
        page="Runtime"
        subtitle="Start, stop, and monitor every Retroverse service."
        breadcrumb={{ label: "BobOS Cockpit", href: "/bobos" }}
      />
      <div className="cockpit-cell cockpit-cell--filled">
        <RetroverseRuntimePanel />
      </div>
    </main>
  );
}
