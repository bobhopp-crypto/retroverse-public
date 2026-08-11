# VirtualDJ Library Coverage

Generated: 2026-08-11T18:09:30.810Z
Source: /Users/bobhopp/Library/Application Support/VirtualDJ/database.xml

## Reconciliation

- Original inventory path records: **13,292**
- Raw XML video records: **13294**
- Raw XML unique path records: **13292**
- Raw XML duplicate references: **2**
- Parsed video-extension database records: **13292**
- Records under the actual VIDEO root: **8872**
- Unique existing physical VIDEO files: **8829**
- Duplicate VDJ references removed: **2**
- Missing/stale VIDEO-root references: **43**
- Existing records outside the actual VIDEO root: **4420**

The corrected denominator is **8829** current existing physical files under /Users/bobhopp/DJ MEDIA/VIDEO/. This is two below the VirtualDJ UI reference of 8,832; the current filesystem scan found 8,830 files, while the database has 8,874 VIDEO-root references including 42 stale references and two duplicate records. The remaining two-file difference cannot be reconciled from the current database/filesystem snapshot alone and should be checked against the VirtualDJ UI's inclusion rules or refresh timing.

## Coverage totals

- Canonical identity: {"unresolved":3719,"resolved":5110}
- Year source: {"vdj_fallback":4031,"canonical/trusted":4788,"unknown":7,"trusted_package":3}
- Story: {"MISSING":7996,"READY":760,"PARTIAL":73}
- Hero: {"VIDEO_AVAILABLE_HERO_NOT_PREPARED":8079,"PREPARED_VIDEO_HERO":750}
- Chart Journey: {"UNAVAILABLE":4041,"AVAILABLE":4788}
- Preparation: {"UNRESOLVED_IDENTITY":3719,"READY":749,"NEEDS_HERO_AND_STORY":4287,"NEEDS_HERO":73,"NEEDS_STORY":1}

Percentages use 8829 as the denominator. Canonical/trusted year: 4788 (54.2%); VDJ fallback: 4031 (45.7%); unknown: 7 (0.1%).

## Top contributing folders

- 1916: /Users/bobhopp/DJ MEDIA/VIDEO/1980's
- 1309: /Users/bobhopp/DJ MEDIA/VIDEO/1970's
- 1292: /Users/bobhopp/DJ MEDIA/VIDEO/2010's
- 1241: /Users/bobhopp/DJ MEDIA/VIDEO/1990's
- 1077: /Users/bobhopp/DJ MEDIA/VIDEO/2000's
- 814: /Users/bobhopp/DJ MEDIA/VIDEO/1960's
- 435: /Users/bobhopp/DJ MEDIA/VIDEO/TECHNO
- 333: /Users/bobhopp/DJ MEDIA/VIDEO/COUNTRY/FILL
- 306: /Users/bobhopp/DJ MEDIA/VIDEO/2020's
- 99: /Users/bobhopp/DJ MEDIA/VIDEO/1950's
- 1: /Users/bobhopp/DJ MEDIA/VIDEO/1980's/00.06.10.000-Ashford & Simpson 
- 1: /Users/bobhopp/DJ MEDIA/VIDEO/1980's/00.31.44.000-Thompson Twins / Steve Stevens / Nile Rodgers 
- 1: /Users/bobhopp/DJ MEDIA/VIDEO/1980's/00.45.20.000-Hall & Oates / Eddie Kendricks 
- 1: /Users/bobhopp/DJ MEDIA/VIDEO/1980's/00.49.31.000-Elton John 
- 1: /Users/bobhopp/DJ MEDIA/VIDEO/1980's/00.55.09.000-Elton John 
- 1: /Users/bobhopp/DJ MEDIA/VIDEO/1980's/01.07.09.000-Mick Jagger / Tina Turner - State Of Shock 
- 1: /Users/bobhopp/DJ MEDIA/VIDEO/1980's/01.12.06.000-Bob Dylan / Keith Richards 

## Major library folders / decades

- 1950s: 99
- 1960s: 814
- 1970s: 1309
- 1980s: 1923
- 1990s: 1241
- 2000s: 1077
- 2010s: 1292
- 2020s: 306
- other: 768

## Validation sample: 20 real tracks

