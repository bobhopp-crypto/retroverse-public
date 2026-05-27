import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

import { sanitizePublicNavigationHref } from "@/lib/search/entity-routes";
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
