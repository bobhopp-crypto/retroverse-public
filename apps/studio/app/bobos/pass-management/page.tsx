import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PassManagementBoard } from "@/components/bobos/pass-management/PassManagementBoard";
import { searchPassManagement } from "@/lib/retroverse-pass/pass-management";
import { getPassPgIdentity, passPing } from "@/lib/retroverse-pass/pg";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

import "../../ops/ops.css";
import "./pass-management.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pass Management — BobOS",
  robots: { index: false, follow: false },
};

export default async function BobosPassManagementPage() {
  if (!isOpsEnabled()) {
    notFound();
  }

  const ping = await passPing();
  let passes: Awaited<ReturnType<typeof searchPassManagement>>["passes"] = [];
  let summary = { totalPasses: 0, claimed: 0, unclaimed: 0, claimedToday: 0 };
  let loadError: string | undefined;
  let dbLabel: string | undefined;

  if (!ping.ok) {
    loadError =
      ping.error ??
      "Pass database offline. Configure RETROVERSE_PASS_PG_* (Neon production).";
  } else {
    try {
      const identity = ping.identity ?? getPassPgIdentity();
      dbLabel = `${identity.host} / ${identity.database}`;
      const result = await searchPassManagement();
      passes = result.passes;
      summary = result.summary;
    } catch (err) {
      loadError = err instanceof Error ? err.message : String(err);
    }
  }

  return (
    <main className="ops-page pm-page">
      <div className="ops-page__grain" aria-hidden />
      <div className="ops-page__inner ops-page__inner--wide">
        <header className="ops-topbar pm-topbar">
          <div>
            <p className="ops-topbar__kicker">RV02-05 · Events</p>
            <h1 className="ops-topbar__title">Pass Management</h1>
          </div>
          <div className="ops-topbar__meta">
            <Link className="ops-link" href="/bobos">
              ← Cockpit
            </Link>
            {" · "}
            <Link className="ops-link" href="/bobos/passes">
              Pass Production
            </Link>
            {" · "}
            <Link className="ops-link" href="/bobos/docs/RV02-05">
              Docs
            </Link>
          </div>
        </header>

        <p className="ops-banner pm-banner">
          Manages the public pass claim system (<code>/pass/[serial]</code>) —{" "}
          <code>retroverse_passes</code> + <code>retroverse_visitors</code>. Same records as “You’re
          in, Bob.”
          {dbLabel ? (
            <>
              {" "}
              Connected: <code>{dbLabel}</code>
            </>
          ) : null}
        </p>

        {loadError ? <p className="ops-banner ops-banner--warn">{loadError}</p> : null}

        <PassManagementBoard
          initialPasses={passes}
          initialSummary={summary}
          pgOk={ping.ok && !loadError}
        />
      </div>
    </main>
  );
}
