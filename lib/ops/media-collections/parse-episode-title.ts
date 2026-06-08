/** Parse Midnight Special–style titles: "Ep 39 - The Midnight Special Episode | October 26, 1973" */

export function parseEpisodeTitle(title: string): {
  episode_number?: string;
  air_date?: string;
} {
  const epMatch = title.match(/\bEp(?:isode)?\s*(\d+)\b/i);
  const episode_number = epMatch?.[1];

  const dateMatch = title.match(
    /\|\s*([A-Za-z]+\s+\d{1,2},?\s+\d{4})\s*$/,
  );
  const air_date = dateMatch?.[1]?.trim();

  return { episode_number, air_date };
}
