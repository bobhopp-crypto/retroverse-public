import { notFound, redirect } from "next/navigation";

import { resolveArtistFromSlug } from "@/lib/artist/resolve-artist";

type Props = { params: Promise<{ slug: string }> };

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export default async function ArtistAlbumsPage({ params }: Props) {
  const { slug } = await params;
  const key = slug.trim().toLowerCase();
  if (!SLUG_PATTERN.test(key)) notFound();

  const resolved = await resolveArtistFromSlug(key);
  if (!resolved) notFound();

  redirect(`/artist/${resolved.slug}#essential-albums`);
}
