import { NextResponse } from "next/server";

import {
  loadSongPackageManagementRows,
  type SongPackageCoverStatus,
  type SongPackageManagementStatus,
  type SongPackageRowsParams,
} from "@/lib/ops/intelligence/load-song-package-management";
import { isOpsEnabled } from "@/lib/ops/ops-gate";

export const dynamic = "force-dynamic";

function intParam(value: string | null, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

export async function GET(req: Request) {
  if (!isOpsEnabled()) {
    return NextResponse.json({ ok: false, error: "ops_disabled" }, { status: 403 });
  }

  const url = new URL(req.url);
  const quickRaw = url.searchParams.get("quickFilter");
  const params: SongPackageRowsParams = {
    query: url.searchParams.get("query") ?? "",
    year: url.searchParams.get("year") ?? "all",
    artist: url.searchParams.get("artist") ?? "all",
    packageStatus:
      (url.searchParams.get("packageStatus") as "all" | SongPackageManagementStatus | null) ?? "all",
    coverStatus:
      (url.searchParams.get("coverStatus") as "all" | SongPackageCoverStatus | null) ?? "all",
    minimumPlayCount: intParam(url.searchParams.get("minimumPlayCount"), 0),
    quickFilter:
      quickRaw && quickRaw !== "null" ? (quickRaw as SongPackageRowsParams["quickFilter"]) : null,
    mode: (url.searchParams.get("mode") as SongPackageRowsParams["mode"] | null) ?? "queue",
    page: intParam(url.searchParams.get("page"), 1),
    pageSize: intParam(url.searchParams.get("pageSize"), 50),
  };

  const result = await loadSongPackageManagementRows(params);
  return NextResponse.json({ ok: true, ...result });
}
