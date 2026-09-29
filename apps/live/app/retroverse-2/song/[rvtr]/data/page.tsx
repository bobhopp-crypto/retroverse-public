import { redirect } from "next/navigation";

/** The unlinked database-backed editor is archived; the song remains public. */
export default async function SongDataPage({ params }: { params: Promise<{ rvtr: string }> }) {
  const { rvtr } = await params;
  redirect(`/retroverse-2/song/${encodeURIComponent(rvtr)}`);
}
