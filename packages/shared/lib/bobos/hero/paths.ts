import { existsSync } from "fs";
import { join } from "path";

import { songPackageDir } from "@/lib/ops/intelligence/paths";
import { retroverseDataRoot } from "@/lib/retroverse-data-root";

export function bobosDataRoot(): string {
  return join(retroverseDataRoot(), "bobos");
}

export function bobosVisualAssetsRoot(): string {
  return join(bobosDataRoot(), "visual-assets");
}

export function bobosVisualAssetsDir(rvtr: string): string {
  return join(bobosVisualAssetsRoot(), rvtr.trim().toUpperCase());
}

export function bundledBobosVisualAssetsDir(rvtr: string): string {
  const id = rvtr.trim().toUpperCase();
  let dir = process.cwd();
  for (let i = 0; i < 6; i += 1) {
    const candidate = join(dir, "data", "bobos", "visual-assets", id);
    if (existsSync(candidate)) return candidate;
    const parent = join(dir, "..");
    if (parent === dir) break;
    dir = parent;
  }
  return join(process.cwd(), "data", "bobos", "visual-assets", id);
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
