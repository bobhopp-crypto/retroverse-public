import "server-only";

import { cache } from "react";
import type { TrackCoverageStatus } from "@/lib/charts/track-coverage";
import type { TrackTrajectoryWeek } from "@/lib/track/track-trajectory-types";
import type { SimilarAlbumMatch } from "./album-chart-similarity";
import { loadStaticAlbumPage } from "@/lib/public/static-catalog-pages";

export type AlbumTrackRow = {
  position: number;
  title: string;
  rvtr: string | null;
  href: string | null;
  coverageStatus: TrackCoverageStatus;
  coverUrl: string | null;
};

export type AlbumBreakoutSong = {
  rvtr: string;
  title: string;
  href: string;
  peakHot100: number;
  chartWeeks: number;
  firstChartDate: string | null;
  trajectoryWeeks: TrackTrajectoryWeek[];
};

export type AlbumInfoSection = {
  releaseDate: string | null;
  label: string | null;
  genres: string[];
  certifications: string[];
  awards: string[];
  majorSingles: string[];
  artistHref: string;
  yearHref: string | null;
  relatedExperiences: Array<{ label: string; href: string }>;
};

export type AlbumPageData = {
  rval: string;
  title: string;
  artistName: string;
  artistSlug: string;
  artistHref: string;
  releaseYear: number | null;
  coverUrl: string | null;
  b200Peak: number | null;
  chartWeeks: number;
  weeksAtPeak: number;
  weeksAtNumberOne: number;
  firstChartDate: string | null;
  lastChartDate: string | null;
  trajectoryWeeks: TrackTrajectoryWeek[];
  chartRunLabel: string;
  description: string;
  journeySummary: string | null;
  tracks: AlbumTrackRow[];
  breakoutSongs: AlbumBreakoutSong[];
  similarChartJourneys: SimilarAlbumMatch[];
  info: AlbumInfoSection;
  rvYearHref: string | null;
};

/** Exact saved album view, generated before removing Postgres. */
export const loadAlbumPage = cache(loadStaticAlbumPage);
