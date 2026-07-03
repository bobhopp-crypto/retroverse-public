import type { CuratedRecommendation } from "../../types";

import { curated } from "./_helpers";

const c = (slug: string, title: string, desc: string, src: string, pri: CuratedRecommendation["priority"]) =>
  curated("promos", slug, title, desc, src, pri);

export const PROMOS_1967: CuratedRecommendation[] = [
  c("monterey-pop-promo", "Monterey Pop — '3 Days of Peace & Music'", "June 16–18 festival promo package.", "festival_promo", 1),
  c("summer-of-love-promo", "Summer of Love — SF Tourism Narrative", "Chamber of commerce vs hippie reality tension.", "seasonal_promo", 1),
  c("sgt-pepper-release", "Sgt. Pepper — Release Week Promo", "June 1967 album launch stunts.", "album_promo", 1),
  c("magical-mystery-tour", "Magical Mystery Tour — Holiday Film Promo", "Dec BBC/US roll-out teasers.", "album_promo", 2),
  c("graduate-release", "The Graduate — 'Mrs. Robinson' Radio Promo", "Dec film + soundtrack synergy.", "film_promo", 1),
  c("monterey-film-1968", "Monterey Pop Film — Coming 1968", "Bridge promo for Pennebaker release.", "film_promo", 2),
  c("woodstock-planning", "Woodstock (planning — too early)", "Note: festival is 1969 — avoid wrong-year promo.", "planning_note", 5),
  c("altamont-planning", "Altamont (planning — too early)", "1969 — timeline guardrail.", "planning_note", 5),
  c("be-in-radio", "Human Be-In — KPFA/Pacifica Archive", "Jan SF promo spots.", "radio_promo", 3),
  c("fillmore-bill", "Fillmore Auditorium — Bill Graham Posters", "Weekly concert poster scans as promos.", "venue_promo", 1),
  c("avalon-ballroom", "Avalon Ballroom — Family Dog", "SF scene counterpart.", "venue_promo", 2),
  c("whisky-go-go", "Whisky a Go Go — Sunset Strip", "LA club promo lineage.", "venue_promo", 2),
  c("cheetah-club", "Cheetah Club — Multi-City", "NY/LA club brand.", "venue_promo", 4),
  c("electric-circus", "Electric Circus — NYC Psychedelic Club", "April opening East Coast.", "venue_promo", 3),
  c("fantasy-faire", "Northern California Renaissance Faire", "Cross-genre hippie-friendly promo.", "event_promo", 4),
  c("expo-67-montreal", "Expo 67 — Montreal World's Fair", "International optimism counterpoint.", "world_fair", 2),
  c("detroit-love-in", "Detroit Love-In (July)", "Regional festival promo.", "festival_promo", 4),
  c("miami-pop", "Miami Pop Festival (planning)", "May 1968 — mark as future.", "planning_note", 5),
  c("schaefer-beer", "Schaefer Music Festival — Central Park", "Summer series sponsorship promo.", "sponsored_series", 3),
  c("oldsmobile-sponsor", "Oldsmobile — Concert Sponsorship Tags", "Auto tie-in era practice.", "sponsor_promo", 4),
  c("coca-cola-sponsor", "Coca-Cola — Youth Sponsorship Tags", "Soft drink youth marketing.", "sponsor_promo", 4),
  c("army-recruitment", "US Army Recruitment — Vietnam Era", "Contrast/commentary context only.", "institutional", 3),
  c("peace-march", "Anti-War March — October Mobilization", "Protest promo flyers as ephemera.", "activism_promo", 2),
  c("black-power", "Black Power Conference Promo", "Newark/Philadelphia regional materials.", "activism_promo", 3),
  c("stonewall-planning", "Stonewall (planning — 1969)", "Timeline accuracy guardrail.", "planning_note", 5),
  c("radio-wls", "WLS Chicago Top 40 Promo", "Boss Radio competitiveness.", "radio_promo", 3),
  c("radio-wabc", "WABC New York — MusicRadio 77", "East coast top 40 wars.", "radio_promo", 3),
  c("radio-khj", "KHJ Boss Radio LA", "Robert W. Morgan era.", "radio_promo", 3),
  c("album-of-month", "Record Store — Album of the Month", "Retail cooperative display.", "retail_promo", 4),
  c("tower-records", "Tower Records — Sacramento Flagship", "Independent retail culture.", "retail_promo", 4),
  c("head-shop", "Head Shop Poster Bundle", "Rolling papers + poster cross-promo.", "retail_promo", 4),
  c("underground-paper", "Berkeley Barb / East Village Other", "Counterculture press ad pages.", "press_promo", 3),
  c("rolling-stone-launch", "Rolling Stone — Debut Issue (Nov)", "Nov 9 1967 launch promo.", "press_promo", 1),
  c("hit-parader", "Hit Parader — Teen Magazine", "Mainstream rock coverage.", "press_promo", 4),
  c("teen-set", "Teen Set Magazine", "Pin-up era crossover.", "press_promo", 5),
  c("tv-guide", "TV Guide — Fall Preview Issue", "Sept seasonal programming push.", "tv_promo", 3),
  c("record-club-columbia", "Columbia Record Club", "Mail-order vinyl promo.", "retail_promo", 4),
  c("beatles-fan-club", "Beatles Fan Club Christmas Record", "Dec mailing promo.", "fan_club", 3),
];
