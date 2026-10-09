/** Publishes only display-safe Artist Curator profiles through the existing Mac bridge. */
import { readFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import {
  planArtistProfileRetirement,
  projectArtistProfile,
  type ArtistDirectoryEntry,
  type ArtistProfileView,
} from "../../apps/live/lib/artist-profile-contract";

const CANON = "/Users/bobhopp/RETROVERSE_DATA/bobos/artist-profiles";
const PUBLIC_SYNC = "https://retroverse.live/api/artist-profiles/sync";
const FILE = /^RVAR\d{6}\.json$/;

type SyncBody = {
  profiles: ArtistProfileView[];
  directory?: ArtistDirectoryEntry[];
  remove?: string[];
};

export function startArtistProfileSync(secret: string): void {
  if (!secret) return;
  const sent = new Map<string, string>();
  let sentDirectory = "";
  let busy = false;

  async function post(body: SyncBody): Promise<ArtistDirectoryEntry[]> {
    const response = await fetch(PUBLIC_SYNC, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(25_000),
    });
    if (!response.ok) throw new Error(`artist profile sync HTTP ${response.status}`);
    const payload = await response.json() as { directory?: ArtistDirectoryEntry[] };
    return (payload.directory ?? []).filter((entry): entry is ArtistDirectoryEntry =>
      Boolean(entry) && typeof entry.rvar === "string" && typeof entry.name === "string" && Array.isArray(entry.aliases));
  }

  async function run() {
    if (busy) return;
    busy = true;
    try {
      const files = (await readdir(CANON)).filter((file) => FILE.test(file)).sort();
      const directory: ArtistDirectoryEntry[] = [];
      const pending: Array<{ view: ArtistProfileView; signature: string }> = [];
      const unreadable = new Set<string>();
      for (const file of files) {
        const path = join(CANON, file);
        const fileRvar = file.slice(0, -".json".length);
        try {
          const info = await stat(path);
          const signature = `${info.size}:${info.mtimeMs}`;
          const view = projectArtistProfile(JSON.parse(await readFile(path, "utf8")));
          if (!view || file !== `${view.rvar}.json`) continue;
          directory.push({ rvar: view.rvar, name: view.name, aliases: view.aliases });
          if (sent.get(view.rvar) !== signature) pending.push({ view, signature });
        } catch {
          /* A Curator rewrite may still be on disk; do not unpublish it this pass. */
          unreadable.add(fileRvar);
        }
      }

      // Stored directory survives bridge restarts. Diff it against files that are still complete.
      const published = await post({ profiles: [] });
      for (let offset = 0; offset < pending.length; offset += 5) {
        const batch = pending.slice(offset, offset + 5);
        await post({ profiles: batch.map((item) => item.view) });
        for (const item of batch) sent.set(item.view.rvar, item.signature);
      }

      const plan = planArtistProfileRetirement({
        published,
        sent: [...sent.keys()],
        complete: directory,
        unreadable: [...unreadable],
      });
      const directorySignature = JSON.stringify(plan.directory);
      if (sentDirectory !== directorySignature) {
        // Directory replacement already deletes stored artists it leaves out, with no 200-item remove cap.
        await post({ profiles: [], directory: plan.directory });
        sentDirectory = directorySignature;
        for (const rvar of plan.retiredByDirectory) sent.delete(rvar);
      }
      for (const batch of plan.removalBatches) {
        await post({ profiles: [], remove: batch });
        for (const rvar of batch) sent.delete(rvar);
      }
    } catch (error) {
      console.warn("[live-bridge] Artist profile sync will retry:", error instanceof Error ? error.message : String(error));
    } finally {
      busy = false;
    }
  }

  void run();
  setInterval(() => void run(), 60_000);
}
