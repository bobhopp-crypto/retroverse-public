/** Public discovery navigation — homepage v1 */

export type PublicNavLink = {
  id: "home" | "search" | "bobos";
  label: string;
  href: string;
  matchPrefixes: string[];
};

export const PUBLIC_NAV_LINKS: PublicNavLink[] = [
  {
    id: "home",
    label: "Home",
    href: "/",
    matchPrefixes: ["/"],
  },
  {
    id: "search",
    label: "Search",
    href: "/search",
    matchPrefixes: ["/search"],
  },
  {
    id: "bobos",
    label: "BobOS",
    href: "/bobos",
    matchPrefixes: ["/bobos"],
  },
];

export function detectPublicNavLink(pathname: string): PublicNavLink["id"] | null {
  const path = pathname.split("?")[0] ?? "/";

  if (path === "/bobos" || path.startsWith("/bobos/")) return "bobos";
  if (path === "/search" || path.startsWith("/search")) return "search";
  if (path === "/") return "home";

  return null;
}
