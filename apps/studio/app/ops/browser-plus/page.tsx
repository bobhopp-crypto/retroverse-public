import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { VirtualDjBrowserPlus } from "@/components/ops/browser-plus/VirtualDjBrowserPlus";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

import "./browser-plus.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "VirtualDJ Browser+ — Retroverse Ops",
  robots: { index: false, follow: false },
};

export default async function BrowserPlusPage() {
  if (!isOpsEnabled()) notFound();

  return (
    <main className="browser-plus-page">
      <div className="browser-plus-page__top-link">
        <Link href="/ops">← Ops</Link>
      </div>
      <VirtualDjBrowserPlus />
    </main>
  );
}
