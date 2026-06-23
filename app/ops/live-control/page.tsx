import type { Metadata } from "next";
import Link from "next/link";

import { getLiveControlStatus } from "@/lib/live-control/engine";

import { LiveControlClient } from "./LiveControlClient";

import "../ops.css";
import "./live-control.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Live Control Center — Retroverse",
  robots: { index: false, follow: false },
};

export default async function LiveControlPage() {
  const initial = await getLiveControlStatus();

  return (
    <main className="ops-page ops-command ops-live-control">
      <div className="ops-page__grain" aria-hidden />
      <div className="ops-page__inner">
        <header className="ops-topbar">
          <Link href="/ops" className="ops-link">← Command Center</Link>
        </header>
        <LiveControlClient initial={initial} />
      </div>
    </main>
  );
}