- Andrews Sisters — Boogie Woogie Bugle Boy: unresolved; UNRESOLVED_IDENTITY; hero=VIDEO_AVAILABLE_HERO_NOT_PREPARED; story=MISSING; year=1944 (vdj_fallback); chart=UNAVAILABLE
- Animation — Vintage Banned Cartoons: unresolved; UNRESOLVED_IDENTITY; hero=VIDEO_AVAILABLE_HERO_NOT_PREPARED; story=MISSING; year=1950 (vdj_fallback); chart=UNAVAILABLE
- Big Band — Rhapsody in Blue: unresolved; UNRESOLVED_IDENTITY; hero=VIDEO_AVAILABLE_HERO_NOT_PREPARED; story=MISSING; year=1948 (vdj_fallback); chart=UNAVAILABLE
- Big Bopper — Chantilly Lace: RVTR952686; READY; hero=PREPARED_VIDEO_HERO; story=READY; year=1958 (canonical/trusted); chart=AVAILABLE
- Bill Haley — Lets Rip It Up: unresolved; UNRESOLVED_IDENTITY; hero=VIDEO_AVAILABLE_HERO_NOT_PREPARED; story=MISSING; year=1957 (vdj_fallback); chart=UNAVAILABLE
- Bill Haley & His Comets — Rock Around The Clock: unresolved; UNRESOLVED_IDENTITY; hero=VIDEO_AVAILABLE_HERO_NOT_PREPARED; story=MISSING; year=1955 (vdj_fallback); chart=UNAVAILABLE
- Billie Davis — I Want You To Be My Baby: unresolved; UNRESOLVED_IDENTITY; hero=VIDEO_AVAILABLE_HERO_NOT_PREPARED; story=MISSING; year=1953 (vdj_fallback); chart=UNAVAILABLE
- Bo Diddley — Please Mr. Engineer: RVTR083367; NEEDS_HERO_AND_STORY; hero=VIDEO_AVAILABLE_HERO_NOT_PREPARED; story=MISSING; year=1959 (vdj_fallback); chart=UNAVAILABLE
- Bobby Darin — Queen Of The Hop: RVTR740400; NEEDS_HERO_AND_STORY; hero=VIDEO_AVAILABLE_HERO_NOT_PREPARED; story=MISSING; year=1958 (canonical/trusted); chart=AVAILABLE
- Buddy Holly — Not Fade Away and Peggy Sue: unresolved; UNRESOLVED_IDENTITY; hero=VIDEO_AVAILABLE_HERO_NOT_PREPARED; story=MISSING; year=1956 (vdj_fallback); chart=UNAVAILABLE
- Cab Calloway — Minnie the Moocher (Blue Brothers): unresolved; UNRESOLVED_IDENTITY; hero=VIDEO_AVAILABLE_HERO_NOT_PREPARED; story=MISSING; year=1980 (vdj_fallback); chart=UNAVAILABLE
- Cab Calloway — St. James Infirmary Blues: RVTR160225; NEEDS_HERO_AND_STORY; hero=VIDEO_AVAILABLE_HERO_NOT_PREPARED; story=MISSING; year=1933 (vdj_fallback); chart=UNAVAILABLE
- Cab Calloway and the Nicholas Brothers — Jumpin Jive: unresolved; UNRESOLVED_IDENTITY; hero=VIDEO_AVAILABLE_HERO_NOT_PREPARED; story=MISSING; year=2006 (vdj_fallback); chart=UNAVAILABLE
- Carl Perkins — Blue Suede Shoes: unresolved; UNRESOLVED_IDENTITY; hero=VIDEO_AVAILABLE_HERO_NOT_PREPARED; story=MISSING; year=1956 (vdj_fallback); chart=UNAVAILABLE
- Carl Perkins — Glad All Over: unresolved; UNRESOLVED_IDENTITY; hero=VIDEO_AVAILABLE_HERO_NOT_PREPARED; story=MISSING; year=1957 (vdj_fallback); chart=UNAVAILABLE
- Chords — Sh-Boom: unresolved; UNRESOLVED_IDENTITY; hero=VIDEO_AVAILABLE_HERO_NOT_PREPARED; story=MISSING; year=1954 (vdj_fallback); chart=UNAVAILABLE
- Chuck Berry — Johnny B. Goode (Back to the Future): RVTR979650; NEEDS_HERO_AND_STORY; hero=VIDEO_AVAILABLE_HERO_NOT_PREPARED; story=MISSING; year=1958 (canonical/trusted); chart=AVAILABLE
- Chuck Berry — Memphis Tennessee: unresolved; UNRESOLVED_IDENTITY; hero=VIDEO_AVAILABLE_HERO_NOT_PREPARED; story=MISSING; year=1959 (vdj_fallback); chart=UNAVAILABLE
- Chuck Berry — School Days: unresolved; UNRESOLVED_IDENTITY; hero=VIDEO_AVAILABLE_HERO_NOT_PREPARED; story=MISSING; year=1957 (vdj_fallback); chart=UNAVAILABLE
- Chuck Berry — You Can't Catch Me: RVTR937487; NEEDS_HERO_AND_STORY; hero=VIDEO_AVAILABLE_HERO_NOT_PREPARED; story=MISSING; year=1956 (vdj_fallback); chart=UNAVAILABLE

## Approved prototype songs

- Nancy Sinatra — These Boots Are Made For Walking: RVTR251858; NEEDS_STORY; hero=PREPARED_VIDEO_HERO; story=MISSING; year=1966; chart=AVAILABLE
- Paul Simon — Graceland & You Can Call Me Al: RVTR285085; READY; hero=PREPARED_VIDEO_HERO; story=READY; year=1986; chart=AVAILABLE
- Paul Simon — You Can Call Me Al: RVTR285085; READY; hero=PREPARED_VIDEO_HERO; story=READY; year=1986; chart=AVAILABLE
- Gladys Knight & The Pips — The Best Thing That Ever Happened: unresolved; UNRESOLVED_IDENTITY; hero=VIDEO_AVAILABLE_HERO_NOT_PREPARED; story=MISSING; year=1974; chart=UNAVAILABLE

## Prototype reconciliation

- Paul Simon — You Can Call Me Al: in corrected VIDEO inventory, in corrected VIDEO inventory
- Benny Benassi — Spaceship: excluded: outside VIDEO root
- Gladys Knight & The Pips — The Best Thing That Ever Happened: in corrected VIDEO inventory, excluded: outside VIDEO root, excluded: outside VIDEO root
- Nancy Sinatra — These Boots Are Made for Walkin’: in corrected VIDEO inventory
- Clean Bandit feat. Ellie Goulding — Mama: excluded: outside VIDEO root

Identity resolution is exact-label-only in this inventory; unresolved records are not fuzzy matched. No stories or video frames were generated.
