import type { CuratedRecommendation } from "../../types";

import { curated } from "./_helpers";

const c = (slug: string, title: string, desc: string, src: string, pri: CuratedRecommendation["priority"]) =>
  curated("tv_clips", slug, title, desc, src, pri);

export const TV_CLIPS_1967: CuratedRecommendation[] = [
  c("ed-sullivan-beatles", "The Ed Sullivan Show — Beatles Anthology Clips", "Prior era replays still define broadcast rock canon.", "variety_show", 2),
  c("ed-sullivan-stones", "The Ed Sullivan Show — Rolling Stones", "Censorship/notoriety moments for British Invasion block.", "variety_show", 2),
  c("smothers-brothers-premiere", "The Smothers Brothers Comedy Hour (debut)", "Feb 1967 — counterculture-friendly network TV.", "variety_show", 1),
  c("smothers-who", "Smothers Brothers — The Who Smashing", "Sept 1967 explosive performance myth.", "variety_show", 1),
  c("johnny-carson-tonight", "The Tonight Show — Johnny Carson Era", "Default late-night cultural referee.", "late_night", 2),
  c("carson-hendrix", "Tonight Show Planning — Hendrix (if surfaced)", "Archive hunt for national TV breakthrough appearances.", "late_night", 3),
  c("american-bandstand", "American Bandstand — Philly to LA move", "Youth dance show transitions west.", "music_show", 1),
  c("sullivan-supremes", "Ed Sullivan — Motown Acts Medley", "Crossover R&B on prime time.", "variety_show", 2),
  c("hollywood-palace", "The Hollywood Palace", "Variety hour with rotating hosts — eclectic clips.", "variety_show", 3),
  c("dean-martin-show", "The Dean Martin Show", "Celebrity roasts and relaxed Vegas vibe.", "variety_show", 3),
  c("carol-burnett", "The Carol Burnett Show (debut year)", "Sketch comedy institution begins.", "variety_show", 3),
  c("mission-impossible", "Mission: Impossible — Title Sequence", "Jan debut — spy mod aesthetic.", "drama_title", 2),
  c("star-trek-mirror", "Star Trek — Mirror Universe Seeds", "Season 1 cult-building moments.", "sci_fi", 2),
  c("twilight-zone-rerun", "The Twilight Zone (syndication packages)", "Moral sci-fi shorts — atmospheric breaks.", "syndication", 3),
  c("gunsmoke", "Gunsmoke — Prime-Time Western Anchor", "Still top ratings — generational bridge.", "western", 4),
  c("bonanza", "Bonanza — Color Western Dominance", "NBC flagship family western.", "western", 4),
  c("bewitched", "Bewitched — Sitcom Escapism", "Magic domestic comedy — light filler.", "sitcom", 4),
  c("andy-griffith", "The Andy Griffith Show", "Small-town America comfort programming.", "sitcom", 4),
  c("laugh-in-planning", "Rowan & Martin's Laugh-In (pre-launch)", "Jan 1968 launch — gather promos late '67.", "planning_note", 3),
  c("60-minutes-debut", "60 Minutes (debut Sept 1967)", "TV journalism format shift.", "news_magazine", 2),
  c("cbs-evening-news", "CBS Evening News — Vietnam Coverage", "Cronkite era gravity for news montages.", "news", 1),
  c("vietnam-special-report", "Vietnam Special Reports Composite", "Escalation year context — serious tone breaker.", "news", 1),
  c("detroit-riot-news", "Detroit 1967 Uprising News Footage", "Urban crisis coverage — handle with care.", "news", 2),
  c("six-day-war", "Six-Day War Newsreel", "June Middle East crisis international desk.", "news", 3),
  c("apollo-1-coverage", "Apollo 1 Tragedy Coverage (Jan)", "NASA setback — solemn archival.", "news", 2),
  c("monterey-broadcast", "Monterey Pop — D.A. Pennebaker Footage", "Festival film source for multi-song blocks.", "music_special", 1),
  c("our-world-beatles", "Our World — All You Need Is Love (June 25)", "Global satellite broadcast milestone.", "music_special", 1),
  c("magical-mystery-tv", "Magical Mystery Tour — BBC TV Film", "Dec psychedelic TV experiment.", "music_special", 2),
  c("elvis-comeback-planning", "Elvis '68 Comeback (planning clips)", "Gather late-67 promo before January taping.", "planning_note", 3),
  c("lawrence-welk", "The Lawrence Welk Show", "Older demographic champagne music — contrast reel.", "variety_show", 5),
  c("soul-train-planning", "Soul Train (pre-debut planning)", "Not until 1971 — note for timeline accuracy.", "planning_note", 5),
  c("walt-disney-wonderful", "The Wonderful World of Disney", "Family institutional Sunday night.", "anthology", 4),
  c("disney-jungle-book", "Jungle Book Release Tie-In", "Oct animated feature promotion.", "film_promo", 3),
  c("bond-you-only-live", "You Only Live Twice — Bond Film Clips", "June release — spy camp spectacle.", "film_promo", 2),
  c("cool-hand-luke", "Cool Hand Luke — 'What we've got here'", "Sept film — anti-authority quote culture.", "film_promo", 2),
  c("graduate-trailer", "The Graduate — Trailer & Talk Show", "Dec release builds into 1968.", "film_promo", 2),
  c("dylan-mtv-planning", "Dont Look Back (doc planning)", "Dylan tour doc circulation for Brit invasion night.", "documentary", 3),
  c("weather-underground-planning", "Academic Panel — Summer of Love (local TV)", "Seek regional public-TV psychedelia explainers.", "public_tv", 4),
];
