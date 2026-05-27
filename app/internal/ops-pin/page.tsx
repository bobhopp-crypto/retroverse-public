import type { Metadata } from "next";
import { Suspense } from "react";

import OpsPinClient from "./ops-pin-client";

import "./ops-pin.css";

export const metadata: Metadata = {
  title: "Ops Access — Retroverse (internal)",
  robots: { index: false, follow: false },
};

export default function OpsPinPage() {
  return (
    <main className="ops-pin-page">
      <div className="ops-pin-page__grain" aria-hidden />
      <Suspense
        fallback={
          <div className="ops-pin-card">
            <p className="ops-pin-card__lead">Loading…</p>
          </div>
        }
      >
        <OpsPinClient />
      </Suspense>
    </main>
  );
}
