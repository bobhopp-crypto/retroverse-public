import type { CuratedRecommendation } from "../../types";

import { curated } from "./_helpers";

const c = (slug: string, title: string, desc: string, src: string, pri: CuratedRecommendation["priority"]) =>
  curated("events", slug, title, desc, src, pri);

export const EVENTS_1967: CuratedRecommendation[] = [
  c("monterey-pop", "Monterey International Pop Festival", "June 16–18 — foundational rock festival.", "festival", 1),
  c("summer-of-love", "Summer of Love — Haight-Ashbury Season", "Cultural season narrative anchor.", "cultural_season", 1),
  c("sgt-pepper-release", "Sgt. Pepper Release Date (June 1 UK / Jun 2 US)", "Album-as-event programming.", "release_event", 1),
  c("human-be-in", "Human Be-In — Golden Gate Park (Jan 14)", "Prelude gathering.", "gathering", 2),
  c("love-pageant", "Gathering of the Tribes / Love Pageant Rally (Jan)", "Haight prelude.", "gathering", 3),
  c("our-world-broadcast", "Our World — Global Satellite Broadcast (Jun 25)", "Beatles close show.", "broadcast_event", 1),
  c("detroit-riot", "Detroit Uprising (Jul 23–27)", "Urban crisis — program with context.", "civil_unrest", 2),
  c("newark-riot", "Newark Rebellion (Jul 12–17)", "Parallel urban crisis.", "civil_unrest", 3),
  c("six-day-war", "Six-Day War (Jun 5–10)", "Global news shadow.", "world_event", 3),
  c("apollo-1", "Apollo 1 Cabin Fire (Jan 27)", "NASA tragedy.", "space_program", 2),
  c("apollo-4", "Apollo 4 Uncrewed Launch (Nov 9)", "Saturn V first flight.", "space_program", 3),
  c("che-guevara", "Execution of Che Guevara (Oct 9)", "Latin America radical politics.", "world_event", 4),
  c("six-day-protest", "March on Pentagon (Oct 21)", "Anti-war escalation.", "protest", 1),
  c("stop-draft-week", "Stop the Draft Week — Oakland (Oct)", "Bay Area militant protest.", "protest", 2),
  c("expo-67", "Expo 67 — Montreal", "Apr–Oct world's fair optimism.", "world_fair", 2),
  c("referendum-uk", "UK Referendum on European Communities (planning)", "European integration backdrop.", "world_event", 5),
  c("israel-occupation", "Israel Occupies Territories — Aftermath", "Long-tail Middle East impact.", "world_event", 4),
  c("china-cultural-revolution", "China Cultural Revolution Intensifies", "Global left discourse.", "world_event", 4),
  c("thurgood-planning", "Thurgood Marshall Supreme Court Confirmation (Aug)", "Civil rights institutional win.", "civil_rights", 3),
  c("loving-v-virginia", "Loving v. Virginia Decision (Jun 12)", "Interracial marriage legalized.", "civil_rights", 2),
  c("carl-wilson-draft", "Carl Wilson Draft Resistance", "Beach Boys draft subplot.", "celebrity_event", 4),
  c("muhammad-ali", "Muhammad Ali Draft Refusal Continues", "Sports/politics crossover.", "celebrity_event", 2),
  c("cold-war-planning", "Cold War Summit Season", "Détente gestures backdrop.", "world_event", 4),
  c("hippie-funeral", "Death of Hippie Funeral (Oct)", "Haight symbolic end — ironic programming.", "cultural_season", 3),
  c("rolling-stones-redlands", "Rolling Stones Redlands Bust (Feb)", "UK drug raid media cycle.", "celebrity_event", 4),
  c("jimi-monterey-burn", "Hendrix Monterey Guitar Burn", "June 18 iconic moment.", "festival_moment", 1),
  c("janis-monterey", "Joplin Monterey Breakthrough", "Same weekend — star-making.", "festival_moment", 2),
  c("who-monterey", "The Who Monterey Instrument Smash", "Destruction theatrics.", "festival_moment", 2),
  c("otis-monterey", "Otis Redding Monterey Crossover", "Soul to rock audience bridge.", "festival_moment", 2),
  c("dylan-uk-tour", "Bob Dylan UK Tour (Spring)", "Post-accident return to stage.", "tour", 3),
  c("beatles-mahogany", "Beatles Maharishi Rishikesh Trip (Feb–Apr)", "India retreat media cycle.", "celebrity_event", 3),
  c("velvet-exploding", "Velvet Underground Exploding Plastic Inevitable", "Multimedia live show template.", "live_art", 3),
  c("fillmore-openings", "Fillmore Weekly Residency Cycle", "Bill Graham concert economy.", "venue_series", 2),
  c("stoneman-gorge", "Stoneman Gorge Flood (Jan)", "California disaster news.", "regional_event", 5),
  c("fogarty-discharge", "Fort Bragg Sit-In Protests", "GI resistance examples.", "protest", 4),
  c("first-heart-transplant", "First Successful Heart Transplant (Dec 3)", "Medical milestone news.", "science_event", 4),
  c("third-level-planning", "Planning — New Year's Eve 1967/68", "Bridge event into next year workspace.", "planning_note", 3),
  c("local-venue-audit", "Local Venue Audit — Your Market 1967", "Customize: list 5 regional venues open this year.", "planning_note", 2),
];
