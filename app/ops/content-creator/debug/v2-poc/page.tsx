import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { V2PocWorkspace } from "@/components/ops/content-creator/V2PocWorkspace";
import { inspectPing } from "@/lib/inspect/pg";
import type { ContentCreatorEraOption } from "@/lib/ops/content-creator/types";
import { buildRvbrGlance } from "@/lib/ops/rvbr/presentation";
import { listRvbrProfiles } from "@/lib/ops/rvbr/profiles";

import "../../content-creator.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "v2 POC (Debug)",
  robots: { index: false, follow: false },
};

export default async function Page() {
  if (process.env.RETROVERSE_OPS !== "1") notFound();

  const ping = await inspectPing();
  if (!ping.ok) {
    return <main className="ops-page ops-page--content-creator"><p style={{ padding: "2rem" }}>Database offline.</p></main>;
  }

  const profiles = await listRvbrProfiles();
  const eras: ContentCreatorEraOption[] = profiles.map((p) => ({
    ...buildRvbrGlance(p),
    retroverseEraId: p.retroverseEraId,
    narrative: p.narrative,
    visualIdentity: {
      accent: p.visualIdentity.accent,
      subtitle: p.visualIdentity.subtitle,
      sections: p.visualIdentity.sections,
    },
    promptFragments: p.promptFragments,
  }));

  return (
    <main className="ops-page ops-page--content-creator">
      <p style={{ padding: "1rem 2rem 0", fontSize: "0.85rem" }}>
        <a href="/ops/content-creator/debug">← Debug</a>
      </p>
      <V2PocWorkspace eras={eras} />
    </main>
  );
}
