import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PanelDocumentationView } from "@/components/bobos/cockpit/PanelDocumentationView";
import {
  PANEL_DOCS_LIBRARY_HREF,
  getPanelDocumentationByRvId,
} from "@/lib/bobos/cockpit/panel-docs";
import { formatRvId } from "@/lib/bobos/rv-ids";

import "@/components/bobos/cockpit/cockpit.css";

type Props = {
  params: Promise<{ rvId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { rvId } = await params;
  const docs = getPanelDocumentationByRvId(decodeURIComponent(rvId));
  if (!docs) {
    return { title: "Panel Manual — Not Found" };
  }
  return {
    title: `${formatRvId(docs.rvId)} · ${docs.title} — Operator Manual`,
    robots: { index: false, follow: false },
  };
}

export default async function BobosPanelManualPage({ params }: Props) {
  const { rvId } = await params;
  const docs = getPanelDocumentationByRvId(decodeURIComponent(rvId));
  if (!docs) {
    notFound();
  }

  return (
    <main className="bobos-docs-page bobos-docs-page--manual">
      <nav className="cockpit-docs-page-nav" aria-label="Documentation">
        <Link href="/bobos" className="cockpit-docs-index__back">
          ← Cockpit
        </Link>
        <span aria-hidden="true"> · </span>
        <Link href={PANEL_DOCS_LIBRARY_HREF} className="cockpit-docs-index__back">
          RV00-00 Panel Documentation
        </Link>
      </nav>
      <article className="cockpit-docs-page-manual">
        <PanelDocumentationView docs={docs} />
      </article>
    </main>
  );
}
