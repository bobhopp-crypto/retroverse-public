import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

import { sanitizePublicNavigationHref } from "@/lib/search/entity-routes";
import { searchDiscoveryHref } from "@/lib/search/resolve-search-destination";
import { warnSearchRouteIssue } from "@/lib/search/log-search-route";

/** Client navigation — push first so homepage overlay close cannot win the race. */
export function navigateToEntityRoute(
  router: AppRouterInstance,
  href: string,
  onAfterNavigate?: () => void,
): boolean {
  const target = sanitizePublicNavigationHref(href);
  if (!target) {
    warnSearchRouteIssue("blocked-nav", { href });
    return false;
  }

  void router.push(target);
  onAfterNavigate?.();

  return true;
}

/** Explicit discovery navigation — `/search?q=` only (View All Results). */
export function navigateToDiscoverySearch(
  router: AppRouterInstance,
  query: string,
  onAfterNavigate?: () => void,
): boolean {
  const { href } = searchDiscoveryHref(query);
  void router.push(href);
  onAfterNavigate?.();
  return true;
}
