export type MagazineEditorialSource = {
  quote?: string | null;
  definingMoment?: string | null;
  trivia?: string | null;
  story?: string | null;
  description?: string | null;
};

function clean(value: string | null | undefined): string | null {
  const text = value
    ?.replace(/<[^>]*>/g, " ")
    .replace(/[\u0000-\u001f]/g, " ")
    .replace(/^\s*["“”]+|["“”]+\s*$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!text || /RVTR\d{6}/i.test(text)) return null;
  const words = text.split(" ");
  return words.length > 16 ? `${words.slice(0, 16).join(" ")}…` : text.slice(0, 90).trimEnd();
}

export function chooseMagazineEditorial(source: MagazineEditorialSource): string | null {
  return [source.quote, source.definingMoment, source.trivia, source.story, source.description]
    .map(clean)
    .find((value): value is string => Boolean(value)) ?? null;
}

export function shouldUseMagazineTemplate(resolvedYear: number | null | undefined): boolean {
  return typeof resolvedYear === "number" && resolvedYear <= 1969;
}
