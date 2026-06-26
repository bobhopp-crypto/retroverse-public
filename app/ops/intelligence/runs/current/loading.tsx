import Link from "next/link";

import { IntelligenceRunLivePanel } from "@/components/ops/intelligence/IntelligenceRunLivePanel";

export default function IntelligenceRunCurrentLoading() {
  return (
    <main
      className="intel-app"
      style={{ background: "#ffffff", color: "#111111", minHeight: "100vh" }}
    >
      <div className="intel-app__body">
        <Link className="intel-review__back" href="/ops/intelligence" prefetch={false}>
          ← Research Center
        </Link>
        <IntelligenceRunLivePanel />
        <p className="intel-backfill__actions-lead">Loading run dashboard…</p>
      </div>
    </main>
  );
}
