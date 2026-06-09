# Media Lab Performance Browser

**Date:** 2026-06-09  
**Status:** Verified

## Route

`/ops/media-lab/performances`

## API

`GET /api/ops/media-lab/performances/browse`

Query params: `q`, `collection`, `year`, `status`, `classification`, `limit`

## Baseline

- Total performances: **2471**
- Collections enabled: Midnight Special
- Future (disabled): Top of the Pops, Live Aid, Woodstock

## Sample Searches

### artist

- Query: `{"q":"Smokey Robinson","label":"artist"}`
- Results: 9
- First hit: {
  "artist": "Smokey Robinson",
  "title": "Baby Come Close",
  "collection": "Midnight Special",
  "year": 1974,
  "classification": "Performance",
  "clip_review_href": "/ops/media-lab?collection=midnight-special&episode=jsB29JMmgTA&mode=clip_review&performance=jsB29JMmgTA%3Ach012&artist=Smokey+Robinson&title=Baby+Come+Close&start=2547&end=2844&return=%2Fops%2Fmedia-lab%2Fperformances"
}

### title

- Query: `{"q":"Want To Know","label":"title"}`
- Results: 1
- First hit: {
  "artist": "Smokey Robinson",
  "title": "Want to Know My Mind",
  "collection": "Midnight Special",
  "year": 1973,
  "classification": "Performance",
  "clip_review_href": "/ops/media-lab?collection=midnight-special&episode=027bA7mICxM&mode=clip_review&performance=027bA7mICxM%3Ach001&artist=Smokey+Robinson&title=Want+to+Know+My+Mind&start=75&end=368&return=%2Fops%2Fmedia-lab%2Fperformances"
}

### collection

- Query: `{"q":"midnight","label":"collection"}`
- Results: 10
- First hit: {
  "artist": "992 Arguments",
  "title": "",
  "collection": "Midnight Special",
  "year": 1976,
  "classification": "Performance",
  "clip_review_href": "/ops/media-lab?collection=midnight-special&episode=6teeqCXCWq4&mode=clip_review&performance=6teeqCXCWq4%3Ach018&artist=992+Arguments&start=2661&end=2718&return=%2Fops%2Fmedia-lab%2Fperformances"
}

### episode_id

- Query: `{"q":"027bA7mICxM","label":"episode_id"}`
- Results: 10
- First hit: {
  "artist": "Bonnie Bramlett",
  "title": "Celebrate Life",
  "collection": "Midnight Special",
  "year": 1973,
  "classification": "Performance",
  "clip_review_href": "/ops/media-lab?collection=midnight-special&episode=027bA7mICxM&mode=clip_review&performance=027bA7mICxM%3Ach009&artist=Bonnie+Bramlett&title=Celebrate+Life&start=2268&end=2499&return=%2Fops%2Fmedia-lab%2Fperformances"
}

### comedy_filter

- Query: `{"q":"","classification":"Comedy","label":"comedy_filter"}`
- Results: 10
- First hit: {
  "artist": "Billy Braver [Comedy Segment]",
  "title": "",
  "collection": "Midnight Special",
  "year": 1976,
  "classification": "Comedy",
  "clip_review_href": "/ops/media-lab?collection=midnight-special&episode=exy9GXMMy9Y&mode=clip_review&performance=exy9GXMMy9Y%3Ach012&artist=Billy+Braver+%5BComedy+Segment%5D&start=1600&end=1943&return=%2Fops%2Fmedia-lab%2Fperformances"
}

### year_status

- Query: `{"q":"","year":1975,"status":"accepted","label":"year_status"}`
- Results: 4
- First hit: {
  "artist": "Helen Reddy",
  "title": "I Am Woman (Closing/Credits)",
  "collection": "Midnight Special",
  "year": 1975,
  "classification": "Performance",
  "clip_review_href": "/ops/media-lab?collection=midnight-special&episode=Dwtj_arVdeM&mode=clip_review&performance=Dwtj_arVdeM%3Ach020&artist=Helen+Reddy&title=I+Am+Woman+%28Closing%2FCredits%29&start=3950&end=4098&return=%2Fops%2Fmedia-lab%2Fperformances"
}


## Open Behavior

Each result links to `clip_review` with:

- episode + performance IDs
- detected start/end
- adjusted_start / adjusted_end (when present)
- return href → `/ops/media-lab/performances`

## Screenshots

- `reports/media-collections/ms-performance-browser.png` — browser with search/filters
- `reports/media-collections/ms-performance-browser-search.png` — sample artist search

## Architecture

| Layer | Role |
|-------|------|
| Performance Browser | Search, filter, open clip review |
| Review Queues | Triage, approval, workflow |
| Media Lab clip_review | Precision edit, save adjustments |
| Export | Uses effective bounds from manifest |
