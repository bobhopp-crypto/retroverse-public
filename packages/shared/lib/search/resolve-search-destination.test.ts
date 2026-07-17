import assert from "node:assert/strict";
import test from "node:test";

import { resolveSearchDestination } from "./resolve-search-destination";
import {
  EMPTY_SUGGESTION_GROUPS,
  type SearchSuggestionItem,
} from "./search-suggestion-types";

function artist(id: number): SearchSuggestionItem {
  return {
    id: `artist-${id}`,
    kind: "artist",
    title: "Peaches",
    artist: null,
    year: null,
    label: "Peaches",
    href: `/artist/${id}`,
    routeQuery: String(id),
  };
}

test("an exact unique artist candidate resolves by canonical ID", () => {
  const result = resolveSearchDestination("Peaches", {
    ...EMPTY_SUGGESTION_GROUPS,
    artists: [artist(4128)],
  });
  assert.deepEqual(result, { kind: "artist", href: "/artist/4128" });
});

test("ambiguous display names remain on Search instead of choosing the first row", () => {
  const result = resolveSearchDestination("Peaches", {
    ...EMPTY_SUGGESTION_GROUPS,
    artists: [artist(4128), artist(9999)],
  });
  assert.deepEqual(result, { kind: "search", href: "/search?q=Peaches" });
});
