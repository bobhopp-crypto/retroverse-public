import type { Metadata } from "next";

import { RetroverseStage, stageNowFromPublicPayload } from "./components/retroverse-stage";
import { loadPublicCurrentSongPayload } from "@/lib/home/public-current-song";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export const metadata: Metadata = {
  title: "Retroverse Live",
  description: "A live music stage from across the decades.",
};

export default async function HomePage() {
  const current = await loadPublicCurrentSongPayload().catch(() => null);
  return <RetroverseStage initial={stageNowFromPublicPayload(current)} />;
}
