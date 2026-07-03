import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { RvbrValidationWorkspace } from "@/components/ops/content-creator/RvbrValidationWorkspace";

import "../../content-creator.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "RVBR Validation (Debug)",
  robots: { index: false, follow: false },
};

export default function Page() {
  if (process.env.RETROVERSE_OPS !== "1") notFound();

  return (
    <main className="ops-page ops-page--content-creator">
      <p style={{ padding: "1rem 2rem 0", fontSize: "0.85rem" }}>
        <a href="/ops/content-creator/debug">← Debug</a>
      </p>
      <RvbrValidationWorkspace />
    </main>
  );
}
