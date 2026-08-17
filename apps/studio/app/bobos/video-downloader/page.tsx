import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { isOpsEnabled } from "@/lib/ops/ops-gate";
import { VideoDownloader } from "./VideoDownloader";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "RV06-05 Video Downloader — BobOS",
  robots: { index: false, follow: false },
};

export default function VideoDownloaderPage() {
  if (!isOpsEnabled()) notFound();
  return <VideoDownloader />;
}
