import type { Metadata } from "next";

import { CommandCenter } from "@/components/ops/CommandCenter";
import { loadCommandCenterDashboard } from "@/lib/ops/command-center/load-command-center-dashboard";

import "./command-center.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Retroverse Command Center",
  robots: { index: false, follow: false },
};

function OpsBlocked(props: { message: string }) {
  return (
    <div className="ops-auth">
      <h1>Retroverse Ops Console</h1>
      <p className="ops-dim">{props.message}</p>
      <p>This route is internal-only and is protected by middleware.</p>
      <p>
        Environment required: <code>RETROVERSE_OPS=1</code>
        <br />
        Access via <code>/internal/ops-pin</code> (local PIN gate).
      </p>
    </div>
  );
}

export default async function OpsPage() {
  if (process.env.RETROVERSE_OPS !== "1") {
    return (
      <main className="ops-page">
        <div className="ops-page__grain" aria-hidden />
        <div className="ops-page__inner">
          <OpsBlocked message="Ops console disabled (set RETROVERSE_OPS=1)." />
        </div>
      </main>
    );
  }

  const data = await loadCommandCenterDashboard();

  return (
    <main className="ops-page ops-command">
      <div className="ops-page__grain" aria-hidden />
      <div className="ops-page__inner">
        <CommandCenter data={data} />
      </div>
    </main>
  );
}
