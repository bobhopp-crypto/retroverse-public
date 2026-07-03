/** Resolve governed secondary line from project — supports legacy featuredYears arrays. */

export function projectSecondaryLine(project: {
  secondaryLine?: string;
  featuredYears?: number[];
}): string {
  if (project.secondaryLine?.trim()) return project.secondaryLine.trim();
  if (Array.isArray(project.featuredYears) && project.featuredYears.length) {
    return project.featuredYears.join(" · ");
  }
  return "";
}
