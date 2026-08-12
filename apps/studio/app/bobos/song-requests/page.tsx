import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SongRequestOperator } from "@/components/ops/song-requests/SongRequestOperator";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Song Requests — Retroverse Ops",
  robots: { index: false, follow: false },
};

export default function SongRequestsPage() {
  if (!isOpsEnabled()) notFound();
  return <SongRequestOperator />;
}
