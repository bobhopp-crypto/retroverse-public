/** Canonical editorial records for RV Year worlds — magazine voice, chart-page editorial. */

export type RvYearEditorialRecord = {
  year: number;
  headline: string;
  lead: string;
  theme: string;
  keywords: string[];
  definingMoments: string[];
  shortDeck?: string;
  accentMood?: string;
};

export const RV_YEAR_EDITORIAL_MIN = 1958;
export const RV_YEAR_EDITORIAL_MAX = 2025;

export const RV_YEAR_EDITORIAL_RECORDS: RvYearEditorialRecord[] = [
  {
    year: 1958,
    headline: "Rock and Roll Claims the Charts",
    lead:
      "Elvis is in the Army and the jukebox doesn't miss a beat — teenagers finally have a sound that feels like theirs, not their parents'. " +
      "Billboard's Hot 100 debuts and suddenly every week reads like a referendum on what America wants to dance to. " +
      "The big-band era isn't dead yet, but the volume knob has turned.",
    theme: "Birth of the teen market",
    keywords: ["rock and roll", "Hot 100 debut", "Elvis", "doo-wop", "teen market"],
    definingMoments: [
      "Billboard Hot 100 launches August 4",
      "Elvis inducted into the U.S. Army",
      "Chuck Berry's 'Johnny B. Goode' breaks through",
      "Danny & the Juniors' 'At the Hop' tops the year-end chart",
    ],
    shortDeck: "The dial turns young.",
    accentMood: "restless optimism",
  },
  {
    year: 1959,
    headline: "The Day the Music Cried",
    lead:
      "Buddy Holly, Ritchie Valens, and the Big Bopper vanish on a frozen Iowa runway — and an entire generation learns that heroes can disappear overnight. " +
      "The grief hangs over every transistor radio, yet the charts keep climbing because rock and roll refuses to sit still. " +
      "Doo-wop harmonies and early soul fill the air while the culture catches its breath.",
    theme: "Loss and momentum",
    keywords: ["Buddy Holly", "doo-wop", "teen tragedy", "early soul", "rock and roll"],
    definingMoments: [
      "The Day the Music Died — February 3 plane crash",
      "Johnny Mathis and Lloyd Price dominate pop",
      "The Fleetwoods' 'Come Softly to Me' becomes a whispered standard",
      "Rock and roll faces censorship battles nationwide",
    ],
    accentMood: "bittersweet forward motion",
  },
  {
    year: 1960,
    headline: "Elvis Returns, Pop Reorganizes",
    lead:
      "Elvis ships home from Germany and the charts snap to attention — a King returning to reclaim the throne everyone had been holding warm. " +
      "The Brill Building starts humming with songwriters who treat three minutes like cinema, and Motown is quietly assembling a factory in Detroit. " +
      "Pop still loves a crooner, but the beat underneath is getting harder to ignore.",
    theme: "Postwar pop realignment",
    keywords: ["Elvis comeback", "Brill Building", "Motown", "crooners", "early sixties pop"],
    definingMoments: [
      "Elvis discharged from the Army, records 'It's Now or Never'",
      "The Drifters' 'Save the Last Dance for Me' defines elegant pop",
      "Motown releases its first national hits",
      "Chubby Checker launches the Twist craze",
    ],
    shortDeck: "The King is back. So is the beat.",
  },
  {
    year: 1961,
    headline: "Brill Building Brilliance",
    lead:
      "Songwriting teams in midtown Manhattan treat the three-minute single like a miniature Broadway show — every bridge a plot twist, every hook a curtain call. " +
      "Girl groups glide through heartbreak with choreography in their harmonies, while surf rock starts sending postcards from the West Coast. " +
      "The charts feel curated, not accidental, and every week another perfect pocket symphony arrives.",
    theme: "Craft meets youth culture",
    keywords: ["Brill Building", "girl groups", "Goffin-King", "surf rock", "pop craftsmanship"],
    definingMoments: [
      "The Shirelles' 'Will You Love Me Tomorrow' — pop sophistication arrives",
      "Ben E. King goes solo with 'Stand by Me'",
      "Dick Dale defines surf guitar on the Left Coast",
      "Patsy Cline crosses over from country to national treasure",
    ],
    accentMood: "polished yearning",
  },
  {
    year: 1962,
    headline: "Surf's Up on the Radio",
    lead:
      "Beach Boys harmonies and surf instrumentals turn California into a sound you can buy on 45 — sun-bleached, reverb-drenched, impossibly optimistic. " +
      "Motown's assembly line hits full stride while folk revivalists whisper that something bigger is coming. " +
      "The charts still love a love song, but the production is getting bolder and the audiences are getting younger.",
    theme: "West Coast optimism",
    keywords: ["Beach Boys", "surf rock", "Motown", "folk revival", "California sound"],
    definingMoments: [
      "Beach Boys' 'Surfin' Safari' introduces the California dream",
      "Motown's 'Shop Around' becomes the label's first million-seller",
      "Gene Chandler's 'Duke of Earl' tops the pop chart",
      "Bob Dylan arrives in New York's folk scene",
    ],
    shortDeck: "Sun, reverb, and harmony.",
  },
  {
    year: 1963,
    headline: "Girl Groups and Motown Ascend",
    lead:
      "Detroit's Hitsville USA becomes a hit machine — polished, irresistible, and built for every car radio in America. " +
      "Girl groups deliver heartbreak with architectural precision while Phil Spector's wall of sound turns the studio into a cathedral. " +
      "Folk protest simmers downtown, but the national conversation still belongs to the dance floor.",
    theme: "Soul and pop sophistication",
    keywords: ["Motown", "girl groups", "Phil Spector", "wall of sound", "early sixties soul"],
    definingMoments: [
      "The Crystals' 'Da Doo Ron Ron' showcases Spector's wall of sound",
      "Stevie Wonder's 'Fingertips' announces a prodigy",
      "The Beach Boys' 'Surfin' U.S.A.' goes national",
      "Peter, Paul and Mary bring folk to the Top 10",
    ],
    accentMood: "glittering heartbreak",
  },
  {
    year: 1964,
    headline: "The British Invasion Lands",
    lead:
      "Beatlemania rewires the radio — four lads from Liverpool make the charts feel like a national event again, and every band with an R on their amp rushes the Atlantic. " +
      "Motown answers from Detroit with precision and grace, while America discovers that the British don't just copy, they reinvent. " +
      "The room got louder, the hair got longer, and pop would never pretend to be adult-only again.",
    theme: "Transatlantic pop revolution",
    keywords: ["British Invasion", "Beatlemania", "Motown", "Merseybeat", "sixties pop"],
    definingMoments: [
      "The Beatles on Ed Sullivan — 73 million viewers",
      "The Rolling Stones release their debut U.S. singles",
      "The Supremes' 'Where Did Our Love Go' launches a dynasty",
      "The Animals' 'House of the Rising Sun' tops the Hot 100",
    ],
    shortDeck: "Four lads rewired America.",
    accentMood: "electric arrival",
  },
  {
    year: 1965,
    headline: "Folk Rock Finds Its Pulse",
    lead:
      "Dylan plugs in at Newport and the argument over what folk means becomes the year's loudest backstage conversation. " +
      "The Byrds jangle through 'Mr. Tambourine Man' and prove that protest poetry can wear a backbeat without losing its teeth. " +
      "British bands keep flooding in, but American artists are learning to answer with volume, attitude, and studio ambition.",
    theme: "Electric folk crossover",
    keywords: ["folk rock", "Bob Dylan", "The Byrds", "British Invasion", "protest pop"],
    definingMoments: [
      "Dylan goes electric at Newport Folk Festival",
      "The Byrds' 'Mr. Tambourine Man' tops the charts",
      "The Rolling Stones' 'Satisfaction' redefines guitar riffs",
      "James Brown's 'Papa's Got a Brand New Bag' births funk",
    ],
    accentMood: "wired and restless",
  },
  {
    year: 1966,
    headline: "Psychedelia Starts Knocking",
    lead:
      "Studio experimentation stops being a secret and starts becoming the headline — bands treat the mixing desk like an instrument and the single like a canvas. " +
      "Motown keeps delivering precision pop while San Francisco's underground begins painting with brighter colors and stranger textures. " +
      "The charts still love a melody, but the margins are filling up with feedback, sitars, and songs that refuse to end where they started.",
    theme: "Studio as instrument",
    keywords: ["psychedelic pop", "Motown", "Beach Boys", "Revolver", "studio experimentation"],
    definingMoments: [
      "The Beach Boys begin the 'Pet Sounds' sessions",
      "The Beatles release 'Revolver'",
      "The Supremes dominate with 'You Can't Hurry Love'",
      "Donovan's 'Sunshine Superman' brings psychedelia to Top 40",
    ],
    shortDeck: "The studio becomes a canvas.",
  },
  {
    year: 1967,
    headline: "Summer Turns Psychedelic",
    lead:
      "Color, rebellion, and studio ambition spill out of the speakers — pop stops playing it safe and starts chasing the infinite. " +
      "The Summer of Love turns San Francisco into a pilgrimage site while Sgt. Pepper rewrites what an album can pretend to be. " +
      "Every week another single arrives sounding like it was mixed in a dream and mastered for a revolution.",
    theme: "Summer of Love",
    keywords: ["Summer of Love", "Sgt. Pepper", "psychedelia", "San Francisco", "album rock"],
    definingMoments: [
      "The Beatles' 'Sgt. Pepper's Lonely Hearts Club Band' reshapes the album",
      "Monterey Pop Festival introduces Hendrix and Otis Redding to mass America",
      "Aretha Franklin's 'Respect' becomes an anthem",
      "The Doors' self-titled debut casts a shadow over L.A.",
    ],
    shortDeck: "Pop chases the infinite.",
    accentMood: "kaleidoscopic freedom",
  },
  {
    year: 1968,
    headline: "A Hard Rain's Gonna Fall",
    lead:
      "Assassinations, war footage, and city streets on fire bleed into the music — the charts carry weight they didn't ask for and can't put down. " +
      "Soul grows fiercer, rock grows heavier, and even the prettiest pop single sounds like it's arguing with the evening news. " +
      "The year doesn't offer escape so much as a mirror held up at full volume.",
    theme: "Turmoil and truth-telling",
    keywords: ["social unrest", "soul", "heavy rock", "protest", "late sixties"],
    definingMoments: [
      "Martin Luther King Jr. and Robert F. Kennedy assassinations",
      "The Beatles' 'Hey Jude' becomes a communal singalong",
      "Jimi Hendrix's 'Electric Ladyland' pushes guitar into new territory",
      "Marvin Gaye's 'I Heard It Through the Grapevine' dominates soul radio",
    ],
    accentMood: "righteous gravity",
  },
  {
    year: 1969,
    headline: "Woodstock Summer, Studio Dreams",
    lead:
      "Half a million people muddy their way into legend on a dairy farm while back in the city, bands are building albums meant to outlast the moment. " +
      "Motown keeps the groove immaculate even as rock splits into heavy, cosmic, and confessional camps. " +
      "The decade ends not with a whimper but with a wall of amplifiers and the sense that anything could happen next.",
    theme: "Festival era arrives",
    keywords: ["Woodstock", "album rock", "Motown", "heavy rock", "festival culture"],
    definingMoments: [
      "Woodstock defines the festival era — August 15–18",
      "The Beatles' 'Abbey Road' closes the sixties in style",
      "Led Zeppelin's debut reshapes hard rock",
      "The Jackson 5 audition for Motown and begin their ascent",
    ],
    shortDeck: "Half a million voices in the mud.",
  },
  {
    year: 1970,
    headline: "Singer-Songwriter Nation",
    lead:
      "The Beatles break up and the spotlight drifts toward solitary voices with acoustic guitars and something to confess. " +
      "Motown and soul keep the dance floor honest while FM radio starts treating albums like novels you listen to in the dark. " +
      "The charts still love a hit, but the culture is learning to sit with a record for more than three minutes.",
    theme: "Confessional pop rises",
    keywords: ["singer-songwriter", "FM radio", "Motown", "album era", "early seventies"],
    definingMoments: [
      "The Beatles officially disband",
      "Simon & Garfunkel's 'Bridge Over Troubled Water' dominates",
      "The Jackson 5's 'I Want You Back' launches a new Motown era",
      "Diana Ross leaves the Supremes for a solo crown",
    ],
    accentMood: "intimate and expansive",
  },
  {
    year: 1971,
    headline: "Rock Gets Bigger",
    lead:
      "Singer-songwriters, soul, and FM ambition share the spotlight — the albums grow longer, the feelings get louder, and every hit feels like a statement. " +
      "Carole King and Marvin Gaye turn personal truth into mass communion while Led Zeppelin and the Who prove that rock can fill stadiums without apologizing. " +
      "This is the year pop learned that intimacy and enormity could share the same turntable.",
    theme: "Album-era ambition",
    keywords: ["singer-songwriter", "classic rock", "soul", "FM radio", "stadium rock"],
    definingMoments: [
      "Marvin Gaye's 'What's Going On' — soul as social document",
      "Carole King's 'Tapestry' defines the confessional album",
      "Led Zeppelin IV enters the classic-rock canon",
      "Don McLean's 'American Pie' turns pop into mythology",
    ],
    shortDeck: "Albums as statements.",
    accentMood: "expansive conviction",
  },
  {
    year: 1972,
    headline: "Soul Gets Sophisticated",
    lead:
      "Al Green and Curtis Mayfield turn devotion and struggle into silk — every groove feels tailor-made for late-night listening and Sunday morning reckoning. " +
      "Glam rock glitters through London while America argues over what's real and what's costume, and the answer is usually both. " +
      "The charts reward artists who treat melody like a luxury good.",
    theme: "Glam and soul refinement",
    keywords: ["soul", "Al Green", "glam rock", "progressive rock", "early seventies"],
    definingMoments: [
      "Al Green's 'Let's Stay Together' defines modern soul",
      "David Bowie's 'The Rise and Fall of Ziggy Stardust' launches glam",
      "The Staple Singers' 'I'll Take You There' tops the pop chart",
      "The Eagles' debut begins California soft-rock dominance",
    ],
  },
  {
    year: 1973,
    headline: "Glitter Meets Grit",
    lead:
      "Arena rock rises while soul and funk keep the dance floor honest — glam, grit, and groove trade the spotlight all year long. " +
      "Elton John and Stevie Wonder prove that spectacle and substance can share a billing, while the New York scene sharpens its edges downtown. " +
      "Every big single feels like it was built for both the stadium and the bedroom.",
    theme: "Arena spectacle meets street soul",
    keywords: ["arena rock", "glam", "funk", "Elton John", "Stevie Wonder"],
    definingMoments: [
      "Elton John's 'Goodbye Yellow Brick Road' conquers the world",
      "Stevie Wonder's 'Innervisions' pushes soul into new territory",
      "Pink Floyd's 'Dark Side of the Moon' begins its chart marathon",
      "Roberta Flack's 'Killing Me Softly' becomes a quiet storm standard",
    ],
    shortDeck: "Stadium lights, street grooves.",
    accentMood: "glitter and grit",
  },
  {
    year: 1974,
    headline: "Disco Winks, Funk Rules",
    lead:
      "The dance floor starts whispering louder — four-on-the-floor patterns creep into the charts while funk bands treat the groove like sacred geometry. " +
      "Stevie Wonder and Elton John keep delivering event-level albums, and Philadelphia soul polishes every hook until it gleams. " +
      "Rock still packs arenas, but the pulse underneath is learning a new language.",
    theme: "Pre-disco dance emergence",
    keywords: ["funk", "Philly soul", "early disco", "Elton John", "Stevie Wonder"],
    definingMoments: [
      "Stevie Wonder's 'Fulfillingness' First Finale' wins Album of the Year",
      "Barry White's Love Unlimited Orchestra defines lush disco-soul",
      "Maria Muldaur's 'Midnight at the Oasis' adds exotic pop flair",
      "Kansas and Bad Company bring heartland rock to FM",
    ],
  },
  {
    year: 1975,
    headline: "Arena Rock Crowned",
    lead:
      "Fleetwood Mac begins assembling the album that will define the rest of the decade while Queen turns the studio into an opera house. " +
      "Disco stops being a downtown secret and starts flashing its mirror ball toward the mainstream, but rock still owns the summer tour circuit. " +
      "Every anthem feels sized for a crowd of fifty thousand singing the chorus back.",
    theme: "Stadium anthems ascend",
    keywords: ["arena rock", "Fleetwood Mac", "Queen", "disco emergence", "classic rock"],
    definingMoments: [
      "Fleetwood Mac's self-titled album sets up 'Rumours'",
      "Queen's 'Bohemian Rhapsody' redefines the rock single",
      "Earth, Wind & Fire's 'That's the Way of the World' fuses funk and pop",
      "Captain & Tennille's 'Love Will Keep Us Together' tops the year",
    ],
    accentMood: "crowned and cruising",
  },
  {
    year: 1976,
    headline: "Disco Crosses Over",
    lead:
      "The mirror ball meets the tour bus — Fleetwood Mac owns the summer while dance music learns to speak to everyone, not just the after-midnight crowd. " +
      "Rock still fills arenas with Wings and the Eagles, but the radio dial is tilting toward rhythm sections that won't sit down. " +
      "The crossover isn't a compromise; it's a takeover in slow motion.",
    theme: "Disco meets mainstream",
    keywords: ["disco crossover", "Fleetwood Mac", "soft rock", "funk", "dance music"],
    definingMoments: [
      "Fleetwood Mac's 'Rumours' sessions intensify",
      "The Bee Gees pivot toward dance with 'You Should Be Dancing'",
      "Rod Stewart's 'Tonight's the Night' dominates pop radio",
      "Wild Cherry's 'Play That Funky Music' bridges rock and funk",
    ],
    shortDeck: "The mirror ball goes national.",
    accentMood: "four-on-the-floor crossover",
  },
  {
    year: 1977,
    headline: "Saturday Night Fever",
    lead:
      "Four-on-the-floor energy takes the mainstream — rock still packs arenas, but the pulse of the city gets faster and the collars get wider. " +
      "The Bee Gees turn disco into a global brand while Fleetwood Mac's 'Rumours' proves that heartbreak can sell thirty million copies. " +
      "Every dance floor feels like a movie set, and every movie wants a soundtrack that moves.",
    theme: "Disco goes cinematic",
    keywords: ["Saturday Night Fever", "Bee Gees", "disco", "Fleetwood Mac", "soundtrack era"],
    definingMoments: [
      "Saturday Night Fever soundtrack redefines the movie album",
      "Fleetwood Mac's 'Rumours' becomes one of the best-selling albums ever",
      "Elvis Presley dies — rock and roll mourns its founding king",
      "The Sex Pistols' 'Never Mind the Bollocks' detonates punk",
    ],
    accentMood: "white suit velocity",
  },
  {
    year: 1978,
    headline: "The Year Disco Took Over",
    lead:
      "Mirror balls, polyester, and unstoppable hooks — pop and dance collide while rock answers from the stadium seats with bigger lights and louder choruses. " +
      "The Bee Gees and Donna Summer make the charts feel like one endless block party, and even rock bands start flirting with the dance floor. " +
      "Love it or mock it, disco is the wallpaper of the year.",
    theme: "Disco dominance",
    keywords: ["disco", "Bee Gees", "Donna Summer", "stadium rock", "dance pop"],
    definingMoments: [
      "Bee Gees dominate with 'Stayin' Alive' and 'Night Fever'",
      "Donna Summer's 'Last Dance' wins an Oscar",
      "The Rolling Stones' 'Miss You' goes disco-adjacent",
      "Village People's 'Y.M.C.A.' becomes a cultural institution",
    ],
    shortDeck: "Polyester and pulse.",
  },
  {
    year: 1979,
    headline: "New Wave Crashes the Party",
    lead:
      "Punk's children arrive with synthesizers, skinny ties, and songs that feel like they were written in the back of a cab at 2 a.m. " +
      "Disco faces a backlash in Chicago stadiums, but the dance floor doesn't disappear — it just changes clothes. " +
      "Michael Jackson's 'Off the Wall' hints that the next decade belongs to a new kind of pop monarch.",
    theme: "Post-disco new wave",
    keywords: ["new wave", "punk aftermath", "Michael Jackson", "disco backlash", "synth pop"],
    definingMoments: [
      "Michael Jackson's 'Off the Wall' launches solo superstardom",
      "The Sugarhill Gang's 'Rapper's Delight' puts hip-hop on record",
      "The Clash's 'London Calling' expands punk's vocabulary",
      "Disco Demolition Night — July 12 in Chicago",
    ],
    accentMood: "sharp-edged reinvention",
  },
  {
    year: 1980,
    headline: "The Murder That Shocked Disco",
    lead:
      "John Lennon is gone and the world plays his songs in the streets — a reminder that the voices we lean on can be silenced without warning. " +
      "Post-disco R&B and new wave share the charts while AC/DC and Queen prove that rock still knows how to thunder. " +
      "The year opens wounded and ends hungry for whatever comes next.",
    theme: "Grief and transition",
    keywords: ["John Lennon", "new wave", "post-disco", "AC/DC", "eighties transition"],
    definingMoments: [
      "John Lennon murdered outside the Dakota — December 8",
      "AC/DC's 'Back in Black' becomes a rock landmark",
      "Blondie's 'Call Me' tops the Hot 100 for six weeks",
      "Queen's 'Another One Bites the Dust' crosses into funk and R&B",
    ],
    shortDeck: "The world plays Lennon in the streets.",
    accentMood: "wounded momentum",
  },
  {
    year: 1981,
    headline: "MTV Launches, Synths Bloom",
    lead:
      "Music television flips on August 1 and suddenly every artist needs a visual identity — the single becomes half song, half short film. " +
      "Synths and drum machines bloom across pop and rock while Prince and Madonna begin assembling personas that will define the decade. " +
      "The charts still reward a hook, but now the hook needs a haircut and a storyline.",
    theme: "MTV era begins",
    keywords: ["MTV launch", "synth pop", "new wave", "Prince", "Madonna"],
    definingMoments: [
      "MTV launches August 1 — 'Video Killed the Radio Star' first video",
      "Prince's 'Controversy' and Madonna's debut signal new pop royalty",
      "The Human League's 'Don't You Want Me' tops the U.S. chart",
      "Lionel Richie leaves Commodores for solo superstardom",
    ],
    accentMood: "neon and narrative",
  },
  {
    year: 1982,
    headline: "Thriller's Shadow Looms",
    lead:
      "Michael Jackson is filming videos that look like blockbusters and the industry is taking notes — pop stardom is about to become a full-time cinematic enterprise. " +
      "Synth-pop and new wave keep the clubs glowing while Quiet Storm R&B fills the late-night air with silk and confession. " +
      "Every label wants a star who can sing, dance, and look undeniable on a thirteen-inch screen.",
    theme: "Pop spectacle intensifies",
    keywords: ["Michael Jackson", "Thriller", "synth pop", "new wave", "R&B"],
    definingMoments: [
      "Michael Jackson releases 'Thriller' — November 30",
      "The Go-Go's become the first all-women band to write a No. 1 album",
      "Grandmaster Flash's 'The Message' elevates hip-hop storytelling",
      "Survivor's 'Eye of the Tiger' becomes the workout anthem",
    ],
    shortDeck: "Pop becomes cinema.",
  },
  {
    year: 1983,
    headline: "Video Changes Everything",
    lead:
      "Image and sound lock together — synths go mainstream and every big single feels like a broadcast premiere you have to see to fully believe. " +
      "Michael Jackson's moonwalk turns the Motown 25 special into a generational checkpoint while Madonna and Prince rewrite the pop rulebook. " +
      "The charts don't just track what America hears; they track what America watches on repeat.",
    theme: "Music video revolution",
    keywords: ["MTV", "Michael Jackson", "Madonna", "Prince", "synth pop"],
    definingMoments: [
      "Michael Jackson's Motown 25 moonwalk — March 25",
      "Madonna's self-titled debut launches a pop dynasty",
      "The Police's 'Synchronicity' dominates album rock",
      "Def Leppard's 'Pyromania' brings hard rock to MTV",
    ],
    shortDeck: "See it, hear it, believe it.",
    accentMood: "broadcast glamour",
  },
  {
    year: 1984,
    headline: "Pop Turns Maximal",
    lead:
      "Big hooks, bigger hair, and anthems built for singalongs — the year when pop learned to fill every inch of the screen and every watt of the PA system. " +
      "Prince, Madonna, and Bruce Springsteen deliver landmark albums while hip-hop starts knocking louder on the mainstream door. " +
      "Excess isn't a bug; it's the whole aesthetic.",
    theme: "Maximalist pop peak",
    keywords: ["maximal pop", "Prince", "Madonna", "Born in the U.S.A.", "eighties anthems"],
    definingMoments: [
      "Prince's 'Purple Rain' and Madonna's 'Like a Virgin' reshape pop",
      "Bruce Springsteen's 'Born in the U.S.A.' becomes a cultural flag",
      "Van Halen's 'Jump' brings synths to hard rock",
      "Wham!'s 'Make It Big' exports British pop globally",
    ],
    accentMood: "supersized singalong",
  },
  {
    year: 1985,
    headline: "Live Aid Unites the World",
    lead:
      "Two continents tune in for one day of stadium-sized charity — rock royalty shares a stage and the world discovers that pop can still feel like a communal event. " +
      "Madonna, Prince, and Springsteen keep ruling the charts while hip-hop's golden age accelerates in the boroughs and beyond. " +
      "The year proves that spectacle and sincerity can share a microphone.",
    theme: "Global pop unity",
    keywords: ["Live Aid", "charity rock", "Madonna", "hip-hop golden age", "stadium pop"],
    definingMoments: [
      "Live Aid — July 13, Wembley and JFK Stadium",
      "Madonna's 'Like a Virgin' tour defines pop spectacle",
      "Run-D.M.C. and Aerosmith's 'Walk This Way' fuses rap and rock",
      "Tears for Fears' 'Songs from the Big Chair' dominates new wave",
    ],
    shortDeck: "One day, two continents, one stage.",
    accentMood: "communal spectacle",
  },
  {
    year: 1986,
    headline: "Hair Metal Height",
    lead:
      "Striped spandex and stack amps fill arenas while synth-pop keeps the radio glowing — the decade's loudest fashion statement meets its glossiest production. " +
      "Hip-hop's storytellers sharpen their craft and Janet Jackson begins a run that will redefine R&B stardom. " +
      "Every power ballad feels engineered to be sung from the back of a convertible.",
    theme: "Arena glam peak",
    keywords: ["hair metal", "synth pop", "Janet Jackson", "hip-hop", "arena rock"],
    definingMoments: [
      "Bon Jovi's 'Slippery When Wet' conquers mainstream rock",
      "Janet Jackson's 'Control' announces a new R&B era",
      "Beastie Boys' 'Licensed to Ill' brings hip-hop to suburbia",
      "Peter Gabriel's 'Sledgehammer' wins the MTV video war",
    ],
  },
  {
    year: 1987,
    headline: "Rap Goes Platinum",
    lead:
      "Hip-hop stops asking for permission and starts collecting plaques — the culture that started on park benches now outsells half the rock aisle. " +
      "U2 and Whitney Houston deliver event albums while hair metal and synth-pop keep the mainstream glittering. " +
      "The charts begin to look like the country actually sounds.",
    theme: "Hip-hop mainstream breakthrough",
    keywords: ["hip-hop", "U2", "Whitney Houston", "hair metal", "crossover"],
    definingMoments: [
      "Beastie Boys' 'Licensed to Ill' becomes first rap album at No. 1",
      "U2's 'The Joshua Tree' makes stadium rock spiritual",
      "Whitney Houston's 'I Wanna Dance with Somebody' defines pop joy",
      "Michael Jackson's 'Bad' follows 'Thriller' at global scale",
    ],
    accentMood: "unapologetic arrival",
  },
  {
    year: 1988,
    headline: "Crossover Summer",
    lead:
      "Genre lines blur on the charts — rock, R&B, and pop share the same summer playlist and nobody asks anyone to pick a side. " +
      "Tracy Chapman arrives with an acoustic guitar and a voice that stops traffic, while Guns N' Roses remind arenas what danger sounds like. " +
      "The year feels like a mixtape someone made by stealing from every great radio station in America.",
    theme: "Genre-blurring pop",
    keywords: ["crossover", "Tracy Chapman", "Guns N' Roses", "new jack swing", "pop R&B"],
    definingMoments: [
      "Tracy Chapman's debut delivers 'Fast Car' and 'Talkin' Bout a Revolution'",
      "Guns N' Roses' 'Appetite for Destruction' reaches No. 1",
      "George Michael's 'Faith' cements solo superstardom",
      "New jack swing begins with Bobby Brown's 'Don't Be Cruel'",
    ],
    shortDeck: "Every genre on one playlist.",
  },
  {
    year: 1989,
    headline: "Pop Fragmentation Begins",
    lead:
      "The monoculture starts showing hairline cracks — hip-hop, adult contemporary, and hard rock each build their own empires while still sharing the same Hot 100. " +
      "Madonna and Janet keep setting trends, but the underground is getting faster and the charts are getting stranger. " +
      "The decade ends not with one sound but with a dozen futures competing for the dial.",
    theme: "Pre-grunge fragmentation",
    keywords: ["fragmentation", "Madonna", "hip-hop", "hard rock", "late eighties"],
    definingMoments: [
      "Madonna's 'Like a Prayer' ignites culture-war headlines",
      "N.W.A's 'Straight Outta Compton' expands hip-hop's reach",
      "Milli Vanilli's lip-sync scandal foreshadows image anxiety",
      "New Kids on the Block launch the modern boy-band template",
    ],
    accentMood: "splintering signal",
  },
  {
    year: 1990,
    headline: "Vanilla Ice Breaks the Dam",
    lead:
      "A white rapper tops the chart and the conversation about who owns hip-hop gets louder — the genre's commercial power is undeniable even when the headlines get messy. " +
      "Madonna and Mariah Carey keep pop glamorous while R&B and new jack swing refine the slow jam into an art form. " +
      "The year feels like a handoff between decades, with every format trying to guess what's next.",
    theme: "Hip-hop pop crossover",
    keywords: ["Vanilla Ice", "MC Hammer", "Madonna", "new jack swing", "Mariah Carey"],
    definingMoments: [
      "Vanilla Ice's 'Ice Ice Baby' becomes first hip-hop single to top the Hot 100",
      "MC Hammer's 'U Can't Touch This' goes global",
      "Mariah Carey's debut announces a new vocal standard",
      "Madonna's 'Vogue' brings ballroom culture to MTV",
    ],
  },
  {
    year: 1991,
    headline: "Alternative Breaks Through",
    lead:
      "Grunge cracks the surface while hip-hop owns the conversation — the monoculture starts to splinter, but the hits still feel huge. " +
      "Nirvana's 'Nevermind' detonates in September and suddenly every A&R scout is driving to Seattle with a flannel shirt in the trunk. " +
      "Pop doesn't die; it just learns to share the room with noise, angst, and truth.",
    theme: "Grunge arrives",
    keywords: ["grunge", "Nirvana", "hip-hop", "alternative rock", "Lollapalooza"],
    definingMoments: [
      "Nirvana's 'Nevermind' and 'Smells Like Teen Spirit' — September",
      "Lollapalooza festival launches alternative touring",
      "Michael Jackson's 'Black or White' video dominates MTV",
      "Mariah Carey's 'Emotions' showcases vocal acrobatics",
    ],
    shortDeck: "Flannel meets the mainstream.",
    accentMood: "controlled detonation",
  },
  {
    year: 1992,
    headline: "Alternative Becomes Mainstream",
    lead:
      "Guitar bands return to the center of the culture — hip-hop keeps evolving, and pop learns to borrow from every corner of the map. " +
      "Dr. Dre's 'The Chronic' redraws the West Coast while R.E.M. and U2 prove that college rock can still fill stadiums. " +
      "The charts look like a mix of rebellion, rhythm, and reinvention.",
    theme: "Alternative normalization",
    keywords: ["alternative rock", "Dr. Dre", "grunge", "R.E.M.", "crossover hip-hop"],
    definingMoments: [
      "Dr. Dre's 'The Chronic' defines G-funk",
      "R.E.M.'s 'Automatic for the People' becomes an alt-rock landmark",
      "Eric Clapton's 'Unplugged' revives the acoustic format",
      "Sir Mix-A-Lot's 'Baby Got Back' tops the chart",
    ],
    accentMood: "genre collision",
  },
  {
    year: 1993,
    headline: "Grunge Owns the Dial",
    lead:
      "Seattle's warehouse sound is everywhere — Pearl Jam, Nirvana, and Soundgarden turn distortion into a national language while hip-hop keeps innovating on both coasts. " +
      "Pop doesn't disappear; Whitney Houston and Janet Jackson remind everyone that melody still moves mountains. " +
      "The year feels like rock's last great consensus before the internet rewires everything.",
    theme: "Grunge peak",
    keywords: ["grunge", "Pearl Jam", "hip-hop", "Janet Jackson", "alternative rock"],
    definingMoments: [
      "Pearl Jam's 'Vs.' sets first-week sales records",
      "Janet Jackson's 'janet.' pushes R&B into new territory",
      "Wu-Tang Clan's 'Enter the Wu-Tang' launches a dynasty",
      "Meat Loaf's 'I'd Do Anything for Love' proves power ballads endure",
    ],
    shortDeck: "Distortion as national language.",
  },
  {
    year: 1994,
    headline: "East Coast–West Coast Tension",
    lead:
      "Hip-hop's golden age hits its most complicated chapter — the music grows bolder while the culture around it grows heavier. " +
      "Grunge and alternative keep the guitar alive on radio, and pop delivers one of the year's most unlikely comebacks with Ace of Base. " +
      "Every playlist feels like a argument about where America is headed.",
    theme: "Hip-hop complexity",
    keywords: ["hip-hop", "grunge", "East Coast rap", "pop comeback", "alternative"],
    definingMoments: [
      "Nas' 'Illmatic' — Queensbridge perfection",
      "Oasis and Blur ignite Britpop rivalry in the UK",
      "Ace of Base's 'The Sign' dominates pop radio",
      "Green Day's 'Dookie' brings punk to the mall",
    ],
    accentMood: "tension and release",
  },
  {
    year: 1995,
    headline: "Oasis vs Blur, Britpop Rises",
    lead:
      "London becomes the center of a guitar revival — Oasis and Blur turn album releases into national holidays while America answers with hip-hop and R&B in peak form. " +
      "Mariah Carey and TLC keep pop and soul intertwined, and the charts feel like a tug-of-war between British swagger and American rhythm. " +
      "Every week another anthem arrives wearing its influences like a badge.",
    theme: "Britpop explosion",
    keywords: ["Britpop", "Oasis", "Blur", "TLC", "hip-hop soul"],
    definingMoments: [
      "Oasis' 'What's the Story Morning Glory?' becomes a global event",
      "TLC's 'Waterfalls' delivers R&B with a message",
      "Mariah Carey's 'Fantasy' fuses pop and hip-hop",
      "Coolio's 'Gangsta's Paradise' dominates from the 'Dangerous Minds' soundtrack",
    ],
    shortDeck: "Britpop vs. American rhythm.",
  },
  {
    year: 1996,
    headline: "Hip-Hop Golden Year",
    lead:
      "Rap albums sit at the center of the culture — Tupac and Biggie deliver masterpieces while the tragedy of their rivalry hangs over every victory lap. " +
      "Pop stays glamorous with the Spice Girls on the horizon and Alanis Morissette proving that raw confession can outsell polish. " +
      "The year feels like hip-hop's coronation and its warning sign at the same time.",
    theme: "Hip-hop ascendant",
    keywords: ["Tupac", "Biggie", "Alanis Morissette", "hip-hop golden age", "pop confession"],
    definingMoments: [
      "2Pac's 'All Eyez on Me' — rap's double-album epic",
      "The Fugees' 'The Score' crosses hip-hop into pop",
      "Alanis Morissette's 'Jagged Little Pill' redefines confessional pop",
      "Tupac Shakur killed in Las Vegas — September 13",
    ],
    accentMood: "crown and caution",
  },
  {
    year: 1997,
    headline: "Spice Girls, Boy Band Boom",
    lead:
      "Girl power meets boy-band precision — the charts rediscover the joy of a choreographed hook and a slogan you can't stop chanting. " +
      "Hip-hop and R&B keep pushing forward with Notorious B.I.G. and Puff Daddy turning grief into anthems, while Radiohead reminds the album format it still matters. " +
      "Pop becomes a team sport again.",
    theme: "Pop factory revival",
    keywords: ["Spice Girls", "boy bands", "Notorious B.I.G.", "Radiohead", "pop revival"],
    definingMoments: [
      "Spice Girls' 'Wannabe' launches global girl-power pop",
      "Notorious B.I.G.'s 'Life After Death' released days after his murder",
      "Radiohead's 'OK Computer' redefines alternative ambition",
      "Hanson's 'MMMBop' proves teen pop can charm adults",
    ],
    shortDeck: "Choreography returns to the charts.",
  },
  {
    year: 1998,
    headline: "Teen Pop Factory Year",
    lead:
      "The Backstreet Boys and Britney Spears arrive with choreography, midriffs, and hooks engineered for maximum singalong density. " +
      "Hip-hop keeps innovating with Lauryn Hill and OutKast while rock holds its ground with Korn and the Offspring. " +
      "Every label wants a star under twenty who can sell posters and platinum in the same quarter.",
    theme: "Teen pop industrialization",
    keywords: ["Backstreet Boys", "Britney Spears", "teen pop", "Lauryn Hill", "nu-metal"],
    definingMoments: [
      "Britney Spears' '...Baby One More Time' launches a new teen-pop era",
      "Lauryn Hill's 'The Miseducation of Lauryn Hill' wins Album of the Year",
      "Monica and Brandy's 'The Boy Is Mine' defines R&B duet drama",
      "Shania Twain's 'Come On Over' becomes country-pop crossover king",
    ],
    accentMood: "factory-fresh frenzy",
  },
  {
    year: 1999,
    headline: "The Millennium Hums",
    lead:
      "Teen pop returns in force on the eve of a new century — every smash still feels like shared memory before streaming rewrote the rules. " +
      "Backstreet Boys, Britney, and Christina Aguilera own the airwaves while Eminem and Dr. Dre prepare to flip the script. " +
      "The countdown clock adds urgency to every chorus.",
    theme: "Millennium pop peak",
    keywords: ["millennium pop", "teen pop", "Eminem", "Backstreet Boys", "Britney Spears"],
    definingMoments: [
      "Backstreet Boys' 'Millennium' becomes one of the best-selling albums ever",
      "Britney Spears' debut album launches global stardom",
      "Eminem's 'The Slim Shady LP' shocks the mainstream",
      "TLC's 'No Scrubs' and Destiny's Child's 'Bills, Bills, Bills' rule R&B",
    ],
    shortDeck: "Countdown to a new century.",
    accentMood: "millennial anticipation",
  },
  {
    year: 2000,
    headline: "Napster Changes Everything",
    lead:
      "A peer-to-peer program turns every dorm room into a record store — the industry panics while listeners discover a world without waiting. " +
      "Teen pop keeps ruling the charts with Britney and NSYNC, and Eminem's 'The Marshall Mathers LP' proves controversy still sells at scale. " +
      "The year ends with Y2K relief and the quiet beginning of music's biggest disruption.",
    theme: "Digital disruption begins",
    keywords: ["Napster", "Eminem", "teen pop", "digital piracy", "Y2K"],
    definingMoments: [
      "Napster peaks with millions of users sharing MP3s",
      "Eminem's 'The Marshall Mathers LP' breaks sales records",
      "Britney Spears' 'Oops!... I Did It Again' dominates pop",
      "U2's 'All That You Can't Leave Behind' returns rock to relevance",
    ],
    accentMood: "free-for-all energy",
  },
  {
    year: 2001,
    headline: "Post-9/11 Soundtrack",
    lead:
      "The world changes in September and the charts carry songs people cling to when language fails — comfort, rage, and unity arrive in three-minute doses. " +
      "Alicia Keys and Destiny's Child keep R&B luminous while rock and country answer with anthems sized for healing. " +
      "Music becomes something people need, not just something they want.",
    theme: "Healing through song",
    keywords: ["9/11", "Alicia Keys", "comfort pop", "country anthems", "unity songs"],
    definingMoments: [
      "September 11 attacks reshape the cultural landscape",
      "Alicia Keys' 'Songs in A Minor' launches a neo-soul era",
      "Enya's 'Only Time' becomes an unexpected comfort anthem",
      "Destiny's Child's 'Survivor' channels resilience",
    ],
    shortDeck: "Songs when words fail.",
    accentMood: "grief and resolve",
  },
  {
    year: 2002,
    headline: "Eminem's Dominance",
    lead:
      "Marshall Mathers owns the conversation — hip-hop, pop, and rock all react to an artist who treats controversy like a sport and wordplay like a weapon. " +
      "Avril Lavigne and Ashanti bring fresh faces to pop and R&B while the industry starts grappling with what downloads mean for the bottom line. " +
      "Every hit feels like it's competing for attention in a louder, faster world.",
    theme: "Hip-hop hegemony",
    keywords: ["Eminem", "Avril Lavigne", "Ashanti", "hip-hop", "early 2000s pop"],
    definingMoments: [
      "Eminem's 'The Eminem Show' dominates global charts",
      "Avril Lavigne's 'Complicated' launches pop-punk princess era",
      "Ashanti's debut makes her the first female artist with simultaneous No. 1 single and album",
      "Nelly's 'Hot in Herre' and 'Dilemma' own the summer",
    ],
  },
  {
    year: 2003,
    headline: "iTunes Store Opens",
    lead:
      "Apple sells songs for ninety-nine cents and the industry discovers that convenience might save what piracy threatened — the single makes a comeback in digital form. " +
      "Beyoncé goes solo, 50 Cent conquers the charts, and OutKast deliver an album too weird and wonderful to ignore. " +
      "The download era begins in earnest.",
    theme: "Legal digital downloads",
    keywords: ["iTunes Store", "Beyoncé", "50 Cent", "OutKast", "digital music"],
    definingMoments: [
      "Apple iTunes Store launches — April 28",
      "Beyoncé's 'Dangerously in Love' launches solo superstardom",
      "50 Cent's 'Get Rich or Die Tryin'' dominates hip-hop",
      "OutKast's 'Speakerboxxx/The Love Below' wins Album of the Year",
    ],
    shortDeck: "Ninety-nine cents changes everything.",
    accentMood: "convenience revolution",
  },
  {
    year: 2004,
    headline: "Usher and Alicia Rule",
    lead:
      "R&B returns to the throne with precision and swagger — Usher's 'Confessions' and Alicia Keys' 'Diary' turn personal drama into national choreography. " +
      "Green Day's 'American Idiot' reminds rock it still has something to say, while Kanye West announces himself as a producer who thinks like an artist. " +
      "The charts feel like a conversation between the club, the couch, and the conscience.",
    theme: "R&B renaissance",
    keywords: ["Usher", "Alicia Keys", "R&B", "Kanye West", "Green Day"],
    definingMoments: [
      "Usher's 'Confessions' becomes a decade-defining R&B album",
      "Alicia Keys' 'If I Ain't Got You' and 'Diary' dominate",
      "Green Day's 'American Idiot' revives punk ambition",
      "Kanye West's 'The College Dropout' launches a new hip-hop era",
    ],
  },
  {
    year: 2005,
    headline: "Katrina, Live 8, Crunk Peak",
    lead:
      "Charity concerts and disaster headlines share the year with crunk anthems that rattle car windows from Atlanta to everywhere. " +
      "Mariah Carey completes one of the greatest comebacks in pop history while Kanye West tells truth to power on live television. " +
      "The year feels like a collision between conscience and bass.",
    theme: "Conscience meets crunk",
    keywords: ["Live 8", "Hurricane Katrina", "Mariah Carey", "crunk", "Kanye West"],
    definingMoments: [
      "Live 8 concerts — July 2 global charity event",
      "Hurricane Katrina — August, cultural reckoning in hip-hop and R&B",
      "Mariah Carey's 'The Emancipation of Mimi' completes her comeback",
      "Kanye West's 'Gold Digger' and 'Late Registration' dominate",
    ],
    shortDeck: "Charity, disaster, and bass.",
    accentMood: "conscience and subwoofers",
  },
  {
    year: 2006,
    headline: "MySpace Discovery Era",
    lead:
      "Social networks become talent scouts — unknown artists build fanbases in comment sections while the industry tries to figure out who discovered whom. " +
      "Justin Timberlake goes solo, Beyoncé's 'B'Day' arrives like a fireworks show, and Shakira proves global pop still has room for surprise. " +
      "The path to a hit starts looking less like a ladder and more like a web.",
    theme: "Social media discovery",
    keywords: ["MySpace", "Justin Timberlake", "Beyoncé", "social media", "pop R&B"],
    definingMoments: [
      "MySpace becomes a primary artist discovery platform",
      "Justin Timberlake's 'FutureSex/LoveSounds' redefines pop production",
      "Beyoncé's 'B'Day' and 'Irreplaceable' dominate",
      "Shakira's 'Hips Don't Lie' becomes a global summer anthem",
    ],
  },
  {
    year: 2007,
    headline: "iPhone Year, Ringtone Hits",
    lead:
      "The iPhone arrives and suddenly everyone carries a screen that could change how they discover music — ringtones and digital snippets become their own economy. " +
      "Kanye vs 50 Cent on release day turns album drops into sporting events, while Amy Winehouse and Rihanna redefine what soul and pop can look like. " +
      "The single gets shorter attention and bigger impact.",
    theme: "Mobile music era",
    keywords: ["iPhone", "Kanye West", "Rihanna", "Amy Winehouse", "ringtone era"],
    definingMoments: [
      "Apple iPhone launches — June 29",
      "Kanye West's 'Graduation' vs 50 Cent's 'Curtis' release-day showdown",
      "Amy Winehouse's 'Back to Black' revives soul for a new generation",
      "Rihanna's 'Umbrella' begins her pop dynasty",
    ],
    accentMood: "pocket-sized revolution",
  },
  {
    year: 2008,
    headline: "Digital Singles Reshape the Climb",
    lead:
      "The download era accelerates how hits rise and fall — the velocity changes, but a great song still stops the room. " +
      "Beyoncé's 'Single Ladies' becomes a choreography phenomenon while Lil Wayne proves mixtape culture can crown a king. " +
      "The charts move faster, but the emotional stakes feel the same.",
    theme: "Digital velocity",
    keywords: ["digital singles", "Beyoncé", "Lil Wayne", "iTunes", "pop choreography"],
    definingMoments: [
      "Beyoncé's 'Single Ladies' becomes a global dance phenomenon",
      "Lil Wayne's 'Tha Carter III' sells a million in a week",
      "Coldplay's 'Viva la Vida' tops charts worldwide",
      "Katy Perry's 'I Kissed a Girl' launches pop stardom",
    ],
    shortDeck: "Hits move faster now.",
    accentMood: "accelerated ascent",
  },
  {
    year: 2009,
    headline: "Lady Gaga Arrives",
    lead:
      "A pop artist treats fame like performance art — costumes, hooks, and provocation arrive in the same package and the world can't look away. " +
      "Taylor Swift and Beyoncé keep country-pop and R&B at the center while Michael Jackson's death sends the catalog streaming in grief. " +
      "The year proves that spectacle and substance still share a stage.",
    theme: "Pop as performance art",
    keywords: ["Lady Gaga", "Taylor Swift", "Michael Jackson", "pop spectacle", "country pop"],
    definingMoments: [
      "Lady Gaga's 'The Fame Monster' and 'Bad Romance' redefine pop",
      "Taylor Swift's 'Fearless' wins Album of the Year",
      "Michael Jackson dies — June 25, catalog surges globally",
      "Beyoncé's 'Single Ladies' video wins MTV Video of the Year",
    ],
    accentMood: "art-pop provocation",
  },
  {
    year: 2010,
    headline: "Spotify Launches in the US",
    lead:
      "Streaming crosses the Atlantic and the idea of owning music starts to feel optional — access replaces the shelf, and playlists replace the album stack. " +
      "Kanye's 'My Beautiful Dark Twisted Fantasy' and Adele's '21' prove that event albums still matter even as singles accelerate. " +
      "The industry begins its longest reinvention.",
    theme: "Streaming era begins",
    keywords: ["Spotify", "Kanye West", "Adele", "streaming", "playlist era"],
    definingMoments: [
      "Spotify launches in the United States — July",
      "Kanye West's 'My Beautiful Dark Twisted Fantasy' receives universal acclaim",
      "Lady Gaga's 'Bad Romance' and 'Telephone' dominate pop",
      "Eminem's 'Recovery' becomes the best-selling album of the year",
    ],
    shortDeck: "Access replaces ownership.",
  },
  {
    year: 2011,
    headline: "Adele's Comeback Year",
    lead:
      "One voice and a heartbreak album stop the entire industry — Adele's '21' proves that old-fashioned songwriting still wins when the emotion is real. " +
      "Kanye and Jay-Z's 'Watch the Throne' keeps hip-hop ambitious while LMFAO and Pitbull turn the club into a global export. " +
      "The year feels like a tug-of-war between depth and distraction.",
    theme: "Soul revival via Adele",
    keywords: ["Adele", "21", "Watch the Throne", "club pop", "singer-songwriter"],
    definingMoments: [
      "Adele's '21' becomes a global phenomenon — 'Rolling in the Deep', 'Someone Like You'",
      "Kanye West and Jay-Z's 'Watch the Throne' unites hip-hop royalty",
      "Amy Winehouse dies — July 23, soul revival tinged with loss",
      "LMFAO's 'Party Rock Anthem' dominates dance floors",
    ],
    accentMood: "heartbreak at scale",
  },
  {
    year: 2012,
    headline: "Gangnam Style Goes Global",
    lead:
      "A Korean pop song breaks YouTube and the world discovers that virality doesn't need a translation — the hook is the language. " +
      "Gotye and fun. deliver unlikely omnipresent singles while Frank Ocean quietly rewires R&B's future. " +
      "The global chart becomes a real thing, not a marketing fantasy.",
    theme: "Global viral pop",
    keywords: ["Gangnam Style", "K-pop", "Gotye", "Frank Ocean", "viral hits"],
    definingMoments: [
      "PSY's 'Gangnam Style' becomes first YouTube video to hit 1 billion views",
      "Gotye's 'Somebody That I Used to Know' dominates global charts",
      "Frank Ocean's 'Channel Orange' redefines R&B",
      "fun.'s 'We Are Young' becomes an anthem",
    ],
    shortDeck: "Virality needs no translation.",
  },
  {
    year: 2013,
    headline: "Streaming Starts Winning",
    lead:
      "The numbers tilt — streaming revenue begins its climb while album sales keep sliding, and artists start thinking in terms of playlists instead of gatefolds. " +
      "Daft Punk's 'Get Lucky' and Lorde's 'Royals' prove that retro gloss and teenage truth can both own the summer. " +
      "Miley Cyrus and Robin Thicke ignite a culture-war conversation about what pop is allowed to show.",
    theme: "Streaming tipping point",
    keywords: ["streaming", "Daft Punk", "Lorde", "Miley Cyrus", "pop controversy"],
    definingMoments: [
      "Streaming revenue growth accelerates industry-wide",
      "Daft Punk's 'Random Access Memories' and 'Get Lucky' dominate",
      "Lorde's 'Pure Heroine' and 'Royals' redefine teen pop",
      "Jay-Z's 'Magna Carta Holy Grail' Samsung deal disrupts release models",
    ],
    accentMood: "playlist thinking",
  },
  {
    year: 2014,
    headline: "Uptown Funk Summer",
    lead:
      "Mark Ronson and Bruno Mars deliver the year's most impossible-not-to-move single — a time-machine funk pastiche that feels both vintage and brand new. " +
      "Beyoncé's visual album changed the release conversation while Taylor Swift's '1989' completed her pop transformation. " +
      "Every party, wedding, and sports arena shares the same groove.",
    theme: "Retro-funk pop dominance",
    keywords: ["Uptown Funk", "Bruno Mars", "Taylor Swift", "Beyoncé", "pop funk"],
    definingMoments: [
      "Mark Ronson ft. Bruno Mars' 'Uptown Funk' dominates the year",
      "Taylor Swift's '1989' completes her pop crossover",
      "Beyoncé's '***Flawless' and visual era continue",
      "Sam Smith's 'Stay with Me' brings soul-pop to the Grammys",
    ],
    shortDeck: "One groove, every party.",
  },
  {
    year: 2015,
    headline: "Streaming Overtakes Downloads",
    lead:
      "The industry crosses a line — streaming revenue surpasses downloads in the U.S., and every artist starts optimizing for the skip button and the repeat. " +
      "Adele's '25' defies the trend by selling records like it's 1999, while Drake and The Weeknd make mood the primary product. " +
      "The album isn't dead, but it's negotiating for its life.",
    theme: "Streaming supremacy",
    keywords: ["streaming", "Adele", "Drake", "The Weeknd", "album sales"],
    definingMoments: [
      "U.S. streaming revenue overtakes downloads",
      "Adele's '25' sells 3.38 million copies in first week",
      "Drake's 'Hotline Bling' becomes a cultural meme",
      "The Weeknd's 'Can't Feel My Face' and 'The Hills' dominate pop",
    ],
    accentMood: "mood over format",
  },
  {
    year: 2016,
    headline: "Streaming Becomes Default",
    lead:
      "Listening means opening an app — ownership is nostalgia, and the playlist is the new album for most of the country. " +
      "Beyoncé's 'Lemonade' turns a visual album into a cultural event while Drake's 'Views' proves streaming numbers can dwarf everything that came before. " +
      "Prince's death sends his catalog into the purple sky.",
    theme: "App-native listening",
    keywords: ["streaming default", "Beyoncé", "Lemonade", "Drake", "Prince"],
    definingMoments: [
      "Beyoncé's 'Lemonade' visual album — April 23 HBO premiere",
      "Drake's 'Views' breaks streaming records",
      "Prince dies — April 21, catalog surges",
      "Rihanna's 'Anti' and 'Work' redefine pop minimalism",
    ],
    shortDeck: "The app is the turntable.",
  },
  {
    year: 2017,
    headline: "Despacito Summer",
    lead:
      "A Spanish-language reggaeton single owns the American summer — proof that the Hot 100 finally reflects how the hemisphere actually listens. " +
      "Kendrick Lamar's 'DAMN.' wins a Pulitzer while Cardi B begins her ascent from reality TV to rap royalty. " +
      "Genre, language, and platform all feel like suggestions instead of rules.",
    theme: "Latin pop crossover",
    keywords: ["Despacito", "Latin pop", "Kendrick Lamar", "Cardi B", "reggaeton"],
    definingMoments: [
      "Luis Fonsi and Daddy Yankee's 'Despacito' ties longest-running No. 1 in Hot 100 history",
      "Kendrick Lamar's 'DAMN.' wins Pulitzer Prize for Music",
      "Cardi B's 'Bodak Yellow' hits No. 1",
      "Ed Sheeran's 'Shape of You' and 'Perfect' dominate pop",
    ],
    accentMood: "hemisphere-wide groove",
  },
  {
    year: 2018,
    headline: "Drake's Record Year",
    lead:
      "One artist floods the charts with sheer volume and precision — streaming rewards consistency and Drake plays the algorithm like an instrument. " +
      "K-pop steps further into the American spotlight while Travis Scott and Cardi B keep hip-hop at the center of culture. " +
      "The year feels like a masterclass in staying omnipresent.",
    theme: "Streaming-era dominance",
    keywords: ["Drake", "K-pop", "Travis Scott", "Cardi B", "streaming records"],
    definingMoments: [
      "Drake breaks Billboard Hot 100 records for most entries in a year",
      "BTS crosses into U.S. mainstream consciousness",
      "Travis Scott's 'SICKO MODE' and 'Astroworld' dominate",
      "Cardi B's 'Invasion of Privacy' wins Best Rap Album Grammy",
    ],
  },
  {
    year: 2019,
    headline: "Old Town Road Phenomenon",
    lead:
      "Lil Nas X turns a meme into a marathon — a country-trap hybrid that refuses to leave the No. 1 spot and rewrite every rule about genre labels. " +
      "Billie Eilish and Lizzo arrive with distinct visions while Taylor Swift and Ariana Grande keep pop's center well-defended. " +
      "Virality and artistry share the crown.",
    theme: "Genreless viral pop",
    keywords: ["Old Town Road", "Lil Nas X", "Billie Eilish", "Lizzo", "genre blur"],
    definingMoments: [
      "Lil Nas X's 'Old Town Road' sets record for longest reign at No. 1 — 19 weeks",
      "Billie Eilish's 'When We All Fall Asleep, Where Do We Go?' sweeps Grammys",
      "Lizzo's 'Truth Hurts' becomes a empowerment anthem",
      "BTS and K-pop fandom reshape global chart dynamics",
    ],
    shortDeck: "Meme to marathon at No. 1.",
    accentMood: "genreless joy",
  },
  {
    year: 2020,
    headline: "Pandemic Playlists",
    lead:
      "The world stays home and music becomes lifeline — comfort streams, livestream concerts, and the songs people loop while the news gets heavy. " +
      "The Weeknd's 'Blinding Lights' provides neon escape while Megan Thee Stallion and Cardi B deliver the year's most talked-about collaboration. " +
      "Every playlist feels personal because everyone is living through the same emergency separately.",
    theme: "Lockdown listening",
    keywords: ["pandemic", "The Weeknd", "Megan Thee Stallion", "streaming comfort", "livestream concerts"],
    definingMoments: [
      "COVID-19 pandemic reshapes live music and listening habits",
      "The Weeknd's 'Blinding Lights' becomes one of the biggest songs ever",
      "Megan Thee Stallion's 'Savage' remix with Beyoncé dominates",
      "Taylor Swift's 'folklore' and 'evermore' redefine quarantine album drops",
    ],
    accentMood: "solitary togetherness",
  },
  {
    year: 2021,
    headline: "TikTok Breakouts",
    lead:
      "Fifteen-second clips crown kings — songs blow up because a dance challenge caught fire, and labels scramble to sign what the algorithm already anointed. " +
      "Olivia Rodrigo channels teenage heartbreak into the year's defining debut while Kanye, Drake, and Adele remind everyone that event albums still land. " +
      "Discovery feels democratic and chaotic at the same time.",
    theme: "TikTok as hitmaker",
    keywords: ["TikTok", "Olivia Rodrigo", "viral songs", "Drake", "Adele"],
    definingMoments: [
      "Olivia Rodrigo's 'drivers license' and 'SOUR' define the year",
      "Silk Sonic (Bruno Mars and Anderson .Paak) revive retro R&B",
      "Adele's '30' and 'Easy on Me' break streaming records",
      "Morgan Wallen dominates country streaming despite controversy",
    ],
    shortDeck: "Fifteen seconds to stardom.",
  },
  {
    year: 2022,
    headline: "Harry's House Summer",
    lead:
      "Harry Styles fills stadiums with warmth and charm — pop that feels handmade even at arena scale, and the summer belongs to 'As It Was' on repeat. " +
      "Beyoncé's 'Renaissance' turns the dance floor into a history lesson while Bad Bunny keeps Spanish-language pop at the absolute center. " +
      "The year feels like a exhale after the lockdown years.",
    theme: "Post-lockdown pop joy",
    keywords: ["Harry Styles", "Beyoncé", "Bad Bunny", "Renaissance", "summer pop"],
    definingMoments: [
      "Harry Styles' 'Harry's House' and 'As It Was' dominate",
      "Beyoncé's 'Renaissance' celebrates dance music's Black roots",
      "Bad Bunny's 'Un Verano Sin Ti' tops year-end charts",
      "Kate Bush's 'Running Up That Hill' revives via 'Stranger Things'",
    ],
    accentMood: "sunlit release",
  },
  {
    year: 2023,
    headline: "Barbie Soundtrack Moment",
    lead:
      "A pink movie becomes a playlist event — 'Barbie' proves that soundtracks can still own the cultural calendar when the songs match the spectacle. " +
      "Taylor Swift's 'Eras Tour' turns catalog into a stadium phenomenon while SZA and Miley Cyrus deliver year-defining singles. " +
      "Pop feels bigger, pinker, and more communal than it has in years.",
    theme: "Soundtrack and spectacle",
    keywords: ["Barbie soundtrack", "Taylor Swift", "Eras Tour", "SZA", "pop spectacle"],
    definingMoments: [
      "Barbie soundtrack — 'Dance the Night', 'What Was I Made For?'",
      "Taylor Swift's Eras Tour becomes a global economic event",
      "Miley Cyrus' 'Flowers' and SZA's 'Kill Bill' dominate",
      "Tracy Chapman's 'Fast Car' returns via Luke Combs duet at Grammys",
    ],
    shortDeck: "Pink spectacle, shared playlist.",
  },
  {
    year: 2024,
    headline: "Beyoncé Country Pivot",
    lead:
      "Cowboy Carter rewrites the conversation about genre ownership — Beyoncé claims country and Americana as Black music history, and the charts pay attention. " +
      "Taylor Swift's 'Tortured Poets Department' keeps event-album culture alive while Kendrick Lamar's feud with Drake turns diss tracks into national news. " +
      "The year feels like artists arguing over who gets to tell America's story.",
    theme: "Genre reclamation",
    keywords: ["Beyoncé", "Cowboy Carter", "Taylor Swift", "Kendrick Lamar", "country pop"],
    definingMoments: [
      "Beyoncé's 'Cowboy Carter' reclaims country music's Black roots",
      "Taylor Swift's 'The Tortured Poets Department' breaks streaming records",
      "Kendrick Lamar's 'Not Like Us' dominates the Drake feud",
      "Chappell Roan's 'Good Luck, Babe!' launches a new pop star",
    ],
    accentMood: "territory reclaimed",
  },
  {
    year: 2025,
    headline: "Catalog Meets the Algorithm",
    lead:
      "Streaming's second decade settles into a rhythm — legacy artists compete with TikTok-born breakouts for the same playlist slots, and every week feels like a rematch. " +
      "The charts move at algorithm speed while live music keeps setting records, proving that people still want to be in the room when the chorus hits. " +
      "The story stays human even when the math gets complicated.",
    theme: "Algorithm-era equilibrium",
    keywords: ["streaming", "TikTok discovery", "live music", "catalog revival", "pop evolution"],
    definingMoments: [
      "Legacy catalog and new releases compete equally on streaming charts",
      "Live concert revenue continues record-setting growth post-pandemic",
      "TikTok-driven breakouts reshape label signing strategy",
      "Global pop crossovers blur language and genre boundaries further",
    ],
    shortDeck: "Legacy and virality share the dial.",
    accentMood: "perpetual rediscovery",
  },
];
