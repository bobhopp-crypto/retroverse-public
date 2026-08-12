/**
 * RV04-03 Experience Inspector — inventory orchestration boundary.
 *
 * READ ONLY.
 * This module must never insert/update/delete Postgres rows, mutate canonical
 * JSON, modify VirtualDJ XML/database files, save AI output, publish packages,
 * generate thumbnails, trigger collectors, start pipeline jobs, repair
 * relationships, change broadcast state, or write under RETROVERSE_DATA.
 *
 * It only calls existing read loaders and normalizes results for display.
 */
import "server-only";

import { access } from "fs/promises";
import { join } from "path";

import { loadNowPlayingPackage } from "@/lib/broadcast/resolve-now-playing-package";
import { buildChartJourneyExperience } from "@/lib/experiences/chart-journey/build-experience";
import { computeArtifactReadiness } from "@/lib/ops/intelligence/artifact-readiness";
import {
  getBatchJob,
  loadBatchStatus,
} from "@/lib/ops/intelligence/batch-status";
import {
  bundledSongPackagePath,
  songPackagePath,
} from "@/lib/ops/intelligence/paths";
import { loadCoverInfoForRvtrs } from "@/lib/ops/intelligence/load-rvtr-covers";
import { vdjDatabasePath } from "@/lib/ops/intelligence/vdj-database";
import { loadBundledVdjRvtrEntry } from "@/lib/ops/intelligence/vdj-rvtr-index";
import {
  loadSongPackage,
  normalizePackageRvtr,
} from "@/lib/ops/intelligence/song-package-store";
import {
  loadRetroverseTagsStore,
  tagsForRvtr,
} from "@/lib/ops/retroverse-tags/store";
import { loadCollectorPackage } from "@/lib/ops/studio/collector/store";
import { loadSongDnaPackage } from "@/lib/ops/studio/collector/song-dna-store";
import { loadVisualIdentityPackage } from "@/lib/ops/studio/collector/visual-identity-store";
import { loadCreativeReviewPackage } from "@/lib/ops/studio/creative-review/store";
import {
  loadDirectorHandoff,
  loadDirectorPackage,
} from "@/lib/ops/studio/director/store";
import { loadEditorStory } from "@/lib/ops/studio/editor/store";
import { loadProductionTrackerSnapshot } from "@/lib/ops/studio/production-tracker/load-production-tracker";
import {
  getPublisherRecord,
  isPublisherApproved,
} from "@/lib/ops/studio/publisher/store";
import { loadVisualProduction } from "@/lib/ops/studio/publisher/visual-producer/store";
import { loadRetrograph } from "@/lib/ops/studio/retrograph/store";
import { loadPublicExhibit } from "@/lib/retroverse/experience/public-exhibit-store";
import { loadPublicExperience } from "@/lib/retroverse/renderer/load-public-experience";
import { loadDerivedVisuals } from "@/lib/retroverse/visual-assets/load-derived-visuals";
import { loadVisualLibrary } from "@/lib/retroverse/visual-library/build-visual-library";
import { resolveCanonicalTrack } from "@/lib/public/canonical-public-resolver";
import { normalizeRvtr, deriveStudioStage } from "@/lib/studio/status";
import { loadTrackPage } from "@/lib/track/load-track-page";
import { loadUniversalPackage } from "@/lib/universal-renderer/load-package";
import { resolveHeroForRvtr } from "@/lib/visual-profile/resolve-hero-for-rvtr";
import {
  bundledDirectorPilotOutputPath,
  directorPilotOutputPath,
} from "@/lib/ops/intelligence/ollama-experience-director/write-director-output";
import { readFile } from "fs/promises";

import { inspectSection, type SectionDefinition } from "./inspect-section";
import { loadMediaLinksForRvtr } from "./load-media-links";
import type {
  ExperienceInventory,
  ExperienceInventoryRequest,
  ExperienceInventorySection,
  ExperienceInventoryResolutionMethod,
  VdjRvtrLinkedEntry,
} from "./types";
import {
  findVdjEntryByRvtr,
  resolveRvtrFromVdjFilePath,
} from "./vdj-rvtr-entries";

