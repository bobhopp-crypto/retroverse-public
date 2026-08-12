import { redirect } from "next/navigation";

/** Legacy route — redirects to unified Media Lab workspace browser. */
export default async function MediaLabPerformancesRedirectPage(props: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await props.searchParams;
  const search = new URLSearchParams();
  search.set("library", "performances");
  if (params.collection) search.set("collection", params.collection);
  if (params.q) search.set("q", params.q);
  if (params.year) search.set("year", params.year);
  if (params.status) search.set("status", params.status);
  if (params.classification) search.set("classification", params.classification);
  redirect(`/bobos/media-lab?${search.toString()}`);
}
