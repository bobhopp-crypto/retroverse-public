(() => {
  'use strict';

  // These are display/search credits for specific records only. They do not
  // merge artist entities or alter the canonical catalog rows.
  const verifiedCredits = Object.freeze({
    RVTR417674: 'Simon & Garfunkel',
    RVTR136418: 'Simon & Garfunkel',
    RVTR190626: 'Simon & Garfunkel',
    RVTR222109: 'Simon & Garfunkel',
    RVTR242059: 'Simon & Garfunkel',
    RVTR709823: 'Simon & Garfunkel',
    RVTR773118: 'Simon & Garfunkel',
    RVTR834453: 'Simon & Garfunkel',
    RVTR840641: 'Simon & Garfunkel',
    RVTR910987: 'Simon & Garfunkel',
    RVTR943642: 'Simon & Garfunkel',

    RVTR459182: 'Simon & Garfunkel',
    RVTR682157: 'Simon & Garfunkel',
    RVTR556212: 'Simon & Garfunkel',
    RVTR000260: 'Simon & Garfunkel',
    RVTR966397: 'Simon & Garfunkel',
    RVTR132132: 'Simon & Garfunkel',
    RVTR907316: 'Peaches & Herb',
    RVTR677676: 'Peaches & Herb',
    RVTR280043: 'Peaches & Herb',
    RVTR689152: 'Peaches & Herb',
  });

  const normalize = value => String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

  const identityKey = value => String(value ?? '')
    .normalize('NFKC')
    .trim()
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase();
  const identityArtistKey = value => identityKey(value).replace(/&/g, ' and ').replace(/\s+/g, ' ');

  function displayArtist(track) {
    return verifiedCredits[String(track?.id ?? '').toUpperCase()] || (track?.artistSlug==='RVAR005340'?'R.E.M.':track?.artist) || '';
  }

  function matchesTrackQuery(track, query) {
    const words = normalize(query).split(/\s+/).filter(Boolean);
    if (!words.length) return true;
    const fields = [track?.title, track?.artist, displayArtist(track), track?.year, ...(window.RetroverseEditorial?.keywordsForTrack(track?.id)||[])]
      .map(normalize).filter(Boolean);
    return words.every(word => fields.some(field => field.includes(word)));
  }

  function exactTitleArtistMatches(tracks, title, artist) {
    const titleKey = identityKey(title), artistKey = identityArtistKey(artist);
    if (!titleKey || !artistKey || !Array.isArray(tracks)) return [];
    return tracks.filter(track => identityKey(track.title) === titleKey &&
      [identityArtistKey(track.artist), identityArtistKey(displayArtist(track))].includes(artistKey));
  }

  function exactSongQueryMatches(tracks, query) {
    const queryKey = identityKey(query);
    if (!queryKey || !Array.isArray(tracks)) return [];
    return tracks.filter(track => {
      const title = identityKey(track.title);
      return queryKey === title || queryKey === `${title} ${identityArtistKey(track.artist)}` ||
        queryKey === `${title} ${identityArtistKey(displayArtist(track))}`;
    });
  }

  function sameTitleTracks(tracks, selected) {
    const key = identityKey(selected?.title);
    if (!key || !Array.isArray(tracks)) return [];
    return tracks.filter(track => track.id !== selected.id && identityKey(track.title) === key)
      .slice(0, 8);
  }

  function validChartDate(date) {
    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
    const parsed = new Date(`${date}T12:00:00Z`);
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
  }

  function chartWeekHref(trackId, date, rank) {
    if (typeof trackId !== 'string' || !/^RVTR\d{6}$/i.test(trackId)) return null;
    if (!validChartDate(date)) return null;
    if (!Number.isInteger(rank) || rank < 1 || rank > 100) return null;
    return `/week/${date}?focus=${trackId.toUpperCase()}&rank=${rank}`;
  }

  function createSingleFlightPollGate() {
    let generation = 0, inFlight = false;
    return Object.freeze({
      begin() { if (inFlight) return null; inFlight = true; generation += 1; return generation; },
      invalidate() { generation += 1; inFlight = false; },
      isCurrent(token) { return token === generation && inFlight; },
      finish(token) { if (token === generation) inFlight = false; },
    });
  }

  function publicLiveNotes(payload) {
    const live=payload?.live||{}, notes=live.publicNotes;
    if(!notes||notes.source!=='vdj-public-v1')return {comment:'',tags:[]};
    const tags=Array.isArray(notes.tags)?notes.tags.filter(v=>typeof v==='string'&&v.length<=64&&/^[\p{L}\p{N} &/().,+'-]+$/u.test(v)&&!/RVTR|User[12]|DMX|lighting|\/Users\/|\/home\//i.test(v)).slice(0,3):[];
    const c=notes.chart;
    const valid=c&&/^RVTR\d{6}$/.test(c.track)&&identityKey(c.title)===identityKey(live.title)&&identityArtistKey(c.artist)===identityArtistKey(live.artist)&&(!/^RVTR\d{6}$/i.test(live.rvtr||'')||live.rvtr.toUpperCase()===c.track)&&Number.isInteger(c.year)&&c.year>=1900&&c.year<=2100&&Number.isInteger(c.peak)&&c.peak>=1&&c.peak<=100&&Number.isInteger(c.weeks)&&c.weeks>=1&&c.weeks<=1040&&validChartDate(c.first)&&validChartDate(c.last)&&c.first<=c.last&&c.weeks<=Math.floor((Date.parse(c.last)-Date.parse(c.first))/604800000)+1;
    return {comment:valid?`VDJ chart notes · ${c.year} · Hot 100 peak #${c.peak} · ${c.weeks} chart weeks · ${c.first} to ${c.last}`:'',tags:[...new Set(tags)]};
  }
  window.RetroverseDiscoveryHelpers = Object.freeze({
    publicLiveNotes,
    mergeLiveEnrichment(previous,next) {
      if(!previous||previous.id!==next.id||previous.title!==next.title||previous.artist!==next.artist||(previous.researchSelectionToken??null)!==(next.researchSelectionToken??null)||(previous.startedAt??null)!==(next.startedAt??null))return next;
      return {...next,heroUrl:next.heroUrl||previous.heroUrl||null,year:next.year??previous.year??null};
    },
    displayArtist,
    displayArtistEntity: artist => artist?.id==='RVAR003970'?'Simon & Garfunkel':artist?.id==='RVAR005340'?'R.E.M.':artist?.name||'',
    matchesTrackQuery,
    exactTitleArtistMatches,
    exactSongQueryMatches,
    sameTitleTracks,
    validChartDate,
    chartWeekHref,
    createSingleFlightPollGate,
  });
})();