async function readJsonIfExists<T>(path: string): Promise<T | null> {
  try {
    const raw = await readFile(path, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

type SharedContext = {
  rvtr: string;
  track: Awaited<ReturnType<typeof loadTrackPage>>;
  canonical: Awaited<ReturnType<typeof resolveCanonicalTrack>>;
  pkg: Awaited<ReturnType<typeof loadSongPackage>>;
  vdj: VdjRvtrLinkedEntry | null;
  covers: Awaited<ReturnType<typeof loadCoverInfoForRvtrs>>;
};

function presentObject(
  summary: string,
  data: unknown,
  count?: number,
): {
  status: "available";
  summary: string;
  count?: number;
  data: unknown;
} {
  return { status: "available", summary, count, data };
}

function missing(summary = "Not found"): {
  status: "missing";
  summary: string;
  data: null;
} {
  return { status: "missing", summary, data: null };
}

function empty(summary: string, data: unknown = []): {
  status: "empty";
  summary: string;
  count: number;
  data: unknown;
} {
  return { status: "empty", summary, count: 0, data };
}

function buildSectionDefs(ctx: SharedContext): SectionDefinition<unknown>[] {
  const { rvtr, track, canonical, pkg, vdj, covers } = ctx;
  const cover = covers.get(rvtr) ?? null;
  const facts = pkg?.candidateFacts ?? [];
  const trivia = facts.filter((f) => f.category === "trivia");
  const quotes = facts.filter((f) => f.category === "quote");
  const storyCards = pkg?.storyCards ?? [];
  const timeline = pkg?.intel?.timelineEvents ?? [];

  return [
    {
      id: "canonical-song",
      label: "Canonical song",
      source: {
        subsystem: "Postgres / canonical-public-resolver",
        loader: "resolveCanonicalTrack + loadTrackPage",
      },
      load: async () => track,
      classify: (data) => {
        if (!data) return missing("No canonical track for this RVTR");
        const t = data as NonNullable<typeof track>;
        return presentObject(
          `${t.title} — ${t.artistName}`,
          {
            rvtr: t.rvtr,
            canonicalTrackId: t.canonicalTrackId,
            title: t.title,
            artistName: t.artistName,
            releaseYear: t.releaseYear,
            peakHot100: t.peakHot100,
            chartWeeks: t.chartWeeks,
            hasHot100: t.hasHot100,
            hasVdjMedia: t.hasVdjMedia,
            resolverPath: t.resolverPath,
          },
        );
      },
    },
    {
      id: "artist",
      label: "Artist",
      source: {
        subsystem: "Postgres / artists",
        loader: "resolveCanonicalTrack (artist)",
      },
      load: async () => canonical?.artist ?? null,
      classify: (data) => {
        if (!data) return missing("Artist not resolved");
        const a = data as NonNullable<typeof canonical>["artist"];
        return presentObject(`${a.displayName} (${a.rvar})`, a);
      },
    },
    {
      id: "album",
      label: "Album",
      source: {
        subsystem: "Postgres / primary-album-policy",
        loader: "loadTrackPage.primaryAlbum",
      },
      load: async () => track?.primaryAlbum ?? null,
      classify: (data) => {
        if (!data) return missing("No primary album");
        const album = data as NonNullable<typeof track>["primaryAlbum"];
        return presentObject(
          `${album!.title}${album!.rval ? ` (${album!.rval})` : ""}`,
          album,
        );
      },
    },
    {
      id: "year",
      label: "Year",
      source: {
        subsystem: "Postgres / canonical year",
        loader: "loadTrackPage.releaseYear / resolveCanonicalTrack.canonicalYear",
      },
      load: async () =>
        track?.releaseYear ?? canonical?.canonicalYear ?? null,
      classify: (data) => {
        if (data == null) return missing("Year unknown");
        return presentObject(String(data), { year: data });
      },
    },
    {
      id: "database-identifiers",
      label: "Database identifiers",
      source: {
        subsystem: "Postgres",
        loader: "resolveCanonicalTrack",
      },
      load: async () => {
        if (!canonical) return null;
        return {
          rvtr: canonical.rvtr,
          canonicalTrackId: canonical.canonicalTrackId,
          graphTrackId: canonical.graphTrackId,
          trackFamilyId: canonical.trackFamilyId,
          artistId: canonical.artist.artistId,
          rvar: canonical.artist.rvar,
          primaryAlbumId: canonical.albumResolution.primaryAlbum?.albumId ?? null,
          primaryRval: canonical.albumResolution.primaryAlbum?.rval ?? null,
        };
      },
      classify: (data) =>
        data ? presentObject("Canonical IDs present", data) : missing(),
    },
    {
      id: "database-relationships",
      label: "Database relationships",
      source: {
        subsystem: "Postgres / track page graph",
        loader: "loadTrackPage",
      },
      load: async () => {
        if (!track) return null;
        return {
          primaryAlbum: track.primaryAlbum,
          secondaryAlbums: track.secondaryAlbums,
          relatedTracks: track.relatedTracks,
          chartWeeks: track.chartWeeks,
          trajectoryWeekCount: track.trajectoryWeeks.length,
          hasVdjMedia: track.hasVdjMedia,
        };
      },
      classify: (data) => {
        if (!data) return missing();
        const d = data as {
          secondaryAlbums: unknown[];
          relatedTracks: unknown[];
          trajectoryWeekCount: number;
        };
        const count =
          d.secondaryAlbums.length + d.relatedTracks.length + d.trajectoryWeekCount;
        return presentObject(
          `${d.relatedTracks.length} related · ${d.trajectoryWeekCount} chart weeks · ${d.secondaryAlbums.length} secondary albums`,
          data,
          count,
        );
      },
    },
    {
      id: "alternate-identifiers",
      label: "Alternate stored identifiers",
      source: {
        subsystem: "SongPackage metadata",
        loader: "loadSongPackage",
        path: songPackagePath(rvtr),
      },
      load: async () => {
        if (!pkg) return null;
        return {
          packageRvtr: pkg.rvtr,
          relatedArtists: pkg.metadata.relatedArtists ?? [],
          tags: pkg.metadata.tags ?? [],
          issueFlags: pkg.issueFlags ?? [],
        };
      },
      classify: (data) => {
        if (!data) return missing("No song package");
        return presentObject("Package metadata identifiers", data);
      },
    },
    {
      id: "canonical-artwork",
      label: "Canonical artwork",
      source: {
        subsystem: "Cover Library",
        loader: "loadCoverInfoForRvtrs",
      },
      load: async () => cover,
      classify: (data) => {
        if (!data) return missing("No cover info");
        const c = data as NonNullable<typeof cover>;
        if (!c.coverUrl) {
          return {
            status: "empty",
            summary: "Cover record without URL",
            count: 0,
            data: c,
          };
        }
        return presentObject(
          `${c.coverSource ?? "cover"} · ${c.albumTitle ?? "album"}`,
          c,
          1,
        );
      },
    },
    {
      id: "public-song-payload",
      label: "Public song payload",
      source: {
        subsystem: "Track page / public graph",
        loader: "loadTrackPage",
      },
      load: async () => track,
      classify: (data) =>
        data
          ? presentObject("Track page payload available", data)
          : missing("Public track page unavailable"),
    },
    {
      id: "story",
      label: "Story",
      source: {
        subsystem: "SongPackage",
        loader: "loadSongPackage.storyCards",
      },
      load: async () => storyCards,
      classify: (data) => {
        const cards = data as typeof storyCards;
        if (!pkg) return missing("No song package");
        if (cards.length === 0) return empty("No story cards", cards);
        return presentObject(`${cards.length} story card(s)`, cards, cards.length);
      },
    },
    {
      id: "timeline",
      label: "Timeline",
      source: {
        subsystem: "SongPackage intel",
        loader: "loadSongPackage.intel.timelineEvents",
      },
      load: async () => timeline,
      classify: (data) => {
        const events = data as typeof timeline;
        if (!pkg) return missing("No song package");
        if (events.length === 0) return empty("No timeline events", events);
        return presentObject(`${events.length} event(s)`, events, events.length);
      },
    },
    {
      id: "trivia",
      label: "Trivia",
      source: {
        subsystem: "SongPackage candidateFacts",
        loader: "loadSongPackage (category=trivia)",
      },
      load: async () => trivia,
      classify: (data) => {
        const items = data as typeof trivia;
        if (!pkg) return missing("No song package");
        if (items.length === 0) return empty("No trivia facts", items);
        return presentObject(`${items.length} trivia fact(s)`, items, items.length);
      },
    },
    {
      id: "quotes",
      label: "Quotes",
      source: {
        subsystem: "SongPackage candidateFacts",
        loader: "loadSongPackage (category=quote)",
      },
      load: async () => quotes,
      classify: (data) => {
        const items = data as typeof quotes;
        if (!pkg) return missing("No song package");
        if (items.length === 0) return empty("No quote facts", items);
        return presentObject(`${items.length} quote(s)`, items, items.length);
      },
    },
    {
      id: "related-songs",
      label: "Related songs",
      source: {
        subsystem: "Postgres / same-artist peers",
        loader: "loadTrackPage.relatedTracks",
      },
      load: async () => track?.relatedTracks ?? null,
      classify: (data) => {
        if (data == null) return missing("Track page unavailable");
        const items = data as NonNullable<typeof track>["relatedTracks"];
        if (items.length === 0) return empty("No related tracks", items);
        return presentObject(`${items.length} related track(s)`, items, items.length);
      },
    },
    {
      id: "chart-journey",
      label: "Chart Journey",
      source: {
        subsystem: "Chart Journey experience",
        loader: "buildChartJourneyExperience",
      },
      load: async () => buildChartJourneyExperience(rvtr),
      classify: (data) => {
        if (!data) return missing("No chart journey (missing track/trajectory)");
        const exp = data as NonNullable<
          Awaited<ReturnType<typeof buildChartJourneyExperience>>
        >;
        const chapterCount = exp.chapters?.length ?? 0;
        return presentObject(
          `${chapterCount} chapter(s) · peak ${exp.track.peakHot100 ?? "—"} · ${exp.track.chartWeeks} weeks`,
          {
            rvtr: exp.rvtr,
            artist: exp.artist,
            title: exp.title,
            chapterCount,
            skippedChapterCount: exp.skippedChapters?.length ?? 0,
            peakHot100: exp.track.peakHot100,
            chartWeeks: exp.track.chartWeeks,
            review: exp.review,
            generatedAt: exp.generatedAt,
          },
          chapterCount,
        );
      },
    },
    {
      id: "song-package",
      label: "Public JSON package (SongPackage)",
      source: {
        subsystem: "Intelligence packages",
        loader: "loadSongPackage",
        path: songPackagePath(rvtr),
      },
      load: async () => pkg,
      classify: (data) => {
        if (!data) return missing("No SongPackage JSON");
        const p = data as NonNullable<typeof pkg>;
        return presentObject(
          `status=${p.status} · facts=${p.candidateFacts.length} · stories=${p.candidateStories.length} · cards=${p.storyCards.length}`,
          {
            rvtr: p.rvtr,
            status: p.status,
            updatedAt: p.updatedAt,
            publishedAt: p.publishedAt,
            processLogTail: p.processLog.slice(-5),
            factCount: p.candidateFacts.length,
            storyCount: p.candidateStories.length,
            cardCount: p.storyCards.length,
            researchVaultCount: p.researchVault.length,
            metadata: p.metadata,
          },
        );
      },
    },
    {
      id: "universal-package",
      label: "Universal renderer package",
      source: {
        subsystem: "Universal renderer",
        loader: "loadUniversalPackage",
      },
      load: async () => loadUniversalPackage(rvtr),
      classify: (data) => {
        if (!data) return missing("No universal package payload");
        const u = data as NonNullable<Awaited<ReturnType<typeof loadUniversalPackage>>>;
        return presentObject(
          `${u.cards.length} card(s) · ${u.artist} — ${u.title}`,
          {
            rvtr: u.rvtr,
            artist: u.artist,
            title: u.title,
            year: u.year,
            cardKinds: u.cards.map((c) => c.kind),
            cardCount: u.cards.length,
          },
          u.cards.length,
        );
      },
    },
    {
      id: "bundled-package-file",
      label: "Bundled package file presence",
      source: {
        subsystem: "data/ops/intelligence/packages",
        loader: "fs.access",
        path: bundledSongPackagePath(rvtr),
      },
      load: async () => {
        const runtime = songPackagePath(rvtr);
        const bundled = bundledSongPackagePath(rvtr);
        return {
          runtimePath: runtime,
          runtimeExists: await pathExists(runtime),
          bundledPath: bundled,
          bundledExists: await pathExists(bundled),
        };
      },
      classify: (data) => {
        const d = data as {
          runtimeExists: boolean;
          bundledExists: boolean;
          runtimePath: string;
          bundledPath: string;
        };
        if (!d.runtimeExists && !d.bundledExists) {
          return missing("Neither runtime nor bundled package file");
        }
        return presentObject(
          `runtime=${d.runtimeExists} bundled=${d.bundledExists}`,
          d,
        );
      },
    },
    {
      id: "public-exhibit",
      label: "Public exhibit (experience.json)",
      source: {
        subsystem: "Public exhibit store",
        loader: "loadPublicExhibit",
      },
      load: async () => loadPublicExhibit(rvtr),
      classify: (data) =>
        data ? presentObject("Public exhibit present", data) : missing(),
    },
    {
      id: "public-experience",
      label: "Published public experience",
      source: {
        subsystem: "Public experience renderer",
        loader: "loadPublicExperience",
      },
      load: async () => loadPublicExperience(rvtr),
      classify: (data) =>
        data
          ? presentObject("Published experience payload available", data)
          : missing("Not published or not renderable"),
    },
    {
      id: "public-experience-ops-preview",
      label: "Public experience (ops preview, gate bypass)",
      source: {
        subsystem: "Public experience renderer",
        loader: "loadPublicExperience({ bypassPublisherGate: true })",
      },
      load: async () => loadPublicExperience(rvtr, { bypassPublisherGate: true }),
      classify: (data) =>
        data
          ? presentObject("Ops-preview experience available", data)
          : missing("No director/render experience for ops preview"),
    },
    {
      id: "virtualdj-record",
      label: "VirtualDJ record (Label RVTR)",
      source: {
        subsystem: "VirtualDJ database.xml",
        loader: "findVdjEntryByRvtr / scanVdjDatabase",
        path: vdjDatabasePath(),
      },
      load: async () => vdj,
      classify: (data) => {
        if (!data) return missing("No VDJ entry with this RVTR in Label");
        const e = data as VdjRvtrLinkedEntry;
        return presentObject(`${e.artist} — ${e.title}`, e);
      },
    },
    {
      id: "virtualdj-file-path",
      label: "VirtualDJ file path",
      source: {
        subsystem: "VirtualDJ database.xml",
        loader: "findVdjEntryByRvtr",
      },
      load: async () => vdj?.filePath ?? null,
      classify: (data) =>
        data
          ? presentObject(String(data), { filePath: data })
          : missing("No VDJ file path"),
    },
    {
      id: "virtualdj-play-count",
      label: "VirtualDJ play count",
      source: {
        subsystem: "VirtualDJ database.xml",
        loader: "findVdjEntryByRvtr",
      },
      load: async () => (vdj ? { playCount: vdj.playCount } : null),
      classify: (data) => {
        if (!data) return missing("No VDJ record");
        const pc = (data as { playCount: number | null }).playCount;
        if (pc == null) return empty("Play count unset", data);
        return presentObject(`${pc} plays`, data, pc);
      },
    },
    {
      id: "virtualdj-tags-metadata",
      label: "VirtualDJ tags and metadata",
      source: {
        subsystem: "VirtualDJ database.xml",
        loader: "findVdjEntryByRvtr",
      },
      load: async () => {
        if (!vdj) return null;
        return {
          label: vdj.label,
          user2: vdj.user2,
          album: vdj.album,
          year: vdj.year,
          isVideo: vdj.isVideo,
        };
      },
      classify: (data) =>
        data ? presentObject("VDJ metadata present", data) : missing(),
    },
    {
      id: "virtualdj-attached-rvtr",
      label: "VirtualDJ attached RVTR",
      source: {
        subsystem: "VirtualDJ Label field",
        loader: "rvtrFromVdjLabel",
      },
      load: async () =>
        vdj ? { attachedRvtr: vdj.rvtr, label: vdj.label } : null,
      classify: (data) =>
        data
          ? presentObject(`Label carries ${(data as { attachedRvtr: string }).attachedRvtr}`, data)
          : missing("No Label RVTR"),
    },
    {
      id: "virtualdj-video-karaoke",
      label: "VirtualDJ video / karaoke metadata",
      source: {
        subsystem: "VirtualDJ database.xml",
        loader: "findVdjEntryByRvtr",
      },
      load: async () => {
        if (!vdj) return null;
        return {
          isVideo: vdj.isVideo,
          filePath: vdj.filePath,
          looksLikeKaraoke: /karaoke/i.test(vdj.filePath),
        };
      },
      classify: (data) => {
        if (!data) return missing();
        const d = data as {
          isVideo: boolean;
          looksLikeKaraoke: boolean;
          filePath: string;
        };
        return presentObject(
          `video=${d.isVideo} karaokePath=${d.looksLikeKaraoke}`,
          d,
        );
      },
    },
    {
      id: "bundled-vdj-index",
      label: "Bundled VDJ RVTR index",
      source: {
        subsystem: "data/ops/vdj-rvtr-index.json",
        loader: "loadBundledVdjRvtrEntry",
      },
      load: async () => loadBundledVdjRvtrEntry(rvtr),
      classify: (data) =>
        data ? presentObject("Bundled VDJ index entry", data) : missing(),
    },
    {
      id: "retroverse-tags",
      label: "Retroverse Tags",
      source: {
        subsystem: "ops/retroverse-tags-by-rvtr.json",
        loader: "loadRetroverseTagsStore + tagsForRvtr",
      },
      load: async () => {
        const store = await loadRetroverseTagsStore();
        return tagsForRvtr(store, rvtr);
      },
      classify: (data) => {
        const tags = data as string[];
        if (tags.length === 0) return empty("No Retroverse Tags", tags);
        return presentObject(`${tags.length} tag(s): ${tags.join(", ")}`, tags, tags.length);
      },
    },
    {
      id: "media-library",
      label: "Media Library records",
      source: {
        subsystem: "Postgres media_assets + media_track_links",
        loader: "loadMediaLinksForRvtr",
      },
      load: async () => loadMediaLinksForRvtr(rvtr),
      classify: (data) => {
        const rows = data as Awaited<ReturnType<typeof loadMediaLinksForRvtr>>;
        if (rows.length === 0) return empty("No media_track_links for RVTR", rows);
        return presentObject(`${rows.length} media asset(s)`, rows, rows.length);
      },
    },
    {
      id: "local-videos",
      label: "Local videos",
      source: {
        subsystem: "VirtualDJ + Media Library",
        loader: "findVdjEntryByRvtr + loadMediaLinksForRvtr",
      },
      load: async () => {
        const media = await loadMediaLinksForRvtr(rvtr);
        const videos = media.filter((m) =>
          /\.(mp4|mov|m4v|mkv)$/i.test(m.fileExtension ?? m.sourcePath ?? ""),
        );
        return {
          vdjVideoPath: vdj?.isVideo ? vdj.filePath : null,
          mediaVideos: videos,
        };
      },
      classify: (data) => {
        const d = data as {
          vdjVideoPath: string | null;
          mediaVideos: unknown[];
        };
        const count = (d.vdjVideoPath ? 1 : 0) + d.mediaVideos.length;
        if (count === 0) return empty("No local video references", d);
        return presentObject(`${count} video reference(s)`, d, count);
      },
    },
    {
      id: "youtube-references",
      label: "YouTube references",
      source: {
        subsystem: "SongPackage / collector research",
        loader: "loadSongPackage + loadCollectorPackage",
      },
      load: async () => {
        const collector = await loadCollectorPackage(rvtr);
        const vaultUrls = (pkg?.researchVault ?? [])
          .map((e) => e.url)
          .filter((u) => /youtu(\.be|be\.com)/i.test(u));
        const factUrls = (pkg?.candidateFacts ?? [])
          .map((f) => f.sourceUrl)
          .filter((u): u is string => Boolean(u && /youtu(\.be|be\.com)/i.test(u)));
        const collectorBlob = collector ? JSON.stringify(collector) : "";
        const collectorHits = collectorBlob.match(/https?:\/\/(?:www\.)?youtu[\w./?=&%-]+/gi) ?? [];
        const urls = [...new Set([...vaultUrls, ...factUrls, ...collectorHits])];
        return urls;
      },
      classify: (data) => {
        const urls = data as string[];
        if (urls.length === 0) return empty("No YouTube URLs found", urls);
        return presentObject(`${urls.length} YouTube URL(s)`, urls, urls.length);
      },
    },
    {
      id: "hero-artwork",
      label: "Hero / resolved artwork",
      source: {
        subsystem: "Visual profile",
        loader: "resolveHeroForRvtr",
      },
      load: async () => resolveHeroForRvtr(rvtr),
      classify: (data) => {
        const hero = data as Awaited<ReturnType<typeof resolveHeroForRvtr>>;
        if (!hero.url) return missing("No hero URL resolved");
        return presentObject(`tier=${hero.tier ?? "—"}`, hero, 1);
      },
    },
    {
      id: "derived-visuals",
      label: "Derived visuals",
      source: {
        subsystem: "Visual assets",
        loader: "loadDerivedVisuals",
      },
      load: async () => loadDerivedVisuals(rvtr),
      classify: (data) => {
        const items = data as Awaited<ReturnType<typeof loadDerivedVisuals>>;
        if (items.length === 0) {
          return {
            status: "empty" as const,
            summary: "No derived visuals (loader currently returns empty)",
            count: 0,
            data: items,
          };
        }
        return presentObject(`${items.length} derived visual(s)`, items, items.length);
      },
    },
    {
      id: "visual-identity",
      label: "Collector visual identity",
      source: {
        subsystem: "Studio Collector",
        loader: "loadVisualIdentityPackage",
      },
      load: async () => loadVisualIdentityPackage(rvtr),
      classify: (data) =>
        data ? presentObject("Visual identity package present", data) : missing(),
    },
    {
      id: "visual-library",
      label: "Visual library",
      source: {
        subsystem: "Studio visual library",
        loader: "loadVisualLibrary",
      },
      load: async () => loadVisualLibrary(rvtr),
      classify: (data) =>
        data ? presentObject("Visual library present", data) : missing(),
    },
    {
      id: "visual-production",
      label: "Visual production plan",
      source: {
        subsystem: "Studio Publisher visual producer",
        loader: "loadVisualProduction",
      },
      load: async () => loadVisualProduction(rvtr),
      classify: (data) =>
        data ? presentObject("Visual production plan present", data) : missing(),
    },
    {
      id: "browser-plus-thumbnail",
      label: "Browser+ thumbnail export",
      source: {
        subsystem: "Thumbnail exports",
        loader: "fs.access",
        path: "/Users/bobhopp/Sites/retroverse-data/exports/thumbnails",
      },
      load: async () => {
        if (!vdj?.filePath) {
          return { checked: false, reason: "No VDJ file path to derive thumbnail key" };
        }
        const root = "/Users/bobhopp/Sites/retroverse-data/exports/thumbnails";
        // Browser+ uses path-derived thumbnail files; probe common extensions.
        const base = Buffer.from(vdj.filePath).toString("base64url").slice(0, 48);
        const candidates = [".jpg", ".jpeg", ".png", ".webp"].map((ext) =>
          join(root, `${base}${ext}`),
        );
        const found: string[] = [];
        for (const candidate of candidates) {
          if (await pathExists(candidate)) found.push(candidate);
        }
        // Also check if export root exists at all
        const rootExists = await pathExists(root);
        return { root, rootExists, vdjFilePath: vdj.filePath, found };
      },
      classify: (data) => {
        const d = data as {
          checked?: boolean;
          reason?: string;
          rootExists?: boolean;
          found?: string[];
        };
        if (d.checked === false) return missing(d.reason ?? "Not checked");
        if (!d.rootExists) return missing("Thumbnail export root missing");
        if (!d.found?.length) {
          return empty("No thumbnail file matched for this VDJ path", d);
        }
        return presentObject(`${d.found.length} thumbnail file(s)`, d, d.found.length);
      },
    },
    {
      id: "now-playing-package",
      label: "Now-playing / broadcast package",
      source: {
        subsystem: "Broadcast",
        loader: "loadNowPlayingPackage",
      },
      load: async () => loadNowPlayingPackage(rvtr),
      classify: (data) => {
        if (!data) return missing("No now-playing package");
        const p = data as NonNullable<Awaited<ReturnType<typeof loadNowPlayingPackage>>>;
        return presentObject(
          `${p.cards.length} card(s) for ${p.artist} — ${p.title}`,
          {
            rvtr: p.rvtr,
            artist: p.artist,
            title: p.title,
            year: p.year,
            cardCount: p.cards.length,
            cardKinds: p.cards.map((c) => c.kind),
          },
          p.cards.length,
        );
      },
    },
    {
      id: "publisher-record",
      label: "Publisher / publication gate",
      source: {
        subsystem: "Studio Publisher",
        loader: "getPublisherRecord + isPublisherApproved",
      },
      load: async () => {
        const record = await getPublisherRecord(rvtr);
        return {
          record,
          approved: isPublisherApproved(record),
        };
      },
      classify: (data) => {
        const d = data as {
          record: Awaited<ReturnType<typeof getPublisherRecord>>;
          approved: boolean;
        };
        if (!d.record) return missing("No publisher record");
        return presentObject(
          `approved=${d.approved} · class=${d.record.approvedClass ?? "—"}`,
          d,
        );
      },
    },
    {
      id: "artifact-readiness",
      label: "Package artifact readiness",
      source: {
        subsystem: "Intelligence artifact readiness",
        loader: "computeArtifactReadiness",
      },
      load: async () => {
        if (!pkg) return null;
        return computeArtifactReadiness(pkg);
      },
      classify: (data) => {
        if (!data) return missing("Requires SongPackage");
        const r = data as ReturnType<typeof computeArtifactReadiness>;
        return presentObject(
          `allReady=${r.allReady} · label=${r.record_label} timeline=${r.timeline} stories=${r.story_constellation} dna=${r.song_dna}`,
          r,
        );
      },
    },
    {
      id: "batch-pipeline-status",
      label: "Batch / pipeline job status",
      source: {
        subsystem: "Intelligence batch status",
        loader: "loadBatchStatus + getBatchJob",
      },
      load: async () => {
        const file = await loadBatchStatus();
        return getBatchJob(file, rvtr) ?? null;
      },
      classify: (data) =>
        data
          ? presentObject(`status=${(data as { status: string }).status}`, data)
          : missing("No batch job for this RVTR"),
    },
    {
      id: "collector-package",
      label: "Collector package",
      source: {
        subsystem: "Studio Collector",
        loader: "loadCollectorPackage",
      },
      load: async () => loadCollectorPackage(rvtr),
      classify: (data) =>
        data ? presentObject("Collector package present", data) : missing(),
    },
    {
      id: "song-dna",
      label: "Song DNA",
      source: {
        subsystem: "Studio Collector",
        loader: "loadSongDnaPackage",
      },
      load: async () => loadSongDnaPackage(rvtr),
      classify: (data) =>
        data ? presentObject("Song DNA present", data) : missing(),
    },
    {
      id: "retrograph",
      label: "Retrograph",
      source: {
        subsystem: "Studio Retrograph",
        loader: "loadRetrograph",
      },
      load: async () => loadRetrograph(rvtr),
      classify: (data) =>
        data ? presentObject("Retrograph present", data) : missing(),
    },
    {
      id: "editor-story",
      label: "Editor story",
      source: {
        subsystem: "Studio Editor",
        loader: "loadEditorStory",
      },
      load: async () => loadEditorStory(rvtr),
      classify: (data) =>
        data ? presentObject("Editor story present", data) : missing(),
    },
    {
      id: "director-handoff",
      label: "Director handoff",
      source: {
        subsystem: "Studio Director",
        loader: "loadDirectorHandoff",
      },
      load: async () => loadDirectorHandoff(rvtr),
      classify: (data) =>
        data ? presentObject("Director handoff present", data) : missing(),
    },
    {
      id: "director-package",
      label: "Studio Director package",
      source: {
        subsystem: "Studio Director",
        loader: "loadDirectorPackage",
      },
      load: async () => loadDirectorPackage(rvtr),
      classify: (data) =>
        data ? presentObject("Director package present", data) : missing(),
    },
    {
      id: "studio-stage",
      label: "Studio Alpha stage",
      source: {
        subsystem: "Studio Kernel status",
        loader: "deriveStudioStage (from artifact presence)",
      },
      load: async () => {
        const [collector, editor, director] = await Promise.all([
          loadCollectorPackage(rvtr),
          loadEditorStory(rvtr),
          loadDirectorPackage(rvtr),
        ]);
        const published = isPublisherApproved(await getPublisherRecord(rvtr));
        const stage = deriveStudioStage({
          hasCollector: Boolean(collector),
          hasEditor: Boolean(editor),
          hasDirector: Boolean(director),
          renderReady: published,
        });
        return {
          stage,
          hasCollector: Boolean(collector),
          hasEditor: Boolean(editor),
          hasDirector: Boolean(director),
          renderReady: published,
        };
      },
      classify: (data) => {
        const d = data as { stage: string };
        return presentObject(`stage=${d.stage}`, data);
      },
    },
    {
      id: "production-tracker",
      label: "Production tracker",
      source: {
        subsystem: "Studio production tracker",
        loader: "loadProductionTrackerSnapshot",
      },
      load: async () => loadProductionTrackerSnapshot(rvtr),
      classify: (data) =>
        data
          ? presentObject(
              `pipeline=${(data as { pipelineStage?: string }).pipelineStage ?? "—"}`,
              data,
            )
          : missing(),
    },
    {
      id: "creative-review",
      label: "Creative review draft",
      source: {
        subsystem: "Studio creative review",
        loader: "loadCreativeReviewPackage",
      },
      load: async () => loadCreativeReviewPackage(rvtr),
      classify: (data) =>
        data ? presentObject("Creative review present", data) : missing(),
    },
    {
      id: "director-pilot",
      label: "Ollama Experience Director Pilot draft",
      source: {
        subsystem: "Ollama Experience Director Pilot",
        loader: "directorPilotOutputPath / bundledDirectorPilotOutputPath",
        path: directorPilotOutputPath(rvtr),
      },
      load: async () => {
        for (const path of [
          bundledDirectorPilotOutputPath(rvtr),
          directorPilotOutputPath(rvtr),
        ]) {
          const data = await readJsonIfExists<Record<string, unknown>>(path);
          if (data?.rvtr) return { path, data };
        }
        return null;
      },
      classify: (data) =>
        data
          ? presentObject(
              `Director pilot draft at ${(data as { path: string }).path}`,
              data,
            )
          : missing("No director-pilot JSON for this RVTR"),
    },
    {
      id: "candidate-stories",
      label: "Candidate stories (draft)",
      source: {
        subsystem: "SongPackage",
        loader: "loadSongPackage.candidateStories",
      },
      load: async () => pkg?.candidateStories ?? null,
      classify: (data) => {
        if (data == null) return missing("No song package");
        const stories = data as NonNullable<typeof pkg>["candidateStories"];
        if (stories.length === 0) return empty("No candidate stories", stories);
        return presentObject(`${stories.length} candidate stor(ies)`, stories, stories.length);
      },
    },
    {
      id: "research-vault",
      label: "Research vault entries",
      source: {
        subsystem: "SongPackage researchVault",
        loader: "loadSongPackage.researchVault",
      },
      load: async () => pkg?.researchVault ?? null,
      classify: (data) => {
        if (data == null) return missing("No song package");
        const vault = data as NonNullable<typeof pkg>["researchVault"];
        if (vault.length === 0) return empty("Research vault empty", vault);
        return presentObject(`${vault.length} research entry(ies)`, vault, vault.length);
      },
    },
  ];
}

export type ResolvedInventoryIdentity = {
  rvtr: string;
  requestedIdentifier: string;
  method: ExperienceInventoryResolutionMethod;
  vdjEntry: VdjRvtrLinkedEntry | null;
};

/**
 * Resolve a request to an authoritative RVTR.
 * Accepts direct RVTR or a VirtualDJ path whose Label already contains an RVTR.
 * Never falls back to title/artist matching.
 */
export async function resolveInventoryIdentity(
  request: ExperienceInventoryRequest,
): Promise<ResolvedInventoryIdentity | { error: string }> {
  const vdjPath = request.vdjFilePath?.trim() || null;
  if (vdjPath) {
    const resolved = await resolveRvtrFromVdjFilePath(vdjPath);
    if (!resolved) {
      return {
        error:
          "VirtualDJ path not found, or Label does not contain an authoritative RVTR. No fuzzy resolution is performed.",
      };
    }
    return {
      rvtr: resolved.rvtr,
      requestedIdentifier: vdjPath,
      method: "virtualdj-rvtr",
      vdjEntry: resolved.entry,
    };
  }

  const raw = request.rvtr?.trim() || "";
  const rvtr = normalizeRvtr(raw) ?? normalizePackageRvtr(raw);
  if (!rvtr) {
    return {
      error: "Provide a valid RVTR (RVTR######) or a VirtualDJ track with an attached Label RVTR.",
    };
  }

  const vdjEntry = await findVdjEntryByRvtr(rvtr);
  return {
    rvtr,
    requestedIdentifier: raw || rvtr,
    method: "rvtr",
    vdjEntry,
  };
}

/** Read-only Experience Inventory for one song. */
export async function readExperienceInventory(
  request: ExperienceInventoryRequest,
): Promise<ExperienceInventory | { error: string }> {
  const identity = await resolveInventoryIdentity(request);
  if ("error" in identity) return identity;

  const { rvtr, requestedIdentifier, method, vdjEntry } = identity;

  // Shared preload — each loader uses its own cache where available.
  // Failures here become missing identity fields, not a hard crash.
  const [trackResult, canonicalResult, pkgResult, coverResult] =
    await Promise.allSettled([
      loadTrackPage(rvtr),
      resolveCanonicalTrack(rvtr),
      loadSongPackage(rvtr),
      loadCoverInfoForRvtrs([rvtr]),
    ]);

  const track = trackResult.status === "fulfilled" ? trackResult.value : null;
  const canonical =
    canonicalResult.status === "fulfilled" ? canonicalResult.value : null;
  const pkg = pkgResult.status === "fulfilled" ? pkgResult.value : null;
  const covers =
    coverResult.status === "fulfilled" ? coverResult.value : new Map();

  const ctx: SharedContext = {
    rvtr,
    track,
    canonical,
    pkg,
    vdj: vdjEntry,
    covers,
  };

  const defs = buildSectionDefs(ctx);
  const sections = await Promise.all(defs.map((def) => inspectSection(def)));

  const debugFail = request.debugFailSection?.trim();
  if (debugFail) {
    const idx = sections.findIndex((s) => s.id === debugFail);
    if (idx >= 0) {
      sections[idx] = {
        ...sections[idx]!,
        status: "error",
        error: `Forced failure via debugFailSection=${debugFail}`,
        data: undefined,
      };
    } else {
      sections.push({
        id: debugFail,
        label: `Debug fail (${debugFail})`,
        status: "error",
        source: { subsystem: "experience-inspector", loader: "debugFailSection" },
        error: `Forced failure for unknown section id ${debugFail}`,
      });
    }
  }

  // Surface shared preload errors as dedicated sections when applicable.
  const preloadErrors: ExperienceInventorySection[] = [];
  if (trackResult.status === "rejected") {
    preloadErrors.push({
      id: "preload-track-page",
      label: "Track page preload",
      status: "error",
      source: { subsystem: "loadTrackPage", loader: "loadTrackPage" },
      error:
        trackResult.reason instanceof Error
          ? trackResult.reason.message
          : String(trackResult.reason),
    });
  }
  if (canonicalResult.status === "rejected") {
    preloadErrors.push({
      id: "preload-canonical",
      label: "Canonical track preload",
      status: "error",
      source: {
        subsystem: "resolveCanonicalTrack",
        loader: "resolveCanonicalTrack",
      },
      error:
        canonicalResult.reason instanceof Error
          ? canonicalResult.reason.message
          : String(canonicalResult.reason),
    });
  }
  if (pkgResult.status === "rejected") {
    preloadErrors.push({
      id: "preload-song-package",
      label: "Song package preload",
      status: "error",
      source: { subsystem: "loadSongPackage", loader: "loadSongPackage" },
      error:
        pkgResult.reason instanceof Error
          ? pkgResult.reason.message
          : String(pkgResult.reason),
    });
  }

  const allSections = [...preloadErrors, ...sections];

  const totals = {
    available: allSections.filter((s) => s.status === "available").length,
    missing: allSections.filter((s) => s.status === "missing").length,
    empty: allSections.filter((s) => s.status === "empty").length,
    errors: allSections.filter((s) => s.status === "error").length,
    notApplicable: allSections.filter((s) => s.status === "not-applicable").length,
  };

  const coverInfo = covers.get(rvtr);
  const artworkUrl =
    coverInfo?.coverUrl ??
    track?.coverUrl ??
    pkg?.metadata.coverUrl ??
    undefined;

  return {
    rvtr,
    inspectedAt: new Date().toISOString(),
    identity: {
      title: track?.title ?? pkg?.metadata.title ?? vdjEntry?.title,
      artist: track?.artistName ?? pkg?.metadata.artist ?? vdjEntry?.artist,
      album:
        track?.primaryAlbum?.title ??
        pkg?.metadata.albumTitle ??
        vdjEntry?.album ??
        undefined,
      year:
        track?.releaseYear ??
        canonical?.canonicalYear ??
        pkg?.metadata.year ??
        vdjEntry?.year ??
        undefined,
      artworkUrl: artworkUrl || undefined,
    },
    resolution: {
      requestedIdentifier,
      resolvedRvtr: rvtr,
      method,
    },
    totals,
    sections: allSections,
  };
}

// Re-export linked entry helper types for the page.
export type { VdjRvtrLinkedEntry } from "./types";
