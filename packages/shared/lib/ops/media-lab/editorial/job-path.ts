import { jobOutputDir } from "../paths";

export function resolveJobOutputDir(year: number, jobSlug: string): string {
  const slug = jobSlug.trim();
  if (!slug || !/^[a-z0-9-]+$/i.test(slug)) {
    throw new Error("Invalid job slug");
  }
  if (!Number.isFinite(year) || year < 1900 || year >= 2100) {
    throw new Error("Invalid year");
  }
  return jobOutputDir(year, slug);
}
