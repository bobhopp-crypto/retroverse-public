import type { RetroverseProduct, RetroverseProductSlug } from "./types";

export const RETROVERSE_PRODUCTS: readonly RetroverseProduct[] = [
  {
    slug: "browser",
    name: "Browser",
    mission: "Manage the music library.",
    homeHref: "/ops/browser-plus-2",
    themeClass: "rs-product--browser",
    accentColor: "#c41e3a",
    available: true,
  },
  {
    slug: "studio",
    name: "Studio",
    mission: "Produce patron experiences.",
    homeHref: "/ops/studio",
    themeClass: "rs-product--studio",
    accentColor: "#e7bd67",
    available: true,
  },
  {
    slug: "knowledge",
    name: "Knowledge",
    mission: "Remember everything.",
    homeHref: "/ops/knowledge",
    themeClass: "rs-product--knowledge",
    accentColor: "#d4a853",
    available: false,
  },
] as const;

const BY_SLUG = new Map<RetroverseProductSlug, RetroverseProduct>(
  RETROVERSE_PRODUCTS.map((product) => [product.slug, product]),
);

export function getRetroverseProduct(slug: RetroverseProductSlug): RetroverseProduct {
  const product = BY_SLUG.get(slug);
  if (!product) {
    throw new Error(`Unknown Retroverse product: ${slug}`);
  }
  return product;
}

/** Best-effort product resolution from an ops pathname (for future shell wiring). */
export function resolveProductFromPath(pathname: string): RetroverseProductSlug | null {
  const path = pathname.split("?")[0]?.split("#")[0] ?? pathname;

  if (path === "/ops/browser-plus" || path === "/ops/browser-plus-2" || path.startsWith("/ops/browser-plus")) {
    return "browser";
  }

  if (
    path === "/ops/studio" ||
    path.startsWith("/ops/studio/") ||
    path === "/ops/intelligence" ||
    path.startsWith("/ops/intelligence/")
  ) {
    return "studio";
  }

  if (path === "/ops/knowledge" || path.startsWith("/ops/knowledge/")) {
    return "knowledge";
  }

  return null;
}
