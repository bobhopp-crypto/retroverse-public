import { redirect } from "next/navigation";

type Props = { params: Promise<{ slug: string }> };

export default async function ArtistAlbumsPage({ params }: Props) {
  const { slug } = await params;
  const key = slug.trim().toLowerCase();
  redirect(`/artist/${key}#essential-albums`);
}
