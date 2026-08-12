# Editorial-First VIDEO Completion Architecture

VDJ artist/title metadata establishes an Editorial Subject, not a canonical identity. Canonical RVTR, chart, album, and exact-performance data remain optional enrichment.

The completion manifest now records editorialSubject, editorialClassification, researchQuery, bobReviewRequired, and separate Collector/editorial lifecycle states. A usable subject moves to RESEARCH_REQUIRED rather than IDENTITY_REQUIRED. Only missing/meaningless subject metadata or consequential conflict remains a BobOS exception.

The existing VDJ-only route remains the public fallback. Collector packets must distinguish supported facts, context, and uncertain claims. The Editor writes one cohesive magazine feature from the packet; it does not invent missing facts. Chart Journey appears only when a valid relationship exists. Related Music remains owned-video-only.

Future intake now establishes a subject from new VDJ metadata without creating a daemon or broad processor.
