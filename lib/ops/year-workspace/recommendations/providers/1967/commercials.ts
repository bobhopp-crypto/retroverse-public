import type { CuratedRecommendation } from "../../types";

import { curated } from "./_helpers";

const c = (slug: string, title: string, desc: string, src: string, pri: CuratedRecommendation["priority"]) =>
  curated("commercials", slug, title, desc, src, pri);

export const COMMERCIALS_1967: CuratedRecommendation[] = [
  c("chevy-camaro", "Chevrolet Camaro — 'The Hugger'", "Sept 1967 model-year push; youth-market muscle positioning.", "automotive", 1),
  c("ford-mustang", "Ford Mustang Refresh Spots", "Continued pony-car wars — compare with Camaro blocks.", "automotive", 2),
  c("coca-cola", "Coca-Cola 'It's the Real Thing' (transition era)", "Brand modernization toward 1971 hilltop — capture late-60s tone.", "beverage", 1),
  c("pepsi-generation", "Pepsi — Youth Generation Campaign", "Direct Coke competitor; mod youth imagery.", "beverage", 2),
  c("winston-tastes", "Winston 'Tastes Good Like a Cigarette Should'", "Iconic jingle year — broadcast culture artifact.", "tobacco", 3),
  c("marlboro-man", "Marlboro Country Continuation", "Cowboy mythos on network TV — period ad anthropology.", "tobacco", 3),
  c("virginia-slims", "Virginia Slims — You've Come a Long Way", "Early feminist-tinged tobacco pitch (test markets).", "tobacco", 4),
  c("budweiser", "Budweiser King of Beers Spots", "Mass-market beer baseline for sports/event breaks.", "alcohol", 3),
  c("miller-high-life", "Miller High Life — Champagne of Bottle Beer", "Working-class premium positioning.", "alcohol", 4),
  c("lysol", "Lysol Household Authority Ads", "Postwar domestic science tone — contrast with counterculture.", "household", 5),
  c("charmin", "Charmin Bath Tissue — Mr. Whipple", "Famous annoying pitchman — memorability high.", "household", 4),
  c("pampers", "Pampers Disposable Diaper Expansion", "Baby-boom consumer product growth story.", "household", 4),
  c("tide", "Tide Detergent Color-Safe Push", "Technicolor wardrobe care — mod fashion tie-in.", "household", 4),
  c("at-t-long-distance", "AT&T Long Distance — Reach Out", "Emotional connection advertising before breakup.", "telecom", 3),
  c("bell-system", "Bell System 'Ma Bell' Institutional", "Monopoly-era trust messaging.", "telecom", 4),
  c("xerox", "Xerox Copier Demonstration Spots", "Office-tech wonder demos — future-of-work vibe.", "technology", 4),
  c("ibm", "IBM Mainframe Corporate", "Boomer business computing prestige.", "technology", 4),
  c("rca-color", "RCA Color TV — The Ring of Color", "Push color sets for fall season.", "electronics", 2),
  c("sony-trinitron", "Sony Trinitron (early US intro)", "Japanese quality narrative begins.", "electronics", 4),
  c("zenith", "Zenith Space Command Remote", "Clicker culture origin — gadget novelty.", "electronics", 4),
  c("polaroid", "Polaroid Swinger Camera", "Youth-priced instant photo — party accessory.", "electronics", 3),
  c("kodak-instamatic", "Kodak Instamatic", "Mass amateur photography — memory-making.", "electronics", 3),
  c("volkswagen-beetle", "Volkswagen Beetle — Think Small ethos", "Anti-excess counter-message still running.", "automotive", 2),
  c("plymouth-barracuda", "Plymouth Barracuda Fastback", "Mopar alternative in muscle wars.", "automotive", 3),
  c("dodge-charger", "Dodge Charger Launch Support", "Muscle TV presence grows.", "automotive", 3),
  c("american-airlines", "American Airlines Luxury Jets", "Jet-set travel glamour.", "travel", 3),
  c("pan-am", "Pan Am World Airways", "Global chic — stewardess iconography.", "travel", 3),
  c("hertz", "Hertz Rent-A-Car — OJ era predecessor spots", "Celebrity driver campaigns evolve.", "travel", 4),
  c("mcdonalds", "McDonald's — You Deserve a Break Today (proto)", "Fast food scaling before national uniformity.", "food", 2),
  c("burger-king", "Burger King Have It Your Way (early test)", "Customization message emerges.", "food", 4),
  c("kentucky-fried", "Kentucky Fried Chicken — Colonel Sanders", "Personality-driven food branding.", "food", 3),
  c("campbells-soup", "Campbell's Soup — Warhol echo", "Pop-art crossover cultural reference.", "food", 3),
  c("gerber-baby", "Gerber Baby Food Trust Campaign", "Baby-boom nurture marketing.", "food", 4),
  c("listerine", "Listerine Social Anxiety Ads", "Heavy-handed problem/solution copy.", "personal_care", 4),
  c("gillette", "Gillette Techmatic Razor", "Upgrade-your-blade hardware pitch.", "personal_care", 4),
  c("avon", "Avon Calling — Door-to-Door", "Women's sales army cultural touchstone.", "personal_care", 4),
  c("gap-planning", "The Gap (pre-chain — planning only)", "Not yet founded — use as contrast note in briefing.", "planning_note", 5),
  c("love-cosmetics", "Love Cosmetics (Revlon spinoff test)", "Youth cosmetics experiment — mod packaging.", "personal_care", 5),
  c("essence-smoke", "Essence of a Cigarette Montage (genre clip)", "Composite period tobacco style reel.", "tobacco", 5),
];
