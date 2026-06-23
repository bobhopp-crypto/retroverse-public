export const INSTITUTION_ACCOUNT_SLUGS = [
  "nebat-checking",
  "apple-card",
  "paypal",
  "mortgage",
  "401k",
  "savings",
] as const;

/** @deprecated use INSTITUTION_ACCOUNT_SLUGS */
export const HOME_ACCOUNT_SLUGS = INSTITUTION_ACCOUNT_SLUGS;

export type InstitutionAccountSlug = (typeof INSTITUTION_ACCOUNT_SLUGS)[number];

export const NET_WORTH_REQUIRED_SLUGS: InstitutionAccountSlug[] = [
  "nebat-checking",
  "apple-card",
  "mortgage",
  "401k",
  "savings",
  "paypal",
];

export function isInstitutionAccountSlug(slug: string): slug is InstitutionAccountSlug {
  return (INSTITUTION_ACCOUNT_SLUGS as readonly string[]).includes(slug);
}

export function institutionAccountHref(slug: InstitutionAccountSlug): string {
  return `/ops/finance/accounts/${slug}`;
}
