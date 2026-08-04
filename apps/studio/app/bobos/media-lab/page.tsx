import { redirect } from "next/navigation";
import { renderMediaLabRoute, mediaLabMetadata } from "@/components/ops/MediaLabRoute";

import "../../ops/ops.css";

export const dynamic = "force-dynamic";
export const metadata = mediaLabMetadata;

export default async function BobosMediaLabPage(props: { searchParams: Promise<{ collection?: string; episode?: string; mode?: string; performance?: string; return?: string; library?: string }> }) {
  const result = await renderMediaLabRoute(props);
  if ("redirect" in result) redirect(result.redirect);
  return result;
}
