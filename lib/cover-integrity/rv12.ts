/**
 * RV12 — canonical artwork asset (future graph entity).
 *
 * Not persisted in Postgres yet. Scaffolding only: types + relationship hooks
 * for human-guided repair and eventual migration off filename-only covers.
 */

/** Future canonical artwork asset id (RV12######). */
export type Rv12AssetId = `RV12${string}`;

/** Album entity bridge (existing production id). */
export type RvalAlbumId = `RVAL${string}`;

/**
 * One RV12 asset may serve multiple roles; RVAL links to a primary slot first.
 * RV45 label-artifact variants attach later without replacing RV12 primary.
 */
export type Rv12AssetRole = "primary_cover" | "alternate_cover" | "rv45_label_plate";

/** In-memory / report-only link until graph tables exist. */
export type Rv12AlbumAssetLink = {
  rval: RvalAlbumId;
  rv12AssetId: Rv12AssetId | null;
  role: Rv12AssetRole;
  /** MD5 or perceptual hash of bytes at link time. */
  contentHash: string | null;
  linkedAt: string | null;
  source: "filesystem" | "r2" | "curator" | "repair_pull" | "placeholder";
};

/**
 * Deterministic placeholder RV12 hook — no asset id allocated until ingest pipeline exists.
 * Returns a stable synthetic key for reports and UI variant seeds.
 */
export function rv12PlaceholderHook(rval: string): string {
  const id = rval.trim().toUpperCase();
  return `RV12_PENDING_${id}`;
}

/** Shape for a future `rv12_assets` row (documentation-only). */
export type Rv12AssetRecord = {
  id: Rv12AssetId;
  contentHash: string;
  storagePath: string | null;
  r2Key: string | null;
  width: number | null;
  height: number | null;
  sourceUrl: string | null;
  reviewFlag: "curated" | "ok" | "review" | "reject" | "pending";
  createdAt: string;
};
