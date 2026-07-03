import {
  listRvtrDirectories,
  mapInBatches,
  STUDIO_LIBRARY_CARD_LIMIT,
} from "@/lib/ops/studio/list-rvtrs";
import {
  buildDiscoveries,
  buildPackageInvestigationView,
  knowledgeTierFromScore,
  normalizeCollectorPackage,
  type CollectorInvestigationView,
} from "./presentation";
import { performanceCount, performanceTitles } from "./package-archive";
import { loadCollectorDashboardStats } from "./load-dashboard";
import { loadCollectorPackage } from "./store";
import type { CollectorPackage } from "./types";
import {
  type CollectorLibraryCard,
  type CollectorLibraryIndex,
  type CollectorLibraryStats,
} from "./library-shared";

export type {
  CollectorLibraryCard,
  CollectorLibraryIndex,
  CollectorLibraryStats,
} from "./library-shared";
export { filterLibraryCards } from "./library-shared";

export type CollectorPackagePageContext = {
  rvtr: string;
  package: CollectorPackage | null;
  investigation: CollectorInvestigationView | null;
  stats: Awaited<ReturnType<typeof loadCollectorDashboardStats>>;
  prev: CollectorLibraryCard | null;
  next: CollectorLibraryCard | null;
};

function packageToCard(pkg: CollectorPackage): CollectorLibraryCard {
  const normalized = normalizeCollectorPackage(pkg);
  const normalizedRvtr = normalized.rvtr.trim().toUpperCase();
  const hero = normalized.visualAssets?.extraction?.assets?.find((a) => a.category === "Hero");

  return {
    rvtr: normalizedRvtr,
    artist: normalized.artist,
    title: normalized.title,
    knowledgeTier: knowledgeTierFromScore(normalized.researchQuality),
    researchQuality: normalized.researchQuality,
    discoveryCount: buildDiscoveries(normalized).length,
    lastUpdated: normalized.completedAt,
    heroImageUrl: hero
      ? `/api/ops/studio/collector/visual-asset?rvtr=${encodeURIComponent(normalizedRvtr)}&file=${encodeURIComponent(hero.filename)}`
      : normalized.visualAssets?.coverUrl ?? null,
    performanceCount: performanceCount(normalized),
    performanceTitles: performanceTitles(normalized),
    href: `/ops/studio/collector/${normalizedRvtr}`,
  };
}

function compareArtist(a: CollectorLibraryCard, b: CollectorLibraryCard): number {
  return a.artist.localeCompare(b.artist, undefined, { sensitivity: "base" })
    || a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
}

function buildStats(packages: CollectorLibraryCard[]): CollectorLibraryStats {
  if (packages.length === 0) {
    return { packageCount: 0, knowledgeTiers: [], averageCompletion: 0 };
  }

  return {
    packageCount: packages.length,
    knowledgeTiers: packages.map((p) => p.knowledgeTier),
    averageCompletion: Math.round(
      packages.reduce((sum, p) => sum + p.researchQuality, 0) / packages.length,
    ),
  };
}

export async function loadCollectorLibraryIndex(): Promise<CollectorLibraryIndex> {
  const { rvtrs, total, truncated } = await listRvtrDirectories({
    limit: STUDIO_LIBRARY_CARD_LIMIT,
    recentFirst: true,
  });

  const packages = (
    await mapInBatches(rvtrs, 12, async (rvtr) => {
      try {
        const pkg = await loadCollectorPackage(rvtr);
        return pkg ? packageToCard(pkg) : null;
      } catch {
        return null;
      }
    })
  ).filter((p): p is CollectorLibraryCard => p != null);

  const alphabetical = [...packages].sort(compareArtist);
  const recent = [...packages].sort(
    (a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime(),
  );

  const stats = buildStats(packages);
  if (truncated && total > packages.length) {
    stats.packageCount = total;
  }

  return {
    packages,
    recent,
    alphabetical,
    stats,
  };
}

export function packageNeighbors(
  index: CollectorLibraryIndex,
  rvtr: string,
): { prev: CollectorLibraryCard | null; next: CollectorLibraryCard | null } {
  const normalized = rvtr.trim().toUpperCase();
  const pos = index.alphabetical.findIndex((p) => p.rvtr === normalized);
  if (pos === -1) return { prev: null, next: null };
  return {
    prev: pos > 0 ? index.alphabetical[pos - 1]! : null,
    next: pos < index.alphabetical.length - 1 ? index.alphabetical[pos + 1]! : null,
  };
}

export async function loadCollectorPackagePageContext(
  rvtr: string,
): Promise<CollectorPackagePageContext> {
  const normalized = rvtr.trim().toUpperCase();
  const [index, pkg, stats] = await Promise.all([
    loadCollectorLibraryIndex(),
    loadCollectorPackage(normalized),
    loadCollectorDashboardStats(),
  ]);

  const { prev, next } = packageNeighbors(index, normalized);

  if (!pkg) {
    return {
      rvtr: normalized,
      package: null,
      investigation: null,
      stats,
      prev,
      next,
    };
  }

  const investigation = buildPackageInvestigationView(pkg, stats);

  return {
    rvtr: normalized,
    package: pkg ? normalizeCollectorPackage(pkg) : null,
    investigation,
    stats,
    prev,
    next,
  };
}
