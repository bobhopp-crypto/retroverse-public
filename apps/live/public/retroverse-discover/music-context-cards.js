(() => {
  'use strict';
  const SCHEMA = 'RVWEB/2';
  const SOURCE = 'music-context.json?build=rvweb-2';
  let payloadPromise;

  const norm = value => String(value ?? '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase();
  const plain = (value, max = 240) => typeof value === 'string' && value.length > 0 && value.length <= max && !/[<>\u0000-\u001f]/.test(value);
  function validate(payload) {
    if (!payload || Object.keys(payload).sort().join(',') !== 'cards,schema' || payload.schema !== SCHEMA || !Array.isArray(payload.cards) || payload.cards.length !== 1) return null;
    const card = payload.cards[0];
    if (!card || Object.keys(card).sort().join(',') !== 'artist,artistAlbums,artistId,hot100,title,year') return null;
    if (!plain(card.title, 80) || !plain(card.artist, 120) || !/^RVAR\d{6}$/.test(card.artistId)) return null;
    if (!Number.isInteger(card.year) || card.year < 1900 || card.year > 2100) return null;
    const chart = card.hot100;
    if (!chart || Object.keys(chart).sort().join(',') !== 'first,last,peak,weeks' || !Number.isInteger(chart.peak) || chart.peak < 1 || chart.peak > 100 || !Number.isInteger(chart.weeks) || chart.weeks < 1 || chart.weeks > 200) return null;
    const validDate = value => { if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false; const date = new Date(`${value}T12:00:00Z`); return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value; };
    if (!validDate(chart.first) || !validDate(chart.last) || chart.first > chart.last) return null;
    if (!Array.isArray(card.artistAlbums) || card.artistAlbums.length > 10) return null;
    for (const album of card.artistAlbums) {
      if (!album || Object.keys(album).sort().join(',') !== 'first,peak,title,weeks' || !plain(album.title, 120) || !Number.isInteger(album.peak) || album.peak < 1 || album.peak > 200 || !Number.isInteger(album.weeks) || album.weeks < 1 || album.weeks > 500 || !validDate(album.first)) return null;
    }
    return card;
  }
  async function getCard() {
    if (!payloadPromise) payloadPromise = fetch(SOURCE, {cache:'force-cache', headers:{Accept:'application/json'}})
      .then(response => { if (!response.ok) throw new Error('Music context unavailable'); return response.json(); })
      .then(validate)
      .catch(() => { payloadPromise = null; return null; });
    return payloadPromise;
  }
  async function forTrack(track) {
    const card = await getCard();
    if (!card || !track) return null;
    return norm(track.title) === norm(card.title) && norm(track.artist) === norm(card.artist) && Number(track.year) === card.year ? card : null;
  }
  async function forLive(track) {
    const card = await getCard();
    if (!card || !track || !plain(track.title, 120) || !plain(track.artist, 160)) return null;
    return norm(track.title) === norm(card.title) && norm(track.artist) === norm(card.artist) ? card : null;
  }
  const el = (tag, cls, value) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (value !== undefined) node.textContent = value;
    return node;
  };
  const fmtDate = value => new Intl.DateTimeFormat('en-US', {month:'short', day:'numeric', year:'numeric', timeZone:'UTC'}).format(new Date(`${value}T12:00:00Z`));
  const fmtDuration = seconds => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  function render(slot, card) {
    if (!slot || slot.isConnected === false || !validate({schema:SCHEMA,cards:[card]})) return false;
    const panel = el('section', 'music-context-card');
    panel.setAttribute('aria-label', 'Song and artist chart history');
    panel.append(el('span', 'eyebrow', 'SONG · CATALOG YEAR'), el('p', 'music-context-stat', `${card.title} · ${card.artist} · ${card.year}`));
    panel.append(el('span', 'eyebrow', 'HOT 100 · SONG HISTORY'), el('p', 'music-context-stat', `Peak #${card.hot100.peak} · ${card.hot100.weeks} weeks`), el('p', 'music-context-dates', `${fmtDate(card.hot100.first)} – ${fmtDate(card.hot100.last)}`));
    panel.append(el('span', 'eyebrow', 'PAUL HARDCASTLE · BILLBOARD 200 ALBUM HISTORY'));
    const albums = el('ul', 'music-context-albums');
    for (const album of card.artistAlbums) albums.append(el('li', '', `${album.title} · #${album.peak} · ${album.weeks} ${album.weeks === 1 ? 'week' : 'weeks'} · from ${fmtDate(album.first)}`));
    panel.append(albums);
    panel.append(el('p', 'music-context-note', 'These chart records describe the song and artist; they do not identify the exact video version.'));
    const links = el('div', 'music-context-links');
    const artistLink = el('a', 'button button-secondary', 'Paul Hardcastle');
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
