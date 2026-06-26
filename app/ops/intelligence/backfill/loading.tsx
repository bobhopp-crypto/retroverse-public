import Link from "next/link";

import { Top100ValidationLivePanel } from "@/components/ops/intelligence/Top100ValidationLivePanel";

export default function IntelligenceBackfillLoading() {
  return (
    <main
      className="intel-app"
      style={{ background: "#ffffff", color: "#111111", minHeight: "100vh" }}
    >
      <div className="intel-app__body">
        <Link className="intel-review__back" href="/ops/intelligence" prefetch={false}>
          ← Research Center
        </Link>
        <Top100ValidationLivePanel />
        <p className="intel-backfill__actions-lead">Loading backfill coverage…</p>
      </div>
    </main>
  );
}
