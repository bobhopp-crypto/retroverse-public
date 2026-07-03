/** Canonical patron + ops launch URLs for published RVTR packages. */

export function normalizePublishedRvtr(rvtr: string): string {
  return rvtr.trim().toUpperCase();
}

export function chartJourneyPath(rvtr: string): string {
  return `/retroverse-2/song/${normalizePublishedRvtr(rvtr)}#chart-journey`;
}

export function patronExperiencePath(rvtr: string): string {
  return `/experience/${normalizePublishedRvtr(rvtr)}`;
}

export function publisherWorkspacePath(rvtr: string): string {
  return `/ops/studio/publisher/${normalizePublishedRvtr(rvtr)}`;
}

export function experienceGalleryPath(rvtr: string): string {
  return `/retroverse/experiences?rvtr=${normalizePublishedRvtr(rvtr)}`;
}
