"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** Live query synced to ?q= without full page reload. */
export function useSearchQuery() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q") ?? "";

  const [query, setQueryState] = useState(urlQuery);

  useEffect(() => {
    setQueryState(urlQuery);
  }, [urlQuery]);

  const setQuery = useCallback(
    (value: string) => {
      setQueryState(value);
      const params = new URLSearchParams(searchParams.toString());
      if (value.length > 0) params.set("q", value);
      else params.delete("q");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  /** Enter / explicit submit — trim and sync ?q= (idempotent with setQuery). */
  const commitQuery = useCallback(
    (value?: string) => {
      const next = (value ?? query).trim();
      setQuery(next);
    },
    [query, setQuery],
  );

  return { query, setQuery, commitQuery, trimmedQuery: query.trim() };
}
