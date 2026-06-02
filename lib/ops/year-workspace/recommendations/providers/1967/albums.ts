import type { CuratedRecommendation } from "../../types";

import { curated } from "./_helpers";

const c = (slug: string, title: string, desc: string, src: string, pri: CuratedRecommendation["priority"]) =>
  curated("albums", slug, title, desc, src, pri);

/** Iconic albums and soundtracks for a 1967-centric library build. */
export const ALBUMS_1967: CuratedRecommendation[] = [
  c("sgt-pepper", "Sgt. Pepper's Lonely Hearts Club Band", "The Beatles — June 1967 release; defining psychedelic pop milestone for any Summer of Love set.", "culture_milestone", 1),
  c("are-you-experienced", "Are You Experienced", "Jimi Hendrix Experience debut — breakthrough guitar voice of the year.", "debut_classic", 1),
  c("velvet-underground-banana", "The Velvet Underground & Nico", "Andy Warhol-associated LP; art-rock edge for late-night programming.", "underground_classic", 2),
  c("doors-debut", "The Doors", "LA psychedelic blues-rock debut; strong for dark-room energy.", "debut_classic", 2),
  c("jefferson-airplane-surrealistic", "Surrealistic Pillow", "Jefferson Airplane — Bay Area psychedelia staple; \"White Rabbit\" era.", "psychedelic_rock", 1),
  c("monterey-soundtrack", "Monterey International Pop Festival (Documentary/Soundtrack)", "June 1967 festival capture — anchor media for event storytelling.", "festival_capture", 1),
  c("graduate-soundtrack", "The Graduate (Soundtrack)", "Simon & Garfunkel-dominated film score; massive cultural footprint Dec 1967.", "soundtrack", 1),
  c("cream-disraeli", "Disraeli Gears", "Cream — British blues-rock peak; \"Sunshine of Your Love\" year.", "british_invasion", 2),
  c("pink-floyd-piper", "The Piper at the Gates of Dawn", "Pink Floyd debut — Syd Barrett psychedelic era.", "debut_classic", 3),
  c("rolling-stones-between", "Between the Buttons (US)", "Stones in transition; fits British Invasion retrospectives.", "british_invasion", 3),
  c("beach-boys-wild-honey", "Wild Honey", "Beach Boys pivot toward soulful R&B textures.", "pop_rock", 3),
  c("byrds-younger", "Younger Than Yesterday", "Folk-rock evolution with jazz and psychedelic touches.", "folk_rock", 3),
  c("buffalo-springfield-again", "Buffalo Springfield Again", "LA scene supergroup document; protest and country-rock seeds.", "folk_rock", 2),
  c("moby-grape-debut", "Moby Grape", "San Francisco scene burst — multi-guitar attack.", "psychedelic_rock", 3),
  c("grateful-dead-debut", "The Grateful Dead", "Debut LP — acid-test era foundation for SF narrative.", "psychedelic_rock", 2),
  c("jimi-axis-bold", "Axis: Bold as Love", "Hendrix second LP — Dec 1967 UK release; expand Hendrix block.", "guitar_hero", 2),
  c("who-sell-out", "The Who Sell Out", "Concept pop-art album with fake commercials — meta fit for shows.", "british_invasion", 2),
  c("kinks-something", "Something Else by The Kinks", "Ray Davies storytelling peak; British mod culture.", "british_invasion", 3),
  c("love-forever-changes", "Forever Changes", "Love — orchestral LA psychedelia; cult-critical favorite.", "psychedelic_rock", 2),
  c("captain-beefheart-safe", "Safe as Milk", "Captain Beefheart debut — blues avant-garde wildcard.", "experimental", 4),
  c("bob-dylan-john-wesley", "John Wesley Harding", "Dylan's late-1967 return — stripped country-rock tone shift.", "folk_rock", 2),
  c("leonard-cohen-debut", "Songs of Leonard Cohen", "Poetic debut — intimate candlelight programming.", "singer_songwriter", 4),
  c("sam-and-dave", "Soul Men (Sam & Dave)", "Stax soul power — dancefloor contrast to psychedelia.", "soul", 2),
  c("otis-redding-dock", "Dock of the Bay (posthumous planning)", "Otis Redding final sessions narrative — emotional 1968 bridge.", "soul", 3),
  c("james-brown-cold-sweat", "Cold Sweat / James Brown Singles", "Funk birth year singles — high-energy break.", "soul", 2),
  c("tammi-marvin-greatest", "Marvin Gaye & Tammi Terrell duets", "Motown romance hits — crossover appeal.", "motown", 3),
  c("supremes-reflections", "Reflections (The Supremes)", "Holland-Dozier-Holland psychedelic soul shift.", "motown", 3),
  c("stevie-wonder-i-was-made", "I Was Made to Love Her", "Stevie Wonder coming-of-age hit year.", "motown", 3),
  c("beatles-magical-mystery", "Magical Mystery Tour", "US LP Nov 1967 — TV film tie-in programming.", "culture_milestone", 2),
  c("hendrix-bbc", "BBC Sessions (planning placeholder)", "Archive planning for broadcast-era Hendrix clips.", "archive_planning", 4),
  c("nancy-sinatra-movin", "Movin' with Nancy", "TV special tie-in — Las Vegas pop glamour.", "tv_soundtrack", 4),
  c("casino-royale-soundtrack", "Casino Royale (1967 Soundtrack)", "Bond spoof soundtrack — camp retro fun.", "soundtrack", 4),
  c("hair-original-cast", "Hair (Original Cast — early workshops)", "Musical seeds before 1968 Broadway — period curiosity.", "musical_theatre", 5),
  c("west-coast-blues-anthology", "West Coast Blues Anthology (planning)", "Fillmore-era blues opening sets context.", "compilation_planning", 4),
  c("nuggets-planning", "Nuggets-era garage planning list", "Pre-compilation survey of US/UK garage 45s for deep cuts.", "compilation_planning", 4),
  c("beatles-strawberry-ep", "Strawberry Fields / Penny Lane EP narrative", "Feb single pair — psychedelic breakthrough prologue.", "single_pair", 2),
  c("procol-harun-debut", "Procol Harum", "\"Whiter Shade of Pale\" album — baroque pop one-hit anchor.", "debut_classic", 3),
  c("traffic-dear-mr-fantasy", "Mr. Fantasy (Traffic)", "Steve Winwood Brit-soul rock debut.", "british_invasion", 3),
  c("small-faces-ogdens", "Ogdens' Nut Gone Flake", "UK concept mini-opera — late-year British quirk.", "british_invasion", 4),
  c("bee-gees-debut", "Bee Gees 1st", "Baroque pop before disco — Australian-British harmony.", "debut_classic", 5),
];
