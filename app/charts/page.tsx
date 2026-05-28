import { redirect } from "next/navigation";

import { chartsQueryToRvPath } from "@/lib/rv/rv-chronology-paths";

export const metadata = {
  title: "RV Charts — RetroVerse",
  description: "Chart history redirects to canonical RV chronology.",
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

/** Legacy chart explorer — redirect into canonical `/rv` chronology routes. */
export default async function ChartsPage({ searchParams }: Props) {
  const sp = await searchParams;
  redirect(
    chartsQueryToRvPath({
      year: firstParam(sp.year),
      month: firstParam(sp.month),
      week: firstParam(sp.week),
    }),
  );
}
