/** Casey Kasem–style opening monologue (1971 · 1982 · 2000). */
export const SUNDAY_NIGHTS_MONOLOGUE = [
  "In 1971 — album rock and early fragmentation — the album finally became the statement, not just a collection of singles but a whole world you lived inside for forty-five minutes. FM listeners traded gatefold sleeves and liner notes the way earlier generations traded baseball cards. The Beatles had stepped back, and the landscape they left behind splintered beautifully: rock bands stretched out, then broke apart, chasing sounds that didn't always fit on the same stage. Carole King made a kitchen table sound like a cathedral. Marvin Gaye turned the news into melody. The Rolling Stones kept the road alive. Rod Stewart sang like every heartbreak was his first.",
  "Eleven years later, 1982 — MTV, New Wave, arena pop — arrived with a television screen glowing in every living room, and a cable channel that asked a simple question: what if songs had faces? Visual style became currency overnight. Synthesizers marched out of underground clubs into the Top 40. Michael Jackson moved like the whole medium had been invented for him. Duran Duran and The Human League made the future sound danceable. Journey filled arenas with anthems built for windows-down singalongs.",
  "By 2000 — Y2K pop, alternative, hip-hop expansion — the calendar had flipped without catastrophe, and music answered with everything at once. Teen pop glittered beside raw confessional rap. Eminem turned honesty into spectacle. Destiny's Child ruled with precision harmonies. Matchbox Twenty gave radio rock an emotional center. Santana returned with guests from every corner of the map, proving that a great song could still stop the room cold.",
  "Three years. Three worlds. And always — the music, holding it all together.",
] as const;

export const SUNDAY_NIGHTS_FEATURED_YEARS = [
  {
    year: 1971,
    artists: ["The Rolling Stones", "Carole King", "Marvin Gaye", "Rod Stewart"],
  },
  {
    year: 1982,
    artists: ["Michael Jackson", "Duran Duran", "The Human League", "Journey"],
  },
  {
    year: 2000,
    artists: ["Eminem", "Destiny's Child", "Matchbox Twenty", "Santana"],
  },
] as const;

export const SUNDAY_NIGHTS_ABOUT =
  "Retroverse connects songs, artists, chart history, and recordings into one canonical music graph. Every track has a stable identity, linked albums, and a documented path through the charts — so discovery feels curated, not random.";
