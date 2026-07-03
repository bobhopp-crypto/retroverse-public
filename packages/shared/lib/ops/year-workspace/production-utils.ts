import type {
  CategoryProductionFile,
  CategorySectionCounts,
  ProductionItem,
  ProductionSection,
} from "./production-types";

export function sectionCounts(file: CategoryProductionFile): CategorySectionCounts {
  const counts: CategorySectionCounts = {
    wanted: 0,
    queued: 0,
    acquired: 0,
    approved: 0,
  };
  for (const item of file.items) {
    if (item.skipped) continue;
    if (item.section in counts) {
      counts[item.section] += 1;
    }
  }
  return counts;
}

export function itemsInSection(
  file: CategoryProductionFile,
  section: ProductionSection,
): ProductionItem[] {
  return file.items
    .filter((i) => !i.skipped && i.section === section)
    .sort((a, b) => a.title.localeCompare(b.title));
}
