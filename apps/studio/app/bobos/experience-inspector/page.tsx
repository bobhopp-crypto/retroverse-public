import { notFound, redirect } from "next/navigation";

import { shouldAllowOpsRoutes } from "@/lib/runtime/site-mode";

export const dynamic = "force-dynamic";

type SearchParams = {
  rvtr?: string;
  vdj?: string;
  debugFailSection?: string;
};

/** Compatibility redirect — RV04-03 moved to Song Workspace. */
export default async function ExperienceInspectorRedirectPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  if (!shouldAllowOpsRoutes()) notFound();

  const params = await searchParams;
  const q = new URLSearchParams();
  if (params.rvtr?.trim()) q.set("rvtr", params.rvtr.trim());
  if (params.vdj?.trim()) q.set("vdj", params.vdj.trim());
  if (params.debugFailSection?.trim()) {
    q.set("debugFailSection", params.debugFailSection.trim());
  }
  const qs = q.toString();
  redirect(qs ? `/bobos/song-workspace?${qs}` : "/bobos/song-workspace");
}
