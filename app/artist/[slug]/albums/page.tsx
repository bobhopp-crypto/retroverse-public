import { notFound, redirect } from "next/navigation";

import { ARTIST_SLUGS } from "@/lib/artist/slug";

type Props = { params: Promise<{ slug: string }> };

export default async function ArtistAlbumsPage({ params }: Props) {
  const { slug } = await params;
  if (!ARTIST_SLUGS[slug]) notFound();
  redirect(`/artist/${slug}#essential-albums`);
}
