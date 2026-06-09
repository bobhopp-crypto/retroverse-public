# Midnight Special Mass Export

**Generated:** 2026-06-09T02:24:30.253Z

## Summary

| Metric | Value |
|--------|------:|
| Exportable accepted | 2041 |
| Newly exported | 1976 |
| Skipped (valid existing) | 61 |
| Failed | 4 |
| Total runtime | 6.2 min |
| Total disk (manifest) | 24.88 GB |
| Destination | `/Users/bobhopp/DJ MEDIA/VIDEO/TV Performances/Midnight Special` |
| Manifest | `/Users/bobhopp/RETROVERSE_DATA/media_collections/midnight_special/export-manifest.json` |

## Metadata strategy

| Field | Value |
|-------|-------|
| Artist | performer |
| Title | song |
| Album | Midnight Special |
| Grouping | Performance / Comedy / Interview / Intro / Movie Clip / Commercial |
| Year | air year |

No Comment, episode_id, source_url, or youtube_id in file tags.

## Sample filenames

| File | Artist | Song | Grouping | Year |
|------|--------|------|----------|------|
| `The Righteous Brothers and Paul Williams - Mr. Sandman.mp4` | The Righteous Brothers and Paul Williams | Mr. Sandman | Performance | — |
| `The Righteous Brothers - medley #3 (“Swing Low Sweet Chariot,” “Swing Down Chariot,” “Down by the Riverside” and “Oh Happy Side”).mp4` | The Righteous Brothers | medley #3 (“Swing Low Sweet Chariot,” “Swing Down Chariot,” “Down by the Riverside” and “Oh Happy Side”) | Performance | — |
| `Bobby Hatfield - He Ain't Heavy, He's My Brother.mp4` | Bobby Hatfield | He Ain't Heavy, He's My Brother | Performance | — |
| `Rosemary - “Wildflower”.mp4` | Rosemary | “Wildflower” | Performance | — |
| `The Righteous Brothers - Rock 'n' Roll Loser.mp4` | The Righteous Brothers | Rock 'n' Roll Loser | Performance | — |

## Metadata verification (samples)

### The Righteous Brothers and Paul Williams - Mr. Sandman.mp4

- Metadata OK: **yes**
```json
{
  "title": "Mr. Sandman",
  "artist": "The Righteous Brothers and Paul Williams",
  "album": "Midnight Special",
  "grouping": "Performance"
}
```

### The Righteous Brothers - medley #3 (“Swing Low Sweet Chariot,” “Swing Down Chariot,” “Down by the Riverside” and “Oh Happy Side”).mp4

- Metadata OK: **yes**
```json
{
  "title": "medley #3 (“Swing Low Sweet Chariot,” “Swing Down Chariot,” “Down by the Riverside” and “Oh Happy Side”)",
  "artist": "The Righteous Brothers",
  "album": "Midnight Special",
  "grouping": "Performance"
}
```

### Bobby Hatfield - He Ain't Heavy, He's My Brother.mp4

- Metadata OK: **yes**
```json
{
  "title": "He Ain't Heavy, He's My Brother",
  "artist": "Bobby Hatfield",
  "album": "Midnight Special",
  "grouping": "Performance"
}
```

## Failures

| Performance ID | Error |
|----------------|-------|
| `1FLOGNry03c:ch010` | ffmpeg_failed: Command failed: ffmpeg -y -ss NaN -i /Users/bobhopp/RETROVERSE_DATA/media_collections/midnight_special/downloads/1FLOGNry03c/Ep 62 - The Midnight Special ｜ April 5, 1974 (Repeated as Episode 86).mp4 - |
| `itkwPhZFAHQ:ch001` | ffmpeg_failed: Command failed: ffmpeg -y -ss NaN -i /Users/bobhopp/RETROVERSE_DATA/media_collections/midnight_special/downloads/itkwPhZFAHQ/The Midnight Special Pilot - August 19, 1972.mp4 -t NaN -c copy -avoid_nega |
| `itkwPhZFAHQ:ch002` | ffmpeg_failed: Command failed: ffmpeg -y -ss NaN -i /Users/bobhopp/RETROVERSE_DATA/media_collections/midnight_special/downloads/itkwPhZFAHQ/The Midnight Special Pilot - August 19, 1972.mp4 -t NaN -c copy -avoid_nega |
| `itkwPhZFAHQ:ch003` | ffmpeg_failed: Command failed: ffmpeg -y -ss NaN -i /Users/bobhopp/RETROVERSE_DATA/media_collections/midnight_special/downloads/itkwPhZFAHQ/The Midnight Special Pilot - August 19, 1972.mp4 -t NaN -c copy -avoid_nega |

## VirtualDJ scan impact

~2037 MP4 files in flat folder `TV Performances/Midnight Special`.

**Refresh procedure if tags look stale:**
1. Quit VirtualDJ
2. Delete stale `<Song>` entries for this folder from `database.xml` (or remove folder from library and re-add)
3. Rescan `DJ MEDIA/VIDEO/TV Performances/Midnight Special`
4. Filter **Album = Midnight Special** or **Grouping = Performance** (etc.)

VDJ reads container tags on first scan. Re-exported files need rescan to refresh cached Grouping/Album.

## Collection index

| Metric | Count |
|--------|------:|
| Accepted (index) | 14 |
| Exported (index) | 2027 |
| Review remaining | 426 |

## Recommended next step

Re-run failed IDs with `npx tsx tools/media-collections/ms-mass-export.ts` (resume skips completed).
