import { notFound, redirect } from "next/navigation";
import { resolveCanonicalArtist } from "@/lib/public/canonical-public-resolver";

type Props = { params: Promise<{ slug: string }> };

export default async function ArtistTracksPage({ params }: Props) {
  const { slug } = await params;
  const canonical = await resolveCanonicalArtist(slug);
  if (!canonical) notFound();
  redirect(`/artist/${canonical.routeToken}/songs`);
}
