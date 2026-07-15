import { notFound } from "next/navigation";

import { PassExperienceShell } from "@/lib/retroverse-pass/pass-experience-shell";
import { PassScanErrorPage } from "@/lib/retroverse-pass/pass-scan-error-page";
import { resolvePassScan } from "@/lib/retroverse-pass/scan-handler";

import "../../home-broadcast.css";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ serial: string }> };

export default async function PassSerialPage({ params }: Props) {
  const { serial } = await params;
  const result = await resolvePassScan(serial);
  if (result.type === "error") {
    if (result.status === 404) notFound();
    return <PassScanErrorPage message={result.message} />;
  }
  return <PassExperienceShell scan={result.scan} />;
}
