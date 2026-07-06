import type { Metadata } from "next";
import { redirect } from "next/navigation";

const RVTR_RE = /^RVTR\d{6}$/i;

type Props = {
  params: Promise<{ rvtr: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata(_props: Props): Promise<Metadata> {
  return { title: "Song — Retroverse" };
}

/**
 * Legacy Universal Renderer route — kept for existing links, but every
 * RVTR now resolves through the canonical Song Experience
 * (`/retroverse-2/song/[rvtr]`), which itself falls back to this same
 * renderer when no graph-backed track exists yet.
 */
export default async function SongMobileExperiencePage({ params }: Props) {
  const { rvtr } = await params;
  const decoded = decodeURIComponent(rvtr).trim();
  const target = RVTR_RE.test(decoded) ? decoded.toUpperCase() : decoded;
  redirect(`/retroverse-2/song/${target}`);
}
