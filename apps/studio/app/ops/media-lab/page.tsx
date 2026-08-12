import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Media Lab — Retroverse Ops", robots: { index: false, follow: false } };

export default async function OpsMediaLabPage(props: { searchParams: Promise<{ collection?: string; episode?: string; mode?: string; performance?: string; return?: string; library?: string }> }) {
  const params = await props.searchParams;
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) search.set(key, value);
  redirect(`/bobos/media-lab${search.toString() ? `?${search.toString()}` : ""}`);
}
