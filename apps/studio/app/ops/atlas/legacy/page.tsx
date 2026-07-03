import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Legacy — Atlas Encyclopedia",
  robots: { index: false, follow: false },
};

const LEGACY_PAGES = [
  {
    title: "Performance Universe World Map",
    href: "/ops/atlas",
    detail: "Territory curation map — creative prototype from Atlas Phase A.",
  },
  {
    title: "1970s Territory Board",
    href: "/ops/atlas/1970s",
    detail: "Decade-specific curation board.",
  },
  {
    title: "Atlas Workshop",
    href: "/ops/atlas/workshop",
    detail: "Workshop and backups entry — formerly linked as Backups from Command Center.",
  },
  {
    title: "Mission Cards",
    href: "/ops/atlas/mission/RVTR000001",
    detail: "One-screen mission cards per RVTR — overlaps Studio Collector workflow.",
  },
  {
    title: "Retroverse Map",
    href: "/ops/map",
    detail: "Pre-System Map route explorer — redirects to System Map.",
  },
] as const;

export default function AtlasLegacyIndexPage() {
  if (!isOpsEnabled()) notFound();

  return (
    <div className="atlas-arch">
      <header className="atlas-arch__hero">
        <p className="atlas-arch__eyebrow">Atlas Encyclopedia</p>
        <h1 className="atlas-arch__title">Legacy</h1>
        <p className="atlas-arch__lead">
          Retired experiments and curation prototypes. Hidden from main navigation — preserved, not
          deleted.
        </p>
      </header>

      <section className="atlas-arch__section" aria-label="Legacy pages">
        <dl className="atlas-arch__items">
          {LEGACY_PAGES.map((page) => (
            <div key={page.href}>
              <dt>
                <Link href={page.href}>{page.title}</Link>
              </dt>
              <dd>{page.detail}</dd>
            </div>
          ))}
        </dl>
      </section>

      <p className="atlas-arch__back">
        <Link href="/ops/library">← Library</Link>
        {" · "}
        <Link href="/ops/atlas/architecture">Architecture</Link>
      </p>
    </div>
  );
}
