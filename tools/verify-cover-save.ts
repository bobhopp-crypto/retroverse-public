/**
 * One-shot verification: save MusicBrainz cover for RVTR891825 and confirm page cover rev changes.
 * Usage: npx tsx tools/verify-cover-save.ts
 */
import { saveCoverCandidate } from "@/lib/retroverse-2/cover-correction";

const RVTR = "RVTR891825";
const BASE = process.env.VERIFY_BASE_URL ?? "http://localhost:3002";
const MB_COVER =
  "https://coverartarchive.org/release/98605156-8aba-4936-ac21-0a5f0507da78/front-500";

function extractHeroCover(html: string): string | null {
  const match = html.match(/class="rv2-song__art"[^>]*src="([^"]+)"/)
    ?? html.match(/src="([^"]+)"[^>]*class="rv2-song__art"/);
  return match?.[1] ?? null;
}

async function fetchSongCover(): Promise<string | null> {
  const res = await fetch(`${BASE}/retroverse-2/song/${RVTR}`, { cache: "no-store" });
  const html = await res.text();
  return extractHeroCover(html);
}

async function main() {
  const before = await fetchSongCover();
  console.log("before:", before);

  const saved = await saveCoverCandidate({
    rvtr: RVTR,
    linkId: null,
    coverUrl: MB_COVER,
  });
  console.log("saved:", saved);

  const after = await fetchSongCover();
  console.log("after:", after);

  if (!after) {
    console.error("FAIL: no hero cover found on song page");
    process.exit(1);
  }

  if (before === after) {
    console.error("FAIL: song page cover src unchanged");
    process.exit(1);
  }

  console.log("OK: song page cover src changed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
