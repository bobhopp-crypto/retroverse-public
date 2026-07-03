import { redirect } from "next/navigation";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function InspectRedirectPage({ searchParams }: Props) {
  const params = await searchParams;
  const q = params.q;
  const query =
    typeof q === "string" && q.trim()
      ? `?q=${encodeURIComponent(q.trim())}`
      : "";
  redirect(`/database-explorer${query}`);
}
