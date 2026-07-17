import "server-only";

import type { TrackPageData } from "@/lib/track/load-track-page";

export type RepairStatus = "Pending" | "Running" | "Needs Review" | "Approved" | "Applied" | "Rejected" | "Verified";
export type RepairEvidence = { signal: string; detail: string; strength: "strong" | "supporting" | "warning" };
export type RepairProposal = {
  id: string;
  rvtr: string;
  title: string;
  artist: string;
  currentAlbums: Array<{ id: number; title: string; rval: string | null; releaseYear: number | null; source: string; artwork: boolean }>;
  suggestedAlbums: Array<{ id: number; title: string; rval: string | null; releaseYear: number | null; source: string; artwork: boolean }>;
  evidence: RepairEvidence[];
  confidence: number;
  status: RepairStatus;
  createdAt: string;
  approvedAt?: string;
  verifiedAt?: string;
};

export function buildRepairProposal(track: TrackPageData): RepairProposal {
  const albums = track.albums.map((album) => ({ id: album.albumId, title: album.title, rval: album.rval, releaseYear: album.releaseYear, source: album.reason, artwork: Boolean(album.coverUrl) }));
  const evidence: RepairEvidence[] = [
    { signal: "Exact artist", detail: `${track.artistName} resolves to the canonical artist identity.`, strength: "strong" },
    { signal: "Exact title", detail: `${track.title} is loaded from canonical track display.`, strength: "strong" },
    { signal: "Chart history", detail: `${track.chartWeeks} chart weeks; first week ${track.firstChartDate ?? "unknown"}.`, strength: track.hasHot100 ? "strong" : "supporting" },
    { signal: "Existing bridge", detail: `${albums.length} existing album relationship${albums.length === 1 ? "" : "s"} loaded.`, strength: albums.length ? "supporting" : "warning" },
    { signal: "Artwork", detail: track.coverUrl ? "Artwork album is available." : "No artwork album resolved.", strength: track.coverUrl ? "supporting" : "warning" },
  ];
  return { id: `repair-${track.rvtr}-${Date.now()}`, rvtr: track.rvtr, title: track.title, artist: track.artistName, currentAlbums: albums, suggestedAlbums: albums.slice(), evidence, confidence: albums.length && track.hasHot100 ? 99 : 62, status: "Needs Review", createdAt: new Date().toISOString() };
}
