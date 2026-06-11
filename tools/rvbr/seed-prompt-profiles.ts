/**
 * Seed data/rvbr/prompt-profiles/{slug}.json for all RVBR eras.
 * Usage: npx tsx tools/rvbr/seed-prompt-profiles.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import type { RvbrPromptProfile } from "../../lib/creative/rvbr-prompt-profile";

const OUT = join(process.cwd(), "data/rvbr/prompt-profiles");

const PROFILES: RvbrPromptProfile[] = [
  {
    slug: "1958-1961",
    preferredMotifs: ["45 RPM ticket stubs", "American Bandstand admission", "doo-wop ballroom cards", "teen idol promo"],
    preferredComposition: ["dance hall ticket layout", "variety show guest pass", "modest perforated edges"],
    preferredTypography: ["clean teen pop lettering", "ballroom admission caps", "warm serif display"],
    preferredColorLanguage: ["cream stock", "warm brown ink", "tan and gold accents"],
    discouragedMotifs: ["psychedelic ornament", "neon broadcast graphics", "MTV laminate"],
    negativePromptTerms: ["neon grid", "MTV logo", "psychedelic sun", "grunge distress"],
  },
  {
    slug: "1962-1965",
    preferredMotifs: ["British Invasion promo cards", "Motown label sleeves", "surf ticket graphics", "girl-group handbills"],
    preferredComposition: ["label promo layout", "invasion tour handbill", "soul club admission"],
    preferredTypography: ["sharp mod display type", "Motown logo energy", "British beat lettering"],
    preferredColorLanguage: ["bold primary inks", "mod red and blue", "soul label gold"],
    discouragedMotifs: ["heavy psychedelic sunburst", "arena rock spectacle", "grunge xerox"],
    negativePromptTerms: ["giant sun face", "Woodstock crowd", "MTV neon", "grunge tear"],
  },
  {
    slug: "1966-1969",
    preferredMotifs: ["Fillmore poster frames", "hand-drawn border flourishes", "festival handbill typography", "psychedelic rock club flyers"],
    preferredComposition: ["poster handbill density", "ornate border vignette", "club admission art"],
    preferredTypography: ["hand-lettered display", "psychedelic arched titles", "poster billing hierarchy"],
    preferredColorLanguage: ["hot orange and gold", "crimson and purple", "aged cream stock"],
    discouragedMotifs: ["MTV broadcast blocks", "corporate laminate badge", "generic stock festival crowd"],
    negativePromptTerms: ["MTV logo", "neon grid", "corporate ID badge", "generic crowd photo"],
  },
  {
    slug: "1970-1973",
    preferredMotifs: ["concert posters", "record sleeves", "hand-drawn typography", "ticket ephemera", "music press graphics", "underground print culture"],
    preferredComposition: ["album-rock poster hierarchy", "record-store promo card", "arena handbill framing"],
    preferredTypography: ["hand-drawn headline type", "Rolling Stone coverline energy", "FM radio promo lettering"],
    preferredColorLanguage: ["muted album-rock inks", "warm paper stock", "glam accent metallics"],
    discouragedMotifs: ["giant sun faces", "generic festival crowds", "peace-sign clichés", "flower-power stereotypes"],
    negativePromptTerms: ["giant sun", "hippie crowd", "Woodstock cliché", "peace sign", "stock festival illustration"],
  },
  {
    slug: "1974-1977",
    preferredMotifs: ["disco club passes", "punk zine graphics", "soft rock tour programs", "Saturday Night Fever promo"],
    preferredComposition: ["disco admission card", "punk flyer collage", "adult contemporary program cover"],
    preferredTypography: ["disco mirror-ball lettering", "punk ransom-note type", "soft rock elegant caps"],
    preferredColorLanguage: ["disco silver and gold", "punk high-contrast ink", "warm bronze paper"],
    discouragedMotifs: ["psychedelic sunburst default", "MTV neon dominant", "generic hippie crowd"],
    negativePromptTerms: ["giant sun", "peace sign", "MTV neon grid", "Woodstock imagery"],
  },
  {
    slug: "1978-1981",
    preferredMotifs: ["new wave promo cards", "arena tour laminates", "MTV-era concert credentials", "synth-pop sleeve graphics"],
    preferredComposition: ["arena spectacle poster", "new wave angular layout", "tour laminate plate"],
    preferredTypography: ["new wave geometric type", "arena rock display caps", "video-era bold sans"],
    preferredColorLanguage: ["electric accent inks", "charcoal laminate", "chrome and magenta hints"],
    discouragedMotifs: ["1950s ballroom innocence", "psychedelic paisley dominant", "grunge distress"],
    negativePromptTerms: ["doo-wop card", "flower power sun", "xerox grunge", "teen idol ballroom"],
  },
  {
    slug: "1982-1985",
    preferredMotifs: ["MTV backstage passes", "VH1 credentials", "neon broadcast graphics", "video-era concert laminates"],
    preferredComposition: ["broadcast promo card", "music television laminate", "neon geometric frame"],
    preferredTypography: ["bold MTV-era sans caps", "scan-line display type", "video countdown lettering"],
    preferredColorLanguage: ["neon magenta and cyan", "charcoal stock", "gold accent bars"],
    discouragedMotifs: ["1950s teen idol", "psychedelic flower power", "grunge zine tear", "cartoon mascots"],
    negativePromptTerms: ["Hanna-Barbera", "flower power sun", "grunge xerox", "ballroom ticket"],
  },
  {
    slug: "1986-1989",
    preferredMotifs: ["hair metal tour passes", "college rock handbills", "arena spectacle promos", "cassette club cards"],
    preferredComposition: ["arena tour credential", "college radio promo", "stadium spectacle poster"],
    preferredTypography: ["hair metal display chrome", "college rock editorial type", "arena billing caps"],
    preferredColorLanguage: ["chrome and electric purple", "arena spotlight gold", "late-80s glossy ink"],
    discouragedMotifs: ["grunge distress dominant", "1950s innocence", "generic hippie festival"],
    negativePromptTerms: ["grunge tear", "Woodstock crowd", "teen idol card", "flannel texture"],
  },
  {
    slug: "1990-1993",
    preferredMotifs: ["grunge gig handbills", "xerox club flyers", "MTV Unplugged memorabilia", "alternative tour laminates"],
    preferredComposition: ["distressed screen-print poster", "zine collage layout", "indie club admission"],
    preferredTypography: ["distressed sans", "typewriter zine captions", "unplugged editorial lettering"],
    preferredColorLanguage: ["off-white xerox stock", "muted green and brown", "raw black ink"],
    discouragedMotifs: ["MTV neon dominant", "1980s yuppie gloss", "psychedelic sunburst", "corporate laminate polish"],
    negativePromptTerms: ["neon grid", "synthwave", "giant sun", "corporate badge", "hair metal chrome"],
  },
  {
    slug: "1994-1997",
    preferredMotifs: ["alternative nation press", "hip-hop promo cards", "rave flyer graphics", "CD era magazine covers"],
    preferredComposition: ["magazine cover layout", "rave admission stub", "alt-rock tour handbill"],
    preferredTypography: ["editorial coverlines", "rave geometric type", "hip-hop bold display"],
    preferredColorLanguage: ["mid-90s saturated accents", "newsprint warmth", "club flyer neon accents"],
    discouragedMotifs: ["1950s ballroom", "psychedelic hippie default", "generic MTV logo"],
    negativePromptTerms: ["teen idol", "peace sign", "MTV logo", "Woodstock crowd"],
  },
  {
    slug: "1998-2001",
    preferredMotifs: ["CD jewel-case promos", "TRL-era cards", "nu-metal tour passes", "teen magazine covers", "early digital print ephemera"],
    preferredComposition: ["TRL promo card", "CD release postcard", "nu-metal tour laminate"],
    preferredTypography: ["Y2K bold sans", "teen magazine coverlines", "CD catalog caption type"],
    preferredColorLanguage: ["silver digital accents", "high-contrast print", "late-90s glossy stock"],
    discouragedMotifs: ["giant headphones cliché", "graffiti tag filler", "generic MTV neon grid", "cassette tape piles"],
    negativePromptTerms: ["giant headphones", "graffiti tags", "cassette pile", "neon synthwave grid"],
  },
  {
    slug: "2002-2005",
    preferredMotifs: ["iPod-era promo cards", "emo tour handbills", "ringtone promo graphics", "TRL countdown cards"],
    preferredComposition: ["digital download promo", "emo poster hierarchy", "ringtone club card"],
    preferredTypography: ["emo angular display", "clean digital sans", "ringtone ad lettering"],
    preferredColorLanguage: ["white glossy stock", "emo black and pink", "early digital blue accents"],
    discouragedMotifs: ["vinyl nostalgia default", "psychedelic sun", "grunge xerox dominant"],
    negativePromptTerms: ["vinyl record pile", "giant sun", "xerox grunge", "Woodstock"],
  },
  {
    slug: "2006-2009",
    preferredMotifs: ["MySpace promo graphics", "blog-era concert flyers", "indie electro handbills", "festival wristband art"],
    preferredComposition: ["blog flyer layout", "social-era promo card", "festival credential stub"],
    preferredTypography: ["indie electro display", "blog headline sans", "festival admission caps"],
    preferredColorLanguage: ["digital print brights", "indie pastel accents", "festival ink on white"],
    discouragedMotifs: ["generic stock crowd scenes", "MTV 1980s neon default", "corporate SaaS layout"],
    negativePromptTerms: ["stock festival crowd", "MTV neon", "corporate dashboard", "generic VIP template"],
  },
  {
    slug: "2010-2013",
    preferredMotifs: ["EDM festival credentials", "indie folk handbills", "streaming-era promo cards", "Instagram-ready poster crops"],
    preferredComposition: ["festival gate pass", "indie folk poster", "streaming release card"],
    preferredTypography: ["festival bold sans", "folk hand-lettered titles", "digital promo clean type"],
    preferredColorLanguage: ["festival neon accents", "folk warm paper", "streaming minimal white"],
    discouragedMotifs: ["CD pile cliché", "cassette nostalgia", "generic Woodstock imagery"],
    negativePromptTerms: ["CD pile", "cassette tape", "Woodstock crowd", "giant headphones"],
  },
  {
    slug: "2014-2017",
    preferredMotifs: ["vinyl revival sleeves", "festival credential art", "playlist promo cards", "streaming playlist covers"],
    preferredComposition: ["vinyl reissue postcard", "festival admission art", "playlist promo layout"],
    preferredTypography: ["vinyl revival serif", "festival display caps", "playlist editorial type"],
    preferredColorLanguage: ["craft paper warmth", "festival sunset inks", "streaming flat brights"],
    discouragedMotifs: ["generic stock vinyl photo", "2010 EDM cliché default", "corporate badge"],
    negativePromptTerms: ["stock vinyl photo", "generic EDM crowd", "corporate ID", "SaaS card"],
  },
  {
    slug: "2018-2021",
    preferredMotifs: ["playlist-era promo", "intimate venue handbills", "vinyl and streaming hybrid cards", "pandemic livestream passes"],
    preferredComposition: ["intimate venue poster", "livestream admission card", "playlist feature layout"],
    preferredTypography: ["minimal editorial sans", "handbill condensed caps", "livestream caption type"],
    preferredColorLanguage: ["muted contemporary inks", "warm craft stock", "digital flat accents"],
    discouragedMotifs: ["generic stock concert crowd", "nostalgia collage cliché", "corporate laminate"],
    negativePromptTerms: ["stock crowd photo", "nostalgia collage", "corporate badge", "generic VIP"],
  },
  {
    slug: "2022-2025",
    preferredMotifs: ["tour poster revivals", "vinyl and streaming dual promos", "festival collectible cards", "social-era drop graphics"],
    preferredComposition: ["tour poster monument", "festival collectible card", "release drop promo"],
    preferredTypography: ["revival display serif", "festival bold hierarchy", "drop announcement caps"],
    preferredColorLanguage: ["contemporary craft paper", "festival ink brights", "revival warm neutrals"],
    discouragedMotifs: ["AI generic gloss", "corporate SaaS card", "stock festival panorama"],
    negativePromptTerms: ["corporate SaaS", "stock festival crowd", "generic AI gloss", "conference badge"],
  },
];

mkdirSync(OUT, { recursive: true });

for (const profile of PROFILES) {
  const path = join(OUT, `${profile.slug}.json`);
  writeFileSync(path, `${JSON.stringify(profile, null, 2)}\n`, "utf8");
  console.log(`wrote ${path}`);
}

console.log(`Seeded ${PROFILES.length} prompt profiles.`);
