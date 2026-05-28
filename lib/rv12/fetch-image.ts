/** Ops-only image fetch for RV12 staging (no bulk). */

export async function fetchImageFromUrl(url: string): Promise<Buffer> {
  const trimmed = url.trim();
  let target = trimmed;

  if (/discogs\.com/i.test(trimmed) && !/\.(jpe?g|png|webp|gif)(\?|$)/i.test(trimmed)) {
    const pageRes = await fetch(trimmed, {
      headers: { "User-Agent": "RetroverseOps/1.0 (cover-pilot)" },
      redirect: "follow",
    });
    if (!pageRes.ok) {
      throw new Error(`Discogs page fetch failed: ${pageRes.status}`);
    }
    const html = await pageRes.text();
    const og =
      html.match(/property="og:image"\s+content="([^"]+)"/i)?.[1] ??
      html.match(/content="([^"]+)"\s+property="og:image"/i)?.[1];
    if (!og) {
      throw new Error("No og:image on Discogs page — paste a direct image URL or upload.");
    }
    target = og.replace(/&amp;/g, "&");
  }

  const res = await fetch(target, {
    headers: { "User-Agent": "RetroverseOps/1.0 (cover-pilot)" },
    redirect: "follow",
  });
  if (!res.ok) {
    throw new Error(`Image fetch failed: ${res.status}`);
  }
  const type = res.headers.get("content-type") ?? "";
  if (!type.startsWith("image/") && !/\.(jpe?g|png|webp|gif)/i.test(target)) {
    throw new Error(`URL did not return an image (content-type: ${type || "unknown"}).`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  return buf;
}
