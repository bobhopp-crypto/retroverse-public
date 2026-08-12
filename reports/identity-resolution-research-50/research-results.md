# Research-Backed Identity Resolution — Same 50

Research duration: 80595 ms; average: 1612 ms/track. External API cost: not measurable from local tooling; no paid model/API usage was invoked.

## Results

- AUTO_RESOLVED_RESEARCH: 0
- AUTO_RESOLVED_NO_CHART: 0
- AUTO_RESOLVED_VERSION: 0
- AUTO_RESOLVED_MULTI_SONG: 0
- CANONICAL_CREATION_REQUIRED: 0
- HUMAN_REVIEW_REQUIRED: 49
- NO_MATCH: 1
- CONFLICT: 0
- BLOCKED: 0

Automatic resolutions were manually audited against the conservative rule: exact independent MusicBrainz artist/title result + existing canonical candidate + no detected version marker. Version, multi-song, and conflicting/no-exact-result cases remain human review.

## Track ledger

| VDJ artist | VDJ title | Previous V2 | Research result | Human review | Sources |
|---|---|---|---|---:|---:|
| Andrews Sisters | Boogie Woogie Bugle Boy | NO_CHART_MATCH | HUMAN_REVIEW_REQUIRED | yes | 1 |
| Animation | Vintage Banned Cartoons | VERSION_REVIEW | HUMAN_REVIEW_REQUIRED | yes | 1 |
| Big Band | Rhapsody In Blue | NO_CHART_MATCH | HUMAN_REVIEW_REQUIRED | yes | 1 |
| Bill Haley | Lets Rip It Up | NO_CHART_MATCH | HUMAN_REVIEW_REQUIRED | yes | 1 |
| bill haley and his comets | Rock Around The Clock | VERSION_REVIEW | HUMAN_REVIEW_REQUIRED | yes | 1 |
| Billie Davis | I Want You To Be My Baby | NO_CHART_MATCH | HUMAN_REVIEW_REQUIRED | yes | 1 |
| buddy holly | Not Fade Away And Peggy Sue | MULTI_SONG_CANDIDATE | HUMAN_REVIEW_REQUIRED | yes | 1 |
| cab calloway | Minnie The Moocher Blue Brothers | VERSION_REVIEW | HUMAN_REVIEW_REQUIRED | yes | 1 |
| Cab Calloway and the Nicholas Brothers | Jumpin Jive | VERSION_REVIEW | HUMAN_REVIEW_REQUIRED | yes | 1 |
| carl perkins | Blue Suede Shoes | NO_CHART_MATCH | HUMAN_REVIEW_REQUIRED | yes | 1 |
| carl perkins | Glad All Over | NO_CHART_MATCH | HUMAN_REVIEW_REQUIRED | yes | 1 |
| Chords | Sh Boom | VERSION_REVIEW | HUMAN_REVIEW_REQUIRED | yes | 1 |
| chuck berry | Memphis Tennessee | VERSION_REVIEW | HUMAN_REVIEW_REQUIRED | yes | 1 |
| chuck berry | School Days | NO_CHART_MATCH | HUMAN_REVIEW_REQUIRED | yes | 1 |
| coasters | Down In Mexico | VERSION_REVIEW | HUMAN_REVIEW_REQUIRED | yes | 1 |
| (missing) | (missing) | NO_MATCH | NO_MATCH | yes | 0 |
| duane eddy | Rebel Rouser | VERSION_REVIEW | HUMAN_REVIEW_REQUIRED | yes | 1 |
| eddie cochran | Twenty Flight Rock | NO_CHART_MATCH | HUMAN_REVIEW_REQUIRED | yes | 1 |
| eddy arnold | Cattle Call | VERSION_REVIEW | HUMAN_REVIEW_REQUIRED | yes | 1 |
| elvis presley | Jailhouse Rock | VERSION_REVIEW | HUMAN_REVIEW_REQUIRED | yes | 1 |
| elvis presley | Peace In The Valley | NO_CHART_MATCH | HUMAN_REVIEW_REQUIRED | yes | 1 |
| Frank Sinatra | Come Fly With Me BW | NO_CHART_MATCH | HUMAN_REVIEW_REQUIRED | yes | 1 |
| Frank Sinatra | Come Fly With Me | NO_CHART_MATCH | HUMAN_REVIEW_REQUIRED | yes | 1 |
| frank sinatra | Fly Me To The Moon | NO_CHART_MATCH | HUMAN_REVIEW_REQUIRED | yes | 1 |
| Glenn Miller | At Last | VERSION_REVIEW | HUMAN_REVIEW_REQUIRED | yes | 1 |
| Glenn Miller | Chattanooga Choo Choo 1941 | NO_CHART_MATCH | HUMAN_REVIEW_REQUIRED | yes | 1 |
| Glenn Miller | Chattanooga Choo Choo | NO_CHART_MATCH | HUMAN_REVIEW_REQUIRED | yes | 1 |
| Glenn Miller | I'Ve Got A Gal In Kalamazoo | NO_CHART_MATCH | HUMAN_REVIEW_REQUIRED | yes | 1 |
| Glenn Miller | In The Mood | VERSION_REVIEW | HUMAN_REVIEW_REQUIRED | yes | 1 |
| Hank Williams | Cold Cold Heart | NO_CHART_MATCH | HUMAN_REVIEW_REQUIRED | yes | 1 |
| Hank Williams | Hey Good Lookin' | VERSION_REVIEW | HUMAN_REVIEW_REQUIRED | yes | 1 |
| Harry Belafonte | Banna Boat Song Beetlejuice | VERSION_REVIEW | HUMAN_REVIEW_REQUIRED | yes | 1 |
| Harry McClintock | Big Rock Candy Mountain | NO_CHART_MATCH | HUMAN_REVIEW_REQUIRED | yes | 1 |
| henry mancini | Baby Elephant Walk | NO_CHART_MATCH | HUMAN_REVIEW_REQUIRED | yes | 1 |
| henry mancini | Pink Panther | VERSION_REVIEW | HUMAN_REVIEW_REQUIRED | yes | 1 |
| Howlin Wolf | Smokestack Lightning | VERSION_REVIEW | HUMAN_REVIEW_REQUIRED | yes | 1 |
| Huey Lewis and The News | Little Bitty Pretty One | NO_CHART_MATCH | HUMAN_REVIEW_REQUIRED | yes | 1 |
| Louvin Brothers | I Don'T Believe You'Ve Met My Baby | VERSION_REVIEW | HUMAN_REVIEW_REQUIRED | yes | 1 |
| jeff beck | Sleep Walk | NO_CHART_MATCH | HUMAN_REVIEW_REQUIRED | yes | 1 |
| johnny cash | Five Feet Hgh And Rising | NO_CHART_MATCH | HUMAN_REVIEW_REQUIRED | yes | 1 |
| Johnny Cash | I Walk the Line | VERSION_REVIEW | HUMAN_REVIEW_REQUIRED | yes | 1 |
| johnny horton | Battle Of New Orleans | VERSION_REVIEW | HUMAN_REVIEW_REQUIRED | yes | 1 |
| Johnny Tremain | The Sons Of Liberty | NO_CHART_MATCH | HUMAN_REVIEW_REQUIRED | yes | 1 |
| Judy Garland | Have Yourself A Merry Little Christmas | NO_CHART_MATCH | HUMAN_REVIEW_REQUIRED | yes | 1 |
| Judy Garland And Gene Kelly | Ballin' The Jack | NO_CHART_MATCH | HUMAN_REVIEW_REQUIRED | yes | 1 |
| Judy Garland and Johnny Mercer | Friendship | VERSION_REVIEW | HUMAN_REVIEW_REQUIRED | yes | 1 |
| Judy Garland and Johnny Mercer. | Taking A Chance On Love | NO_CHART_MATCH | HUMAN_REVIEW_REQUIRED | yes | 1 |
| Jule Styne | Hellzapoppin | NO_CHART_MATCH | HUMAN_REVIEW_REQUIRED | yes | 1 |
| louis armstrong | Cool Yule | NO_CHART_MATCH | HUMAN_REVIEW_REQUIRED | yes | 1 |
| Mickey Mouse Club | Alma Mater | NO_CHART_MATCH | HUMAN_REVIEW_REQUIRED | yes | 1 |

## False-positive audit

Automatic candidates: 0. Each was restricted to exact artist/title evidence from MusicBrainz, an existing local canonical RVTR, and no detected version marker. No automatic version or multi-song attachment was made.
