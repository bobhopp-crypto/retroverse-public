import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ExperienceInspectorPanel } from "@/components/bobos/experience-inspector/ExperienceInspectorPanel";
import { SongWorkspacePublicPreview } from "@/components/bobos/experience-inspector/SongWorkspacePublicPreview";
import {
  buildPublicNavLinks,
  derivePublicStatus,
  listVdjRvtrLinkedEntries,
  readExperienceInventory,
  type ExperienceInventory,
  type VdjRvtrLinkedEntry,
} from "@/lib/ops/intelligence/experience-inspector";
import { assertPresentationCoverage } from "@/lib/ops/intelligence/experience-inspector/presentation-categories";
import { shouldAllowOpsRoutes } from "@/lib/runtime/site-mode";
import { normalizeRvtr } from "@/lib/studio/status";
import { loadTrackPage } from "@/lib/track/load-track-page";

import "@/components/bobos/experience-inspector/experience-inspector.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "RV04-03 Song Workspace — BobOS",
  robots: { index: false, follow: false },
};

type SearchParams = {
  rvtr?: string;
  vdj?: string;
  debugFailSection?: string;
};

function uniqueRvtrSequence(entries: VdjRvtrLinkedEntry[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const entry of entries) {
    if (seen.has(entry.rvtr)) continue;
    seen.add(entry.rvtr);
    out.push(entry.rvtr);
  }
  return out;
}

function neighbors(
  sequence: string[],
  rvtr: string | null,
): {
  prev: string | null;
  next: string | null;
} {
  if (!rvtr) return { prev: null, next: null };
  const idx = sequence.indexOf(rvtr);
  if (idx < 0) return { prev: null, next: null };
  return {
    prev: idx > 0 ? sequence[idx - 1]! : null,
    next: idx < sequence.length - 1 ? sequence[idx + 1]! : null,
  };
}

export default async function SongWorkspacePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  if (!shouldAllowOpsRoutes()) notFound();

  const params = await searchParams;
  const rvtrParam = params.rvtr?.trim() ?? "";
  const vdjParam = params.vdj?.trim() ?? "";
  const debugFailSection = params.debugFailSection?.trim() || null;

  const vdjOptions = await listVdjRvtrLinkedEntries();
  const sequence = uniqueRvtrSequence(vdjOptions);

  let inventory: ExperienceInventory | null = null;
  let error: string | null = null;
  let resolvedRvtr: string | null = normalizeRvtr(rvtrParam);

  if (rvtrParam || vdjParam) {
    const result = await readExperienceInventory({
      rvtr: vdjParam ? null : rvtrParam,
      vdjFilePath: vdjParam || null,
      debugFailSection,
    });
    if ("error" in result) {
      error = result.error;
    } else {
      inventory = result;
      resolvedRvtr = result.rvtr;
      assertPresentationCoverage(result.sections.map((section) => section.id));
    }
  }

  const { prev, next } = neighbors(sequence, resolvedRvtr);

  const track =
    inventory?.rvtr != null ? await loadTrackPage(inventory.rvtr).catch(() => null) : null;

  const publicNav = inventory
    ? buildPublicNavLinks({
        rvtr: inventory.rvtr,
        artistHref: track?.artistHref ?? null,
        albumHref: track?.primaryAlbum?.href ?? null,
        year: track?.releaseYear ?? inventory.identity.year ?? null,
        yearHref: track?.rvYearHref ?? null,
      })
    : null;

  const publicStatus = inventory ? derivePublicStatus(inventory) : [];
  const publicSubtitle = track?.chartRunLabel ?? null;

  return (
    <ExperienceInspectorPanel
      inventory={inventory}
      error={error}
      vdjOptions={vdjOptions.slice(0, 400)}
      currentRvtr={inventory?.rvtr ?? rvtrParam}
      currentVdjPath={vdjParam}
      prevRvtr={prev}
      nextRvtr={next}
      publicStatus={publicStatus}
      publicNav={publicNav}
      publicSubtitle={publicSubtitle}
      publicPreview={
        inventory ? (
          <SongWorkspacePublicPreview rvtr={inventory.rvtr} trackData={track} />
        ) : null
      }
    />
  );
}
