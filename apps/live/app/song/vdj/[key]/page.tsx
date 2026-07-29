import { redirect } from "next/navigation";

import { loadVdjBasePackage } from "@/lib/universal-renderer/load-vdj-base";
import { trackPageHref } from "@/lib/search/entity-routes";

type Props = {
  params: Promise<{ key: string }>;
};

/**
 * Legacy VDJ hash route — redirect to canonical song when Label RVTR is known.
 */
export default async function VdjBaseSongPage({ params }: Props) {
  const { key } = await params;
  const payload = await loadVdjBasePackage(key);
  if (!payload) redirect("/search");
  redirect(trackPageHref(payload.rvtr));
}
