import { inspectQuery } from "@/lib/inspect/pg";

export type HealthyControlSpec = {
  rvtr: string;
  label: string;
  titlePattern: string;
  artistPattern: string;
};

/** Reference entities — what a fully enriched Hot 100 track looks like. */
export const HEALING_HEALTHY_CONTROLS: HealthyControlSpec[] = [
  {
    rvtr: "RVTR336241",
    label: "Thriller · Michael Jackson",
    titlePattern: "thriller",
    artistPattern: "michael",
  },
  {
    rvtr: "",
    label: "Hotel California · Eagles",
    titlePattern: "hotel california",
    artistPattern: "eagle",
  },
  {
    rvtr: "",
    label: "Like A Virgin · Madonna",
    titlePattern: "like a virgin",
    artistPattern: "madonna",
  },
];

type ControlRow = {
  track_id: string;
  canonical_title: string;
  canonical_artist_name: string;
  first_chart_date: string | null;
  chart_weeks: number;
  peak_hot100_position: number | null;
  has_hot100: boolean;
  has_vdj_media: boolean;
  album_link_count: number;
};

export async function resolveHealthyControlRvtrs(): Promise<HealthyControlSpec[]> {
  const rows = await inspectQuery<{
    track_id: string;
    canonical_title: string;
    canonical_artist_name: string;
  }>(
    `
    SELECT track_id, canonical_title, canonical_artist_name
    FROM canonical_track_display
    WHERE has_hot100 = true
      AND (
        (lower(trim(canonical_title)) LIKE '%thriller%'
          AND lower(trim(canonical_artist_name)) LIKE '%jackson%')
        OR (lower(trim(canonical_title)) LIKE '%hotel california%'
          AND lower(trim(canonical_artist_name)) LIKE '%eagle%')
        OR (lower(trim(canonical_title)) LIKE '%like a virgin%'
          AND lower(trim(canonical_artist_name)) LIKE '%madonna%')
      )
    ORDER BY chart_weeks DESC, peak_hot100_position ASC NULLS LAST
    `,
  );

  return HEALING_HEALTHY_CONTROLS.map((spec) => {
    if (spec.rvtr) return spec;
    const match = rows.find(
      (r) =>
        r.canonical_title.toLowerCase().includes(spec.titlePattern) &&
        r.canonical_artist_name.toLowerCase().includes(spec.artistPattern),
    );
    return { ...spec, rvtr: match?.track_id.trim().toUpperCase() ?? "" };
  }).filter((s) => s.rvtr);
}

export async function loadHealthyControlRows(): Promise<
  Array<ControlRow & { label: string }>
> {
  const specs = await resolveHealthyControlRvtrs();
  const rvtrs = specs.map((s) => s.rvtr);
  if (rvtrs.length === 0) return [];

  const rows = await inspectQuery<ControlRow>(
    `
    SELECT
      ctd.track_id,
      ctd.canonical_title,
      ctd.canonical_artist_name,
      ctd.first_chart_date::text AS first_chart_date,
      ctd.chart_weeks,
      ctd.peak_hot100_position,
      ctd.has_hot100,
      ctd.has_vdj_media,
      (SELECT count(*)::int FROM canonical_album_tracks cat
        WHERE upper(trim(cat.canonical_track_key)) = upper(trim(ctd.track_id))) AS album_link_count
    FROM canonical_track_display ctd
    WHERE upper(trim(ctd.track_id)) = ANY($1::text[])
    `,
    [rvtrs],
  );

  const byRvtr = new Map(rows.map((r) => [r.track_id.trim().toUpperCase(), r]));
  return specs
    .map((spec) => {
      const row = byRvtr.get(spec.rvtr);
      if (!row) return null;
      return { ...row, label: spec.label };
    })
    .filter((r): r is ControlRow & { label: string } => r != null);
}
