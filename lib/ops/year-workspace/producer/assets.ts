import type { CategoryProductionFile } from "../production-types";
import { itemsInSection } from "../production-utils";
import type { YearWorkspaceCategoryId, YearWorkspaceData } from "../types";

import { productionCategoryForProducer } from "./config";
import type { ProducerAssetCategoryId, ProducerLibraryAsset } from "./types";

function itemToLibraryAsset(
  producerCategory: ProducerAssetCategoryId,
  productionCategory: YearWorkspaceCategoryId,
  item: { id: string; title: string; subtitle: string | null },
  status: ProducerLibraryAsset["status"],
): ProducerLibraryAsset {
  return {
    id: `${productionCategory}:${item.id}`,
    producerCategory,
    productionCategory,
    productionItemId: item.id,
    title: item.title,
    subtitle: item.subtitle,
    status,
  };
}

function assetsFromProductionFile(
  producerCategory: ProducerAssetCategoryId,
  productionCategory: NonNullable<
    ReturnType<typeof productionCategoryForProducer>
  >,
  file: CategoryProductionFile,
): ProducerLibraryAsset[] {
  const need = [
    ...itemsInSection(file, "wanted"),
    ...itemsInSection(file, "queued"),
  ];
  const found = itemsInSection(file, "acquired");
  const ready = itemsInSection(file, "approved");

  return [
    ...need.map((i) =>
      itemToLibraryAsset(producerCategory, productionCategory, i, "need"),
    ),
    ...found.map((i) =>
      itemToLibraryAsset(producerCategory, productionCategory, i, "found"),
    ),
    ...ready.map((i) =>
      itemToLibraryAsset(producerCategory, productionCategory, i, "ready"),
    ),
  ];
}

function songAssets(workspace: YearWorkspaceData): ProducerLibraryAsset[] {
  const need = workspace.chartOnly.map((r) => ({
    id: r.workspaceKey,
    title: `${r.artist} — ${r.title}`,
    subtitle: r.peak != null ? `Peak #${r.peak}` : null,
  }));
  const found = workspace.inBoth
    .filter((r) => r.keywords.length === 0)
    .map((r) => ({
      id: r.workspaceKey,
      title: `${r.artist} — ${r.title}`,
      subtitle: r.peak != null ? `Peak #${r.peak}` : null,
    }));
  const ready = workspace.inBoth
    .filter((r) => r.keywords.length > 0)
    .map((r) => ({
      id: r.workspaceKey,
      title: `${r.artist} — ${r.title}`,
      subtitle: r.keywords.join(" · "),
    }));

  return [
    ...need.map((i) =>
      itemToLibraryAsset("songs", "songs", i, "need"),
    ),
    ...found.map((i) =>
      itemToLibraryAsset("songs", "songs", i, "found"),
    ),
    ...ready.map((i) =>
      itemToLibraryAsset("songs", "songs", i, "ready"),
    ),
  ];
}

export function buildProducerLibraryAssets(
  producerCategory: ProducerAssetCategoryId,
  production: Record<string, CategoryProductionFile> | null,
  workspace: YearWorkspaceData | null,
): ProducerLibraryAsset[] {
  if (producerCategory === "songs" && workspace) {
    return songAssets(workspace);
  }

  const productionCategory = productionCategoryForProducer(producerCategory);
  if (!productionCategory || !production) return [];
  const file = production[productionCategory];
  if (!file) return [];

  if (
    producerCategory !== productionCategory &&
    (producerCategory === "movies" ||
      producerCategory === "sports" ||
      producerCategory === "news")
  ) {
    return assetsFromProductionFile(
      producerCategory,
      productionCategory,
      file,
    );
  }

  if (producerCategory !== productionCategory) return [];
  return assetsFromProductionFile(
    producerCategory,
    productionCategory,
    file,
  );
}
