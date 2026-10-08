import Link from "next/link";

import { EraRail } from "@/components/magazine/EraRail";
import { MagazineCard } from "@/components/magazine/MagazineCard";
import { MagazinePhoto } from "@/components/magazine/MagazinePhoto";
import { MagazineRule } from "@/components/magazine/MagazineRule";
import { PlayButton } from "@/components/magazine/PlayButton";
import { PullQuote } from "@/components/magazine/PullQuote";
import { TitleTile } from "@/components/magazine/TitleTile";
import { toneStyle } from "@/components/magazine/tone";
import type { MagazinePage } from "@/lib/artist/compose-artist-magazine";
import { magazineFontClass } from "@/components/theme/magazine-fonts";

import { MagazineHero } from "./magazine-hero";

import "@/lib/theme/magazine-tokens.css";
import "./artist-magazine.css";

function AlbumRow({
  album,
}: {
  album: MagazinePage["chapters"][number]["years"][number]["albums"][number];
}) {
  const body = (
    <>
      <span style={{ ...toneStyle(album.cover), display: "contents" }}>
        {album.coverUrl ? (
          <MagazinePhoto
            sources={[album.coverUrl]}
            alt=""
            fallback={<TitleTile variant="cover" title={album.title} year={album.year} tone={album.cover} />}
          />
        ) : (
          <TitleTile variant="cover" title={album.title} year={album.year} tone={album.cover} />
        )}
      </span>
      <span>
        <span className="rv-mag-kicker rv-mag-album__kicker" style={toneStyle(album.kickerTone)}>
          {album.kicker}
        </span>
        <span className="rv-mag-album__title" style={toneStyle(album.titleTone)}>
          {album.title}
        </span>
      </span>
    </>
  );
  if (!album.href) {
    return (
      <div className="rv-mag-album" style={toneStyle(album.row)}>
        {body}
      </div>
    );
  }
  return (
    <Link href={album.href} prefetch className="rv-mag-album" style={toneStyle(album.row)}>
      {body}
    </Link>
  );
}

