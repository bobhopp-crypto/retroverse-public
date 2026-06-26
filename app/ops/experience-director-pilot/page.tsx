import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  ExperienceDirectorPilotEmpty,
  ExperienceDirectorPilotPanel,
} from "@/components/ops/experience-director/ExperienceDirectorPilotPanel";
import { loadDirectorPilotBundle } from "@/lib/ops/intelligence/ollama-experience-director/load-director-pilot";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

import "../ops.css";
import "@/components/ops/experience-director/experience-director-pilot.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Experience Director Pilot — Retroverse Ops",
  robots: { index: false, follow: false },
};

export default async function ExperienceDirectorPilotPage() {
  if (!isOpsEnabled()) notFound();

  const bundle = await loadDirectorPilotBundle();

  return (
    <main className="ops-page ops-command">
      <div className="ops-page__grain" aria-hidden />
      <div className="ops-page__inner">
        <header className="ops-topbar">
          <div>
            <Link className="intel-review__back" href="/ops" prefetch={false}>
              ← Ops
            </Link>
            <h1 className="ops-topbar__title">Experience Director Pilot</h1>
            <p className="ops-topbar__sub">
              Ollama-curated exhibit plans for 10 songs — review before any public changes.
            </p>
          </div>
        </header>

        {bundle ? <ExperienceDirectorPilotPanel bundle={bundle} /> : <ExperienceDirectorPilotEmpty />}
      </div>
    </main>
  );
}
