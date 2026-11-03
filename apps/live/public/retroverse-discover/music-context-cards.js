(() => {
  'use strict';
  const SCHEMA = 'RVWEB/3';
  const SOURCE = 'music-context.json?build=rvweb-3';
  let payloadPromise;

  const norm = value => String(value ?? '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase();
  const plain = (value, max = 240) => typeof value === 'string' && value.length > 0 && value.length <= max && !/[<>\u0000-\u001f]/.test(value);
  const validDate = value => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T12:00:00Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
  };
  function validate(payload) {
    if (!payload || Object.keys(payload).sort().join(',') !== 'cards,schema' || payload.schema !== SCHEMA || !Array.isArray(payload.cards) || payload.cards.length < 1 || payload.cards.length > 100) return null;
    const ids = new Set(), catalogKeys = new Set();
    for (const card of payload.cards) {
      if (!card || Object.keys(card).sort().join(',') !== 'artist,artistId,hot100,title,trackId,year') return null;
      if ((card.trackId !== null && !/^RVTR\d{6}$/.test(card.trackId)) || (card.trackId !== null && ids.has(card.trackId)) || !plain(card.title, 100) || !plain(card.artist, 140) || !/^RVAR\d{6}$/.test(card.artistId)) return null;
      if (card.trackId !== null) ids.add(card.trackId);
      const catalogKey = `${norm(card.title)}|${norm(card.artist)}|${card.year}`;
      if (catalogKeys.has(catalogKey)) return null;
      catalogKeys.add(catalogKey);
      if (!Number.isInteger(card.year) || card.year < 1900 || card.year > 2100) return null;
      const chart = card.hot100;
      if (!chart || Object.keys(chart).sort().join(',') !== 'first,last,peak,weeks' || !Number.isInteger(chart.peak) || chart.peak < 1 || chart.peak > 100 || !Number.isInteger(chart.weeks) || chart.weeks < 1 || chart.weeks > 200 || !validDate(chart.first) || !validDate(chart.last) || chart.first > chart.last) return null;
    }
    return payload.cards;
  }
  async function getCards() {
    if (!payloadPromise) payloadPromise = fetch(SOURCE, {cache:'force-cache', headers:{Accept:'application/json'}})
      .then(response => { if (!response.ok) throw new Error('Music context unavailable'); return response.json(); })
      .then(validate)
      .catch(() => { payloadPromise = null; return null; });
    return payloadPromise;
  }
  async function forTrack(track) {
    const cards = await getCards();
    if (!cards || !track) return null;
    const exact = /^RVTR\d{6}$/.test(track.id || '') ? cards.find(card => card.trackId === track.id) : null;
    if (exact) return exact;
    if (!plain(track.title, 120) || !plain(track.artist, 160) || !Number.isInteger(Number(track.year))) return null;
    const matches = cards.filter(card => norm(card.title) === norm(track.title) && norm(card.artist) === norm(track.artist) && card.year === Number(track.year));
    return matches.length === 1 ? matches[0] : null;
  }
  async function forLive(track) {
    const cards = await getCards();
    if (!cards || !track || !plain(track.title, 120) || !plain(track.artist, 160)) return null;
    const matches = cards.filter(card => norm(card.title) === norm(track.title) && norm(card.artist) === norm(track.artist));
    return matches.length === 1 ? matches[0] : null;
  }
  const el = (tag, cls, value) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (value !== undefined) node.textContent = value;
    return node;
  };
  const fmtDate = value => new Intl.DateTimeFormat('en-US', {month:'short', day:'numeric', year:'numeric', timeZone:'UTC'}).format(new Date(`${value}T12:00:00Z`));
  function render(slot, card) {
    if (!slot || slot.isConnected === false || !validate({schema:SCHEMA,cards:[card]})) return false;
    const panel = el('section', 'music-context-card');
    panel.setAttribute('aria-label', 'Song and artist chart history');
    panel.append(el('span', 'eyebrow', 'SONG · CATALOG YEAR'), el('p', 'music-context-stat', `${card.title} · ${card.artist} · ${card.year}`));
    panel.append(el('span', 'eyebrow', 'BILLBOARD HOT 100 · SONG HISTORY'), el('p', 'music-context-stat', `Peak #${card.hot100.peak} · ${card.hot100.weeks} ${card.hot100.weeks === 1 ? 'week' : 'weeks'}`), el('p', 'music-context-dates', `${fmtDate(card.hot100.first)} – ${fmtDate(card.hot100.last)}`));
    panel.append(el('p', 'music-context-note', 'Chart facts describe this song and artist; they do not identify the exact video version.'));
    const links = el('div', 'music-context-links');
    const artistLink = el('a', 'button button-secondary', card.artist);
    artistLink.href = `#artist/${encodeURIComponent(card.artistId)}`;
    const decade = Math.floor(card.year / 10) * 10;
    const decadeLink = el('a', 'button button-secondary', `${decade}s songs`);
    decadeLink.href = `#era/${decade}`;
    links.append(artistLink, decadeLink);
    panel.append(links);
    slot.replaceChildren(panel);
    slot.hidden = false;
    return true;
  }
  window.RetroverseMusicContext = Object.freeze({forTrack, forLive, render, validate});
})();
