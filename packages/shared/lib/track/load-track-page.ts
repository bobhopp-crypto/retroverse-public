import "server-only";

import { cache } from "react";
import type { PublicLoaderTiming } from "@/lib/public/canonical-public-resolver";
import type { PrimaryAlbumConfidence, PrimaryAlbumPolicyReason } from "@/lib/public/primary-album-policy";
import type { TrackTrajectoryWeek } from "@/lib/track/track-trajectory-types";
import { loadStaticTrackPage } from "./static-track-pages";

export type TrackAlbumLink = {
  albumId: number;
  title: string;
  releaseYear: number | null;
  rval: string | null;
  coverUrl: string | null;
  href: string | null;
  policyReason: PrimaryAlbumPolicyReason;
  reason: string;
  confidence: PrimaryAlbumConfidence;
};

export type TrackRelatedSong = {
  rvtr: string;
  title: string;
  releaseYear: number | null;
  peakHot100: number | null;
  href: string;
  coverUrl: string | null;
};

export type TrackPageData = {
  rvtr: string;
  canonicalTrackId: number;
  title: string;
  artistId: number;
  artistName: string;
  /** Canonical public route token; retained under the old field name for view compatibility. */
  artistSlug: string;
  artistHref: string;
  releaseYear: number | null;
  peakHot100: number | null;
  chartWeeks: number;
  firstChartDate: string | null;
  coverUrl: string | null;
  hasHot100: boolean;
  hasVdjMedia: boolean;
  primaryAlbum: TrackAlbumLink | null;
  secondaryAlbums: TrackAlbumLink[];
  primaryAlbumReason: string;
  primaryAlbumConfidence: PrimaryAlbumConfidence;
  albums: TrackAlbumLink[];
  trajectoryWeeks: TrackTrajectoryWeek[];
  chartRunLabel: string;
  relatedTracks: TrackRelatedSong[];
  rvYearHref: string | null;
  resolverPath: string[];
  loaderTimings: PublicLoaderTiming[];
};

/** Exact generated track-page data; production no longer opens Postgres. */
export const loadTrackPage = cache(loadStaticTrackPage);
