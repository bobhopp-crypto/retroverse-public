import { readFile } from "fs/promises";
import Link from "next/link";

import { loadDeckIndex } from "@/lib/ops/intelligence/deck-index";
import { loadSongPackageIndex, normalizePackageRvtr } from "@/lib/ops/intelligence/song-package-store";
import { normVdjPath, vdjDatabasePath } from "@/lib/ops/intelligence/vdj-database";
import { buildSundayNightsCurrentPayload } from "@/lib/sunday-nights/live-payload";
import { loadSundayNightsState } from "@/lib/sunday-nights/state";

import "./live-companion.css";

export const dynamic = "force-dynamic";

function decodeXmlAttr(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function readAttr(block: string, name: string): string {
  const match = block.match(new RegExp(`\\s${name}="([^"]*)"`));
  return match?.[1] ? decodeXmlAttr(match[1]) : "";
}

async function loadVdjLabelForPath(filePath: string | null | undefined): Promise<string | null> {
  if (!filePath?.trim()) return null;
  try {
    const wanted = normVdjPath(filePath);
    const xml = await readFile(vdjDatabasePath(), "utf8");
    for (const match of xml.matchAll(/<Song\s+FilePath="([^"]*)"[^>]*>([\s\S]*?)<\/Song>/g)) {
      const path = decodeXmlAttr(match[1] ?? "").replace(/\\/g, "/");
      if (normVdjPath(path) !== wanted) continue;
      const tagsAttrs = match[2]?.match(/<Tags([^>]*)\/?>/)?.[1] ?? "";
      return readAttr(tagsAttrs, "Label").trim() || null;
    }
  } catch {
    return null;
  }
  return null;
}

function yesNo(value: boolean): string {
  return value ? "Yes" : "No";
}

export default async function LiveCompanionPage() {
  const [state, packageIndex, deckIndex] = await Promise.all([
    loadSundayNightsState(),
    loadSongPackageIndex(),
    loadDeckIndex(),
  ]);
  const current = await buildSundayNightsCurrentPayload(state);
  const live = state.live;
  const rvtr = normalizePackageRvtr(current.currentTrackId ?? live?.rvtr ?? "");
  const vdjLabel = await loadVdjLabelForPath(live?.filepath);
  const hasPackage = Boolean(rvtr && packageIndex.packages.some((entry) => normalizePackageRvtr(entry.rvtr) === rvtr));
  const hasDeck = Boolean(rvtr && deckIndex.decks.some((entry) => normalizePackageRvtr(entry.rvtr) === rvtr));
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://retroverse.live";
  const publicHref = current.destination.href ? `${siteUrl}${current.destination.href}` : `${siteUrl}/live`;
  const patronSee =
    current.track != null
      ? `${current.track.artistName} - ${current.track.title} (${current.destination.kind})`
      : current.live
        ? `${current.live.artist} - ${current.live.title} (Fallback)`
        : "Waiting for the next song";

  return (
    <main className="live-companion">
      <header className="live-companion__header">
        <div>
          <p className="live-companion__kicker">DJ Companion</p>
          <h1>Live Public View</h1>
        </div>
        <Link href="/live" className="live-companion__button">
          Open Patron View
        </Link>
      </header>

      <section className="live-companion__panel live-companion__panel--accent">
        <h2>What Patrons Should See</h2>
        <p className="live-companion__big">{patronSee}</p>
        <Link href={publicHref} className="live-companion__public">
          {publicHref}
        </Link>
      </section>

      <section className="live-companion__grid">
        <article className="live-companion__panel">
          <h2>Bridge Payload</h2>
          <dl>
            <div><dt>Source</dt><dd>{live?.source ?? "none"}</dd></div>
            <div><dt>Title</dt><dd>{live?.title ?? "none"}</dd></div>
            <div><dt>Artist</dt><dd>{live?.artist ?? "none"}</dd></div>
            <div><dt>Deck</dt><dd>{live?.deck ?? "none"}</dd></div>
            <div><dt>Path</dt><dd>{live?.filepath ?? "none"}</dd></div>
            <div><dt>Bridge time</dt><dd>{live?.bridgeTimestamp ?? "none"}</dd></div>
          </dl>
        </article>

        <article className="live-companion__panel">
          <h2>Resolution</h2>
          <dl>
            <div><dt>RVTR</dt><dd>{rvtr ?? "unresolved"}</dd></div>
            <div><dt>Resolution</dt><dd>{live?.resolution ?? "none"}</dd></div>
            <div><dt>Year</dt><dd>{current.track?.releaseYear ?? live?.year ?? "unknown"}</dd></div>
            <div><dt>VDJ Label</dt><dd>{vdjLabel ?? "not available"}</dd></div>
            <div><dt>Package</dt><dd>{yesNo(hasPackage)}</dd></div>
            <div><dt>Deck</dt><dd>{yesNo(hasDeck)}</dd></div>
          </dl>
        </article>

        <article className="live-companion__panel">
          <h2>Current Endpoint</h2>
          <dl>
            <div><dt>Destination</dt><dd>{current.destination.kind}</dd></div>
            <div><dt>Destination URL</dt><dd>{current.destination.href ?? "/live fallback"}</dd></div>
            <div><dt>Last update</dt><dd>{current.updatedAt}</dd></div>
            <div><dt>Current track</dt><dd>{current.currentTrackId ?? "none"}</dd></div>
          </dl>
        </article>
      </section>
    </main>
  );
}
