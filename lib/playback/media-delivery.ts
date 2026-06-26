import { getPublicCoverDeliveryBase } from "@/lib/artwork/cover-origin";

export function getPublicMediaDeliveryBase(): string {
  for (const raw of [
    process.env.NEXT_PUBLIC_RETROVERSE_MEDIA_BASE_URL,
    process.env.RETROVERSE_MEDIA_BASE_URL,
    process.env.NEXT_PUBLIC_RETROVERSE_COVER_BASE_URL,
    process.env.RETROVERSE_COVER_BASE_URL,
  ]) {
    if (typeof raw !== "string") continue;
    const trimmed = raw.trim();
    if (!trimmed || trimmed === '""' || trimmed === "''") continue;
    const base = trimmed
      .replace(/\/+$/, "")
      .replace(/\/retroverse\/(covers|videos)$/i, "")
      .replace(/\/+$/, "");
    if (base.startsWith("http://") || base.startsWith("https://")) return base;
  }
  return getPublicCoverDeliveryBase();
}

export function mediaKeyToStreamUrl(r2Key: string | null | undefined): string | null {
  const key = r2Key?.trim();
  if (!key) return null;
  if (key.startsWith("http://") || key.startsWith("https://")) return key;
  const base = getPublicMediaDeliveryBase().replace(/\/+$/, "");
  const rel = key.replace(/^\/+/, "");
  return `${base}/${rel}`;
}

export function youtubeEmbedUrl(youtubeId: string, origin?: string): string {
  const id = youtubeId.trim();
  const params = new URLSearchParams({
    rel: "0",
    modestbranding: "1",
    playsinline: "1",
    enablejsapi: "1",
  });
  if (origin) params.set("origin", origin);
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?${params}`;
}

export function buildLocalStreamUrl(rvtr: string, mediaAssetId: number): string {
  const params = new URLSearchParams({
    rvtr: rvtr.trim().toUpperCase(),
    media: String(mediaAssetId),
  });
  return `/api/playback/stream?${params}`;
}
