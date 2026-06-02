import type { CuratedRecommendation } from "../../types";

import { curated } from "./_helpers";

const c = (slug: string, title: string, desc: string, src: string, pri: CuratedRecommendation["priority"]) =>
  curated("bumpers", slug, title, desc, src, pri);

export const BUMPERS_1967: CuratedRecommendation[] = [
  c("summer-of-love", "Summer of Love — Opening Sting", "Haight-Ashbury narrative title card with flower motif.", "era_theme", 1),
  c("psychedelic-transition", "Psychedelic Liquid Transition", "Oil-projection style 10–15s between sets.", "transition", 1),
  c("sf-poster-art", "San Francisco Poster Art Montage", "Mouse/Kelley/Griffin aesthetic IDs.", "era_theme", 2),
  c("monterey-intro", "Monterey Pop — Festival Intro Bumper", "June '67 anchor for British-American rock block.", "festival_theme", 1),
  c("british-invasion", "British Invasion — Union Jack Sting", "Mod targets + rain animation.", "genre_theme", 2),
  c("motown-soul", "Motown — Hitsville Sting", "Detroit soul block opener.", "genre_theme", 2),
  c("surf-to-psych", "Surf Fade → Psychedelic Morph", "California lineage story transition.", "transition", 3),
  c("vietnam-news-break", "News Break — Vietnam Era Slate", "Sober palette shift before news clips.", "tone_shift", 2),
  c("laugh-in-countdown", "Laugh-In Countdown (proto)", "Rapid-fire joke rhythm ID before comedy clips.", "variety_theme", 4),
  c("star-trek-whoosh", "Sci-Fi Whoosh — Star Trek Inspired", "Short synth/text slide without copyrighted logos.", "genre_theme", 4),
  c("bond-spy", "Spy Jazz Sting — Bond Era", "Brass conga 8-count for spy montage.", "genre_theme", 3),
  c("western-gunsmoke", "Western Whistle Sting", "Three-note prairie opener.", "genre_theme", 4),
  c("girl-group", "Girl Group — Sparkle Intro", "Shangri-Las drama silhouette.", "genre_theme", 3),
  c("garage-punk", "Garage Fuzz Sting", "Lo-fi countdown for Nuggets segment.", "genre_theme", 3),
  c("folk-protest", "Protest Folk — Acoustic Strum ID", "Serious acoustic opener for Dylan block.", "genre_theme", 2),
  c("bubblegum", "Bubblegum Pop — Cartoon Bounce", "Light tone for teenybopper relief.", "genre_theme", 4),
  c("late-night", "Late Night — After Hours", "Blue neon cityscape 12s.", "daypart", 2),
  c("afternoon-teen", "Afternoon Teen — Sock Hop", "School's out energy 8s.", "daypart", 3),
  c("prime-time", "Prime Time — Network Gloss", "Slight mock NBC peacock energy (generic).", "daypart", 4),
  c("record-flip", "Vinyl Flip Transition", "Needle drop + label close-up animation.", "transition", 2),
  c("radio-tuner", "Radio Tuner Dial Sweep", "AM static into clear station.", "transition", 3),
  c("tv-test-pattern", "Color Bars / Test Pattern", "Broadcast authenticity interstitial.", "broadcast_artifact", 4),
  c("be-in-golden-gate", "Human Be-In — Golden Gate Park", "Jan 14 Haight gathering title.", "era_theme", 2),
  c("love-pageant", "Gathering of the Tribes — Love Pageant Rally", "Jan 1967 prelude event.", "era_theme", 3),
  c("hendrix-burn", "Guitar Sacrifice — Hendrix Homage (generic)", "Silhouette flame motif — no specific footage.", "genre_theme", 3),
  c("stoned-sloth", "Slow-Motion Haze", "Soft-focus drift for ballads.", "transition", 3),
  c("hard-cut-mod", "Mod Hard Cut — Go-Go Pattern", "Strobe geometry 4-count.", "transition", 4),
  c("tambourine-shake", "Tambourine Shake Sting", "Percussion fill into Motown.", "transition", 4),
  c("organ-swirl", "Farfisa Organ Swirl", "Garage/psych organ cliche in good way.", "transition", 4),
  c("crowd-roar", "Crowd Roar Applause", "Concert audience swell.", "transition", 3),
  c("applause-out", "Applause Out — Thank You Slate", "End-of-set crowd thank you.", "outro", 2),
  c("intermission", "Intermission — 10 Minute Countdown", "Restroom/beer break slate.", "outro", 2),
  c("coming-up", "Coming Up Next — Lower Third", "Template for next artist card.", "promo_tool", 2),
  c("station-id-generic", "Station ID — 'Your City 1967'", "Localizable call letters placeholder.", "station_branding", 3),
  c("sponsor-thanks", "We Thank Our Sponsors", "Generic sponsor gratitude slate.", "station_branding", 4),
  c("parental-advisory-planning", "Content Advisory (planning)", "Mild language advisory for Smothers-era clips.", "compliance", 4),
  c("copyright-safe", "Public Domain Music Bed", "Royalty-free 60s-style groove under bumpers.", "production_asset", 5),
];
