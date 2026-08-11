import { notFound } from "next/navigation";

import { PublicSongExperience } from "@/components/retroverse/PublicSongExperience";
import { EditorialPageShell } from "@/app/components/editorial/editorial-primitives";
import { isPublicSongPayloadRenderable, loadPublicSongPayload } from "@/lib/retroverse/experience/load-public-song-payload";

type Props = {
  params: Promise<{ key: string }>;
};

/**
 * Legacy VDJ hash route — redirect to canonical song when Label RVTR is known.
 */
export default async function VdjBaseSongPage({ params }: Props) {
  const { key } = await params;
  const payload = await loadPublicSongPayload(`VDJ:${key}`);
  if (!isPublicSongPayloadRenderable(payload)) notFound();
  return <EditorialPageShell><PublicSongExperience payload={payload} /></EditorialPageShell>;
}
