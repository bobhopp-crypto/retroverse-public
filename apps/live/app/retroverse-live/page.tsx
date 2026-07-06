import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CANONICAL_AUDIENCE_HREF } from "@/lib/bobos/presentation/canonical-audience";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Retroverse Live",
  description: "Press Play for the Past.",
};

/** Legacy alias — canonical live experience is at /. */
export default function RetroverseLivePage() {
  redirect(CANONICAL_AUDIENCE_HREF);
}
