import { join } from "path";

import { songPackageDir } from "@/lib/ops/intelligence/paths";
import { retroverseDataRoot } from "@/lib/retroverse-data-root";

export function bobosDataRoot(): string {
  return join(retroverseDataRoot(), "bobos");
}

export function heroRequestsDir(): string {
  return join(bobosDataRoot(), "hero-requests");
}

export function heroRequestPath(rvtr: string): string {
  return join(heroRequestsDir(), `${rvtr.trim().toUpperCase()}.json`);
}

/** Canonical on-disk hero output — renderer target path. */
export function heroOutputFilePath(rvtr: string): string {
  const id = rvtr.trim().toUpperCase();
  return join(songPackageDir(id), "hero-primary.jpg");
}

/** Public URL served by Next static files after manual assign. */
export function heroPublicUrl(rvtr: string, cacheBust?: string): string {
  const id = rvtr.trim().toUpperCase();
  const base = `/bobos-heroes/${id}.jpg`;
  return cacheBust ? `${base}?v=${cacheBust}` : base;
}

export function heroPublicFilePath(rvtr: string): string {
  return join(process.cwd(), "public", "bobos-heroes", `${rvtr.trim().toUpperCase()}.jpg`);
}

export function heroPublicDir(): string {
  return join(process.cwd(), "public", "bobos-heroes");
}
