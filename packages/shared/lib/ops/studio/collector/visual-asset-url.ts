/** Client-safe visual asset URL helper (no Node/ffmpeg/sharp). */

export function visualAssetUrl(rvtr: string, filename: string): string {
  const params = new URLSearchParams({
    rvtr: rvtr.trim().toUpperCase(),
    file: filename,
  });
  return `/api/ops/studio/collector/visual-asset?${params.toString()}`;
}
