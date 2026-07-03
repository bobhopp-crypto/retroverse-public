import Link from "next/link";

import { yearSuggestionHref } from "@/lib/search/entity-routes";
import { RV_YEAR_KICKER } from "@/lib/rv-year/rv-year-brand";

type Props = {
  searchQuery?: string;
};

export function RvPublicMasthead({ searchQuery }: Props) {
  const trimmed = searchQuery?.trim() ?? "";
  const searchHref =
    trimmed && /^\d{4}$/.test(trimmed)
      ? yearSuggestionHref(trimmed)
      : trimmed
        ? `/search?q=${encodeURIComponent(trimmed)}`
        : "/search";

  return (
    <header className="rv-public-masthead">
      <p className="rv-public-masthead__kicker">{RV_YEAR_KICKER}</p>
      <div className="rv-public-masthead__row">
        <Link href="/" className="rv-year-logo" prefetch>
          Retroverse
        </Link>
        <Link href={searchHref} className="rv-public-masthead__search" prefetch>
          Search music
        </Link>
      </div>
    </header>
  );
}
