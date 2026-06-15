import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PassRegistrationsBoard } from "@/components/ops/pass-registrations/PassRegistrationsBoard";
import {
  countCollectorPassRegistrations,
  listCollectorPassRegistrations,
} from "@/lib/collector-pass/registrations";
import { inspectPing } from "@/lib/inspect/pg";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

import "../ops.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pass Registrations — Retroverse Ops",
  robots: { index: false, follow: false },
};

export default async function OpsPassRegistrationsPage() {
  if (!isOpsEnabled()) {
    notFound();
  }

  const ping = await inspectPing();
  let registrations: Awaited<ReturnType<typeof listCollectorPassRegistrations>> = [];
  let count = 0;
  let pgError: string | undefined;

  if (ping.ok) {
    try {
      [registrations, count] = await Promise.all([
        listCollectorPassRegistrations(),
        countCollectorPassRegistrations(),
      ]);
    } catch (err) {
      pgError = err instanceof Error ? err.message : String(err);
    }
  } else {
    pgError = ping.error;
  }

  return (
    <main className="ops-page">
      <div className="ops-page__grain" aria-hidden />
      <div className="ops-page__inner ops-page__inner--wide">
        <header className="ops-topbar">
          <div>
            <p className="ops-topbar__kicker">Sunday Nights · door</p>
            <h1 className="ops-topbar__title">Collector Pass Registrations</h1>
          </div>
          <div className="ops-topbar__meta">
            <Link className="ops-link" href="/ops">
              ← Ops
            </Link>
            {" · "}
            <Link className="ops-link" href="/ops/passes">
              Pass Generator
            </Link>
            {" · "}
            <Link className="ops-link" href="/sunday-nights">
              Public landing
            </Link>
          </div>
        </header>

        <p className="ops-banner">
          Registrations from the <strong>Sunday Nights</strong> collector pass form — stored in
          Postgres, newest first.
          {ping.ok ? (
            <>
              {" "}
              Live Postgres · <strong>{count}</strong> total.
            </>
          ) : (
            <>
              {" "}
              <strong>Postgres offline</strong>
              {pgError ? ` (${pgError})` : ""}.
            </>
          )}
        </p>

        <PassRegistrationsBoard
          initialRegistrations={registrations}
          initialCount={count}
          pgOk={ping.ok && !pgError}
          pgError={pgError}
        />
      </div>
    </main>
  );
}
