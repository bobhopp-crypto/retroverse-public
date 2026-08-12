# Media-Aware Identity Classification — Same 50

Total: 50. Processing time: 13664 ms; average: 273 ms/video. Frame extraction: 50 videos. Additional AI analysis: none. Measurable cost: none.

## Counts

- STANDARD_SONG_VIDEO: 0
- VERSION_OR_PERFORMANCE: 6
- MULTI_SONG: 1
- NON_SONG_CONTEXT: 1
- UNCERTAIN: 42
- MEDIA_PROVEN_STANDARD: 0
- MEDIA_PROVEN_VERSION: 6
- MEDIA_PROVEN_MULTI_SONG: 1
- MEDIA_PROVEN_NON_SONG: 1
- HUMAN_REVIEW_REQUIRED: 42
- NO_MATCH: 0
- CONFLICT: 0

## Evidence ledger

| VDJ artist | VDJ title | Duration (s) | Media class | Identity outcome | Human review |
|---|---|---:|---|---|---:|
| Andrews Sisters | Boogie Woogie Bugle Boy | 137.6 | UNCERTAIN | HUMAN_REVIEW_REQUIRED | yes |
| Animation | Vintage Banned Cartoons | 1133.6 | NON_SONG_CONTEXT | MEDIA_PROVEN_NON_SONG | no |
| Big Band | Rhapsody In Blue | 347.0 | UNCERTAIN | HUMAN_REVIEW_REQUIRED | yes |
| Bill Haley | Lets Rip It Up | 162.1 | UNCERTAIN | HUMAN_REVIEW_REQUIRED | yes |
| bill haley and his comets | Rock Around The Clock | 140.9 | UNCERTAIN | HUMAN_REVIEW_REQUIRED | yes |
| Billie Davis | I Want You To Be My Baby | 158.2 | UNCERTAIN | HUMAN_REVIEW_REQUIRED | yes |
| buddy holly | Not Fade Away And Peggy Sue | 329.8 | MULTI_SONG | MEDIA_PROVEN_MULTI_SONG | no |
| cab calloway | Minnie The Moocher Blue Brothers | 173.5 | VERSION_OR_PERFORMANCE | MEDIA_PROVEN_VERSION | no |
| Cab Calloway and the Nicholas Brothers | Jumpin Jive | 287.6 | UNCERTAIN | HUMAN_REVIEW_REQUIRED | yes |
| carl perkins | Blue Suede Shoes | 149.0 | UNCERTAIN | HUMAN_REVIEW_REQUIRED | yes |
| carl perkins | Glad All Over | 95.6 | UNCERTAIN | HUMAN_REVIEW_REQUIRED | yes |
| Chords | Sh Boom | 143.3 | UNCERTAIN | HUMAN_REVIEW_REQUIRED | yes |
| chuck berry | Memphis Tennessee | 275.2 | UNCERTAIN | HUMAN_REVIEW_REQUIRED | yes |
| chuck berry | School Days | 174.1 | UNCERTAIN | HUMAN_REVIEW_REQUIRED | yes |
| coasters | Down In Mexico | 169.1 | VERSION_OR_PERFORMANCE | MEDIA_PROVEN_VERSION | no |
| (missing) | (missing) | 154.6 | UNCERTAIN | HUMAN_REVIEW_REQUIRED | yes |
| duane eddy | Rebel Rouser | 171.7 | UNCERTAIN | HUMAN_REVIEW_REQUIRED | yes |
| eddie cochran | Twenty Flight Rock | 151.8 | UNCERTAIN | HUMAN_REVIEW_REQUIRED | yes |
| eddy arnold | Cattle Call | 145.6 | UNCERTAIN | HUMAN_REVIEW_REQUIRED | yes |
| elvis presley | Jailhouse Rock | 162.7 | UNCERTAIN | HUMAN_REVIEW_REQUIRED | yes |
| elvis presley | Peace In The Valley | 157.6 | UNCERTAIN | HUMAN_REVIEW_REQUIRED | yes |
| Frank Sinatra | Come Fly With Me BW | 151.1 | UNCERTAIN | HUMAN_REVIEW_REQUIRED | yes |
| Frank Sinatra | Come Fly With Me | 103.8 | UNCERTAIN | HUMAN_REVIEW_REQUIRED | yes |
| frank sinatra | Fly Me To The Moon | 131.8 | UNCERTAIN | HUMAN_REVIEW_REQUIRED | yes |
| Glenn Miller | At Last | 280.0 | VERSION_OR_PERFORMANCE | MEDIA_PROVEN_VERSION | no |
| Glenn Miller | Chattanooga Choo Choo 1941 | 480.2 | UNCERTAIN | HUMAN_REVIEW_REQUIRED | yes |
| Glenn Miller | Chattanooga Choo Choo | 480.2 | UNCERTAIN | HUMAN_REVIEW_REQUIRED | yes |
| Glenn Miller | I'Ve Got A Gal In Kalamazoo | 461.2 | UNCERTAIN | HUMAN_REVIEW_REQUIRED | yes |
| Glenn Miller | In The Mood | 210.6 | UNCERTAIN | HUMAN_REVIEW_REQUIRED | yes |
| Hank Williams | Cold Cold Heart | 208.6 | UNCERTAIN | HUMAN_REVIEW_REQUIRED | yes |
| Hank Williams | Hey Good Lookin' | 115.4 | UNCERTAIN | HUMAN_REVIEW_REQUIRED | yes |
| Harry Belafonte | Banna Boat Song Beetlejuice | 186.9 | VERSION_OR_PERFORMANCE | MEDIA_PROVEN_VERSION | no |
| Harry McClintock | Big Rock Candy Mountain | 190.5 | UNCERTAIN | HUMAN_REVIEW_REQUIRED | yes |
| henry mancini | Baby Elephant Walk | 201.2 | UNCERTAIN | HUMAN_REVIEW_REQUIRED | yes |
| henry mancini | Pink Panther | 189.7 | UNCERTAIN | HUMAN_REVIEW_REQUIRED | yes |
| Howlin Wolf | Smokestack Lightning | 271.7 | UNCERTAIN | HUMAN_REVIEW_REQUIRED | yes |
| Huey Lewis and The News | Little Bitty Pretty One | 128.1 | VERSION_OR_PERFORMANCE | MEDIA_PROVEN_VERSION | no |
| Louvin Brothers | I Don'T Believe You'Ve Met My Baby | 126.3 | UNCERTAIN | HUMAN_REVIEW_REQUIRED | yes |
| jeff beck | Sleep Walk | 151.3 | UNCERTAIN | HUMAN_REVIEW_REQUIRED | yes |
| johnny cash | Five Feet Hgh And Rising | 147.4 | UNCERTAIN | HUMAN_REVIEW_REQUIRED | yes |
| Johnny Cash | I Walk the Line | 132.3 | VERSION_OR_PERFORMANCE | MEDIA_PROVEN_VERSION | no |
| johnny horton | Battle Of New Orleans | 151.0 | UNCERTAIN | HUMAN_REVIEW_REQUIRED | yes |
| Johnny Tremain | The Sons Of Liberty | 158.9 | UNCERTAIN | HUMAN_REVIEW_REQUIRED | yes |
| Judy Garland | Have Yourself A Merry Little Christmas | 192.5 | UNCERTAIN | HUMAN_REVIEW_REQUIRED | yes |
| Judy Garland And Gene Kelly | Ballin' The Jack | 171.2 | UNCERTAIN | HUMAN_REVIEW_REQUIRED | yes |
| Judy Garland and Johnny Mercer | Friendship | 310.0 | UNCERTAIN | HUMAN_REVIEW_REQUIRED | yes |
| Judy Garland and Johnny Mercer. | Taking A Chance On Love | 306.0 | UNCERTAIN | HUMAN_REVIEW_REQUIRED | yes |
| Jule Styne | Hellzapoppin | 345.3 | UNCERTAIN | HUMAN_REVIEW_REQUIRED | yes |
| louis armstrong | Cool Yule | 175.0 | UNCERTAIN | HUMAN_REVIEW_REQUIRED | yes |
| Mickey Mouse Club | Alma Mater | 150.9 | UNCERTAIN | HUMAN_REVIEW_REQUIRED | yes |

## False-positive audit

No MEDIA_PROVEN_* result is treated as a permanent canonical attachment. Media classification can establish context, but this bounded pass does not independently prove RVTR identity from frames alone. All canonical RVTR fields therefore remain empty and all apparent media-proven relationships require evidence review before durable identity storage.
