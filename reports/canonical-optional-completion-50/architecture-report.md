# Canonical-Optional VIDEO Completion Architecture

## Identity decision

The existing VDJ:<16-hex path hash> identity is reused as the video-experience identity. No competing catalog or new identifier format was created. Canonical RVTR remains optional and is preserved when present.

## Lifecycle

IDENTITY_REQUIRED now means insufficient evidence to prepare the media truthfully, not merely no RVTR. MEDIA_RESOLVED is used for proven media context without canonical linkage. Such records may move to PREPARATION_REQUIRED, but not COMPLETE until hero, Collector, editorial, Related Music, and validation requirements pass.

## Data model

Physical video → videoExperienceId → zero/one/multiple underlying song relationships → optional canonical RVTR(s) → optional chart relationships → performance context. Existing canonical fields are preserved.

## Canonical and noncanonical behavior

Canonical records retain canonical year, Chart Journey, artist, album, and package behavior. Noncanonical records use trusted VDJ/file/media metadata and the existing VDJ-only route architecture. Missing chart, album, or canonical links remain absent rather than fabricated.

## Collector/editor/public routing

Collector can key a bounded packet by videoExperienceId and collect only proven VDJ, file, media-context, and external research facts. The Editor must write only from that packet. Public routing reuses /song/vdj/[key]; no new route family or runtime matching was added.

## Chart and Related Music

Chart Journey remains canonical-only unless an explicit valid relationship exists. Related Music may use owned video identities when a safe route exists; no chart relationship is invented.