export function ArtistMagazine({ page }: { page: MagazinePage }) {
  return (
    <article className={`rv-mag ${magazineFontClass}`} style={{ ["--h" as string]: page.heroColor }}>
      <MagazineHero
        name={page.name}
        heroImageUrl={page.heroImageUrl}
        initials={page.initials}
        kicker="Cover Story"
        kickerTone={page.kicker}
        dek={page.dek}
        dekTone={page.dekTone}
        wordmark={page.wordmark}
      />
      <p className="rv-mag-stand">{page.standfirst}</p>
      <p className="rv-mag-byline" style={toneStyle(page.bylineTone)}>
        {page.byline}
      </p>
      <MagazineRule tone={page.openingRule} />
      {page.rail ? <EraRail tone={page.rail.tone} tabs={page.rail.tabs} /> : null}

      {page.chapters.map((chapter) => (
        <section
          key={chapter.id}
          id={chapter.id}
          className="rv-mag-chapter"
          style={{ ...toneStyle(chapter.stripe), ["--bg" as string]: chapter.surface }}
        >
          <div className="rv-mag-opener">
            <span className="rv-mag-tag">{chapter.label}</span>
            <h2 className={`rv-mag-display${chapter.compactTitle ? " is-compact" : ""}`}>{chapter.title}</h2>
            <p className="rv-mag-range">{chapter.range}</p>
          </div>
          {chapter.paragraphs.map((paragraph) => (
            <p
              key={paragraph.text}
              className={paragraph.dropCap ? "rv-mag-body is-drop" : "rv-mag-body"}
              style={paragraph.tone ? toneStyle(paragraph.tone) : undefined}
            >
              {paragraph.text}
            </p>
          ))}
          {chapter.years.map((year) => (
            <div key={year.year}>
              <div className="rv-mag-year" style={toneStyle(year.tone)}>
                <b>{year.year}</b>
                <i />
              </div>
              {year.captions.map((caption) => (
                <p key={caption.text} className="rv-mag-caption" style={toneStyle(caption.tone)}>
                  {caption.text}
                </p>
              ))}
              {year.albums.map((album) => (
                <AlbumRow key={album.key} album={album} />
              ))}
              {year.songs.map((song) => (
                <div key={song.key}>
                  <MagazineCard tone={song.listen} href={song.href} label={`Listen to ${song.title}`}>
                    {song.images.length > 0 ? (
                      <MagazinePhoto
                        sources={song.images}
                        alt=""
                        className="rv-mag-card__still"
                        fallback={
                          <TitleTile variant="letter" tone={song.letterTone ?? song.listen}>
                            {song.letter}
                          </TitleTile>
                        }
                      />
                    ) : (
                      <TitleTile variant="letter" tone={song.letterTone ?? undefined}>
                        {song.letter}
                      </TitleTile>
                    )}
                    <span className="rv-mag-card__copy">
                      <span className="rv-mag-card__title">{song.title}</span>
                      <span className="rv-mag-card__meta">
                        {song.yearLabel ? <span>{song.yearLabel}</span> : null}
                        {song.marker && song.peakLabel && song.markerLeft != null ? (
                          <span className="rv-mag-marker" style={toneStyle(song.marker)}>
                            <span className="rv-mag-marker__track">
                              <i className="rv-mag-marker__dot" style={{ left: `${song.markerLeft}%` }} />
                            </span>
                            <b>{song.peakLabel}</b>
                          </span>
                        ) : null}
                        {song.variant && song.variantTone ? (
                          <span className="rv-mag-variant" style={toneStyle(song.variantTone)}>
                            {song.variant}
                          </span>
                        ) : null}
                        {!song.yearLabel && !song.peakLabel && !song.variant ? (
                          <span>{page.fromCollection ? "In your Retroverse" : "On record"}</span>
                        ) : null}
                      </span>
                    </span>
                    <PlayButton tone={song.play} />
                  </MagazineCard>
                  {song.quote ? (
                    <PullQuote tone={song.quote.tone} cite={song.quote.cite}>
                      {song.quote.text}
                    </PullQuote>
                  ) : null}
                </div>
              ))}
              {year.quote ? (
                <PullQuote tone={year.quote.tone} cite={year.quote.cite}>
                  {year.quote.text}
                </PullQuote>
              ) : null}
            </div>
          ))}
        </section>
      ))}

      {page.essay.length ? (
        <section className="rv-mag-essay" aria-label="The story" style={toneStyle(page.essay[0]!.tone ?? page.footerTone)}>
          <div className="rv-mag-opener">
            <h2 className="rv-mag-display is-compact">The story</h2>
          </div>
          {page.essay.map((paragraph) => (
            <p
              key={paragraph.text}
              className={paragraph.dropCap ? "rv-mag-body is-drop" : "rv-mag-body"}
              style={paragraph.tone ? toneStyle(paragraph.tone) : undefined}
            >
              {paragraph.text}
            </p>
          ))}
        </section>
      ) : null}

      {page.back ? (
        <section className="rv-mag-back" style={toneStyle(page.back.stripe)}>
          <div className="rv-mag-opener">
            <span className="rv-mag-tag">Back pages</span>
            <h2 className="rv-mag-display is-compact">
              {page.fromCollection ? "Also in your Retroverse" : "Also on record"}
            </h2>
          </div>
          <p className="rv-mag-back__intro">{page.back.intro}</p>
          <div className="rv-mag-back__grid">
            {page.back.songs.map((song) => (
              <div key={song.key} className="rv-mag-back__item">
                <span style={song.imageTone ? toneStyle(song.imageTone) : undefined}>
                  {song.images.length > 0 ? (
                    <MagazinePhoto
                      sources={song.images}
                      alt=""
                      fallback={
                        <TitleTile variant="poster" tone={song.letterTone ?? undefined}>
                          {song.letter}
                        </TitleTile>
                      }
                    />
                  ) : (
                    <TitleTile variant="poster" tone={song.letterTone ?? undefined}>
                      {song.letter}
                    </TitleTile>
                  )}
                </span>
                <div className="rv-mag-back__name">{song.title}</div>
                <div className="rv-mag-back__note" style={toneStyle(song.noteTone)}>
                  {song.note}
                </div>
              </div>
            ))}
            {page.back.albums.map((album) => {
              const body = (
                <>
                  <span style={toneStyle(album.cover)}>
                    {album.coverUrl ? (
                      <MagazinePhoto
                        sources={[album.coverUrl]}
                        alt=""
                        fallback={<TitleTile variant="cover" title={album.title} year={album.year} tone={album.cover} />}
                      />
                    ) : (
                      <TitleTile variant="cover" title={album.title} year={album.year} tone={album.cover} />
                    )}
                  </span>
                  <div className="rv-mag-back__name">{album.title}</div>
                  <div className="rv-mag-back__note" style={toneStyle(album.noteTone)}>
                    {album.note}
                  </div>
                </>
              );
              return album.href ? (
                <Link key={album.key} href={album.href} prefetch className="rv-mag-back__item rv-mag-back__item--album">
                  {body}
                </Link>
              ) : (
                <div key={album.key} className="rv-mag-back__item rv-mag-back__item--album">
                  {body}
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {page.list ? (
        <div className="rv-mag-dept" style={toneStyle(page.list.frame)}>
          <div className="rv-mag-label">{page.fromCollection ? "In Your Retroverse" : "Charted recordings"}</div>
          <section
            className="rv-mag-list"
            aria-label={page.fromCollection ? "In Your Retroverse" : "Charted recordings"}
          >
            <h3>
              <em style={toneStyle(page.list.countTone)}>{page.list.count}</em>
              {page.list.rest}
            </h3>
            <p className="rv-mag-list__sub">{page.list.sub}</p>
            <ol>
              {page.list.rows.map((row) => (
                <li key={row.key} style={toneStyle(row.tone)}>
                  {row.href ? (
                    <Link href={row.href} prefetch className="rv-mag-list__title">
                      {row.title}
                      {row.variant && row.variantTone ? (
                        <span className="rv-mag-variant rv-mag-list__variant" style={toneStyle(row.variantTone)}>
                          {row.variant}
                        </span>
                      ) : null}
                    </Link>
                  ) : (
                    <span className="rv-mag-list__title">
                      {row.title}
                      {row.variant && row.variantTone ? (
                        <span className="rv-mag-variant rv-mag-list__variant" style={toneStyle(row.variantTone)}>
                          {row.variant}
                        </span>
                      ) : null}
                    </span>
                  )}
                  <span className="rv-mag-list__year">{row.year}</span>
                  {row.peak && row.peakTone ? (
                    <span className="rv-mag-list__peak" style={toneStyle(row.peakTone)}>
                      {row.peak}
                    </span>
                  ) : (
                    <span className="rv-mag-list__peak" />
                  )}
                </li>
              ))}
            </ol>
          </section>
        </div>
      ) : null}

      {page.dossier ? (
        <section className="rv-mag-dossier" aria-label="Worth knowing" style={toneStyle(page.dossier.groups[0]!.titleTone)}>
          {page.dossier.groups.map((group) => (
            <div key={group.title}>
              <h2 className="rv-mag-display" style={toneStyle(group.titleTone)}>
                {group.title}
              </h2>
              {group.items.map((item) => (
                <article key={item.key} className="rv-mag-dossier__item" style={toneStyle(item.tone)}>
                  {item.title ? (
                    item.href ? (
                      <h3>
                        <Link href={item.href} prefetch>
                          {item.title}
                        </Link>
                      </h3>
                    ) : (
                      <h3>{item.title}</h3>
                    )
                  ) : null}
                  {item.text ? <p>{item.text}</p> : null}
                </article>
              ))}
            </div>
          ))}
        </section>
      ) : null}

      {page.credits ? (
        <div className="rv-mag-dept" style={toneStyle(page.credits.labelTone)}>
          <div className="rv-mag-label">
            Also Credited
            <span>collaborations</span>
          </div>
          <div className="rv-mag-credits">
            {page.credits.rows.map((credit) => (
              <div key={credit.key} className="rv-mag-credit" style={toneStyle(credit.tone)}>
                <span>
                  <b>{credit.title}</b>
                  <i>{credit.role}</i>
                </span>
                {credit.peak ? <em>{credit.peak}</em> : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <MagazineRule tone={page.closingRule} />
      <p className="rv-mag-footer" style={toneStyle(page.footerTone)}>
        Retroverse · Artist In Depth
      </p>
    </article>
  );
}
