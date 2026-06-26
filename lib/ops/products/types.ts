/** Stable product id for CSS `data-product`, analytics, and registry lookup. */
export type RetroverseProductSlug = "browser" | "studio" | "knowledge";

export type RetroverseProduct = {
  slug: RetroverseProductSlug;
  name: string;
  mission: string;
  homeHref: string;
  themeClass: `rs-product--${RetroverseProductSlug}`;
  /** Accent used for active switcher pill (hex). */
  accentColor: string;
  /** When false, switcher shows the product as unavailable (no navigation yet). */
  available: boolean;
};

/** `null` = Command Center hub mode — no product pill active. */
export type RetroverseProductContext = RetroverseProductSlug | null;
