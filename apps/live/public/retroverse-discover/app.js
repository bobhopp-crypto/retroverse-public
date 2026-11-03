'use strict';
(() => {
  const dialog = document.getElementById('detail-dialog');
  const content = document.getElementById('panel-content');
  const backButton = document.querySelector('.panel-back');
  const announcement = document.getElementById('announcement');
  const pageTitle = 'Retroverse';
  const artForDecade = {1950:'1950s-diner',1960:'1960s-space-age',1970:'1970s-record-shop',1980:'1980s-roller-rink',1990:'1990s-bedroom',2000:'2000s-listening-room',2010:'2010s-outdoor-show',2020:'2020s-shared-studio'};
  const imageForTrack = {RVTR607320:'art/videos/chuck-berry-you-never-can-tell.jpg'};
  const batchSize = 24;
  const liveFeedUrl = '/api/sunday-nights/current';
  const livePollMs = 7000, liveFreshnessMs = 25 * 60_000, showcaseIntervalMs = 28000;
  let tracks = null, artists = null, artistsById = null, catalogPromise = null, overview = null;
  let routeVersion = 0, currentHash = location.hash, backStack = [], lastTrigger = null;
  let liveMode = false, manualArchiveMode = false, latestLiveTrack = null, latestFeedState = 'checking', lastFeedSuccess = 0, heroDisplayVersion = 0, firstLiveCheckSettled = false;
  let showcaseTimer = 0, showcaseCards = null, showcaseLoading = null, showcaseIndex = -1, showcaseDisplayed = false, showcaseHeroVisible = true;
  let searchState = {q:'',type:'songs',page:1}, searchTimer;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon = name => `<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const prettyCount = value => Number(value).toLocaleString('en-US');
  const date = value => value ? new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'}).format(new Date(`${value}T12:00:00Z`)) : 'Not listed';
  const sourceNote = '';

  async function loadOverview() {
    if (overview) return overview;
    const response = await fetch('catalog-overview.json?build=revision-2026-10-30-4');
    if (!response.ok) throw new Error('Decade summary unavailable');
    overview = await response.json();
    return overview;
  }
  async function loadCatalog() {
    if (tracks) return {tracks,artists};
    if (!catalogPromise) catalogPromise = (async () => {
      const response = await fetch('catalog.json.gz');
      if (!response.ok) throw new Error('Catalog unavailable');
      if (!('DecompressionStream' in window)) throw new Error('This browser cannot open the compressed catalog.');
      const stream = new Blob([await response.arrayBuffer()]).stream().pipeThrough(new DecompressionStream('gzip'));
      const data = JSON.parse(await new Response(stream).text());
      if (!Array.isArray(data.tracks) || !Array.isArray(data.artists) || data.tracks.length !== 41543 || !data.tracks.every(t=>typeof t.id==='string'&&typeof t.title==='string'&&typeof t.artist==='string'&&typeof t.artistSlug==='string'&&(t.year===null||Number.isInteger(t.year)))) throw new Error('Catalog data is incomplete');
      tracks = data.tracks; artists = data.artists;
      artistsById = new Map(artists.map(artist => [artist.id, artist]));
      const dated=tracks.map(t=>t.year).filter(Number.isInteger);
      document.getElementById('footer-count').textContent = `${prettyCount(tracks.length)} songs · ${prettyCount(artists.length)} artists · catalog years ${Math.min(...dated)}–${Math.max(...dated)}`;
      return {tracks,artists};
    })().catch(error => {catalogPromise=null;throw error;});
    return catalogPromise;
  }
  const isPanel = hash => hash && hash !== '#' && hash !== '#eras';
  function updateNav(hash) {
    const active = hash.startsWith('#era') ? 'eras' : hash.startsWith('#search') ? 'search' : hash === '#live' ? 'live' : 'discover';
    document.querySelectorAll('[data-nav]').forEach(a => a.dataset.nav === active ? a.setAttribute('aria-current','page') : a.removeAttribute('aria-current'));
    document.querySelectorAll('.desktop-nav a').forEach(a => a.classList.toggle('current', a.hash === (active === 'eras' ? '#eras' : active === 'live' ? '#live' : '')));
  }
  function navigate(hash, trigger) {
    if (trigger) lastTrigger = trigger;
    if (hash === currentHash && isPanel(hash)) return;
    if (isPanel(currentHash)) backStack.push(currentHash); else backStack = [];
    history.pushState({retroverse:true},'',hash || location.pathname + location.search);
    currentHash = hash; renderRoute();
  }
  function closePanel() {
    if (dialog.open) dialog.close();
    document.body.classList.remove('body-modal-open'); backStack=[];
    history.replaceState(null,'',location.pathname + location.search); currentHash=''; updateNav(''); document.title=pageTitle;
    if (lastTrigger && lastTrigger.isConnected && !dialog.contains(lastTrigger)) lastTrigger.focus({preventScroll:true});
    else document.querySelector('.wordmark').focus({preventScroll:true});
    syncShowcaseRotation();
  }
  function showPanel(html,title,focus=true) {
    content.innerHTML=html; backButton.hidden=backStack.length===0;
    if (!dialog.open) dialog.showModal();
    document.body.classList.add('body-modal-open'); document.title=`${title} — Retroverse`;
    dialog.scrollTop=0;
    if(focus){const target=content.querySelector('[autofocus]')||content.querySelector('h2');if(target){if(target.tagName!=='INPUT')target.tabIndex=-1;target.focus({preventScroll:true});}}
  }
  function missingThumb() { return '<div class="thumbnail-missing" role="img" aria-label="Still unavailable"><svg class="icon" aria-hidden="true"><use href="#i-record"/></svg><span>Still unavailable</span></div>'; }
  function rows(items,showYear=true,offset=0) {
    if(!items.length) return '';
    return `<ul class="track-list">${items.map((track,index)=>`<li><a class="track-link" href="#song/${esc(track.id)}"><span class="track-number" aria-hidden="true">${String(offset+index+1).padStart(2,'0')}</span><span class="track-copy"><span class="track-title">${esc(track.title)}</span><span class="track-byline">${esc(track.artist)}</span></span>${showYear?`<span class="track-year">${track.year??'—'}</span>`:''}${icon('arrow')}</a></li>`).join('')}</ul>`;
  }
  function chart(track, showDateRange=true) {
    const points=Array.isArray(track.chart)?track.chart.filter(r=>Array.isArray(r)&&typeof r[0]==='string'&&Number.isInteger(r[1])&&r[1]>=1&&r[1]<=100):[];
    if(!points.length)return '<p class="small-note">No weekly chart positions are listed for this song.</p>';
    const coords=points.map((r,i)=>[32+i*(456/Math.max(points.length-1,1)),16+(r[1]-1)*1.65]);
    const peak=points.reduce((best,r,i)=>r[1]<points[best][1]?i:best,0);
    const dateRange=showDateRange?`<div class="chart-dates"><span>${date(points[0][0])}</span><span>${date(points.at(-1)[0])}</span></div>`:'';
    return `<p class="chart-description">Weekly chart position · Lower numbers rank higher</p><div class="chart-wrap"><svg viewBox="0 0 510 195" role="img" aria-label="${esc(track.title)}: ${points.length} listed weeks, best position ${points[peak][1]}.">${[1,50,100].map(rank=>`<line x1="32" y1="${16+(rank-1)*1.65}" x2="488" y2="${16+(rank-1)*1.65}" stroke="#d6cfbf" stroke-dasharray="3 5"/><text x="4" y="${20+(rank-1)*1.65}" fill="#586663" font-size="10">${rank}</text>`).join('')}<polyline points="${coords.map(p=>p.join(',')).join(' ')}" fill="none" stroke="#176b6c" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>${coords.map((p,i)=>`<circle cx="${p[0]}" cy="${p[1]}" r="${i===peak?5:2.5}" fill="${i===peak?'#d83c20':'#176b6c'}" stroke="#fffaf0" stroke-width="1.5"/>`).join('')}</svg>${dateRange}</div><details class="chart-details"><summary>View weekly positions</summary><table><thead><tr><th scope="col">Week of</th><th scope="col">Position</th></tr></thead><tbody>${points.map(r=>`<tr><td>${date(r[0])}</td><td>${r[1]}</td></tr>`).join('')}</tbody></table></details>`;
  }
  function selectionId() { try { return localStorage.getItem('retroverse-selected-song') || 'RVTR607320'; } catch { return 'RVTR607320'; } }
  function setSelection(track) {
    heroDisplayVersion++;
    try { localStorage.setItem('retroverse-selected-song',track.id); } catch {}
    liveMode=false; manualArchiveMode=true; document.getElementById('hero-mode-label').textContent='ARCHIVE SELECTION'; document.getElementById('archive-return').hidden=true; document.getElementById('show-live-song').hidden=!latestLiveTrack; document.getElementById('hero-artist-link').hidden=false;
    document.querySelector('.still-label').textContent='ARCHIVE IMAGE'; document.getElementById('live-track-status').textContent='';
    if(latestFeedState==='fresh')document.getElementById('live-feed-badge').textContent='LIVE FEED CONNECTED';
    updateHero(track); announcement.textContent=`${track.title} by ${track.artist} selected.`;
    syncShowcaseRotation();
  }
  function updateHero(track) {
    document.getElementById('featured-title').textContent=track.title;
    const artist=document.getElementById('hero-artist');artist.textContent=track.artist;artist.href=`#artist/${encodeURIComponent(track.artistSlug)}`;
    document.getElementById('hero-year').textContent=track.year??'Year not listed';
    document.getElementById('hero-year-stamp').innerHTML=track.year?`<span>${String(track.year).slice(0,2)}</span><span>${String(track.year).slice(-2)}</span>${icon('record')}`:'';
    const songLink=document.getElementById('hero-song-link');songLink.href=`#song/${encodeURIComponent(track.id)}`;songLink.innerHTML=`Song details${icon('arrow')}`;
    document.getElementById('hero-artist-link').href=`#artist/${encodeURIComponent(track.artistSlug)}`;
    const thumb=document.getElementById('hero-thumbnail'),fallback=document.querySelector('.thumbnail-fallback');
    if(imageForTrack[track.id]) {thumb.fetchPriority='high';thumb.src=imageForTrack[track.id];thumb.alt=`${track.artist} performing ${track.title}.`;thumb.hidden=false;fallback.hidden=true;}
    else {thumb.hidden=true;fallback.hidden=false;fallback.textContent='Still unavailable';}
    document.getElementById('hero-media-note').textContent='';
  }
  function resolveLivePayload(payload, now=Date.now()) {
    const live = payload?.live;
    const classification=window.RetroverseMusicContext?.classifyLive(live,now,liveFreshnessMs);
    if(!classification)return {state:'invalid'};
    if(classification.state!=='fresh')return classification;
    const candidateIds=[payload.publicSong?.rvtr,payload.track?.rvtr,live.rvtr,payload.currentTrackId];
    const id=candidateIds.find(value=>typeof value==='string'&&/^RVTR\d{6}$/i.test(value))?.toUpperCase()||null;
    return {state:'fresh',track:{id, title:live.title.trim(), artist:live.artist.trim(), year:Number.isInteger(live.year)?live.year:(Number.isInteger(payload.publicSong?.year)?payload.publicSong.year:null), timestamp:classification.timestamp, heroUrl:safeLiveHeroUrl(payload.publicSong?.heroUrl)}};
  }
  function safeLiveHeroUrl(value) {
    if(typeof value!=='string'||value.length>2048)return null;
    try {
      const url=new URL(value,location.origin);
      if(url.origin!==location.origin||url.pathname!=='/api/experience/visual-asset'||url.searchParams.get('file')!=='hero-video.jpg'||!/^VDJ-[0-9A-F]{16}$/i.test(url.searchParams.get('rvtr')||''))return null;
      return `${url.pathname}${url.search}`;
    } catch { return null; }
  }
  function stopShowcaseRotation() { if (showcaseTimer) window.clearTimeout(showcaseTimer); showcaseTimer = 0; }
  function showcaseDisplayAllowed() {
    return latestFeedState === 'idle' && !liveMode && !manualArchiveMode && (!currentHash || currentHash === '#') && document.visibilityState === 'visible' && showcaseHeroVisible;
  }
  function showcaseRotationAllowed() {
    return Boolean(window.RetroverseMusicContext?.canRotate({feedState:latestFeedState,liveMode,manualArchiveMode,hasRoute:Boolean(currentHash&&currentHash!=='#'),visible:document.visibilityState==='visible',reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,heroVisible:showcaseHeroVisible}));
  }
  function paintShowcaseCard(card) {
    const decade=Math.floor(card.year/10)*10, art=artForDecade[decade];
    if (!art || !/^RVTR\d{6}$/.test(card.trackId || '')) return false;
    heroDisplayVersion++; liveMode=false;
    document.getElementById('hero-mode-label').textContent='FEATURED';
    document.getElementById('archive-return').hidden=true;
    document.getElementById('show-live-song').hidden=true;
    document.querySelector('.still-label').textContent='DECADE ART';
    document.getElementById('featured-title').textContent=card.title;
    const artist=document.getElementById('hero-artist');artist.textContent=card.artist;artist.href=`#artist/${encodeURIComponent(card.artistId)}`;
    document.getElementById('hero-year').textContent=String(card.year);
    document.getElementById('hero-year-stamp').innerHTML=`<span>${String(card.year).slice(0,2)}</span><span>${String(card.year).slice(-2)}</span>${icon('record')}`;
    const song=document.getElementById('hero-song-link');song.href=`#song/${encodeURIComponent(card.trackId)}`;song.innerHTML=`Song details${icon('arrow')}`;
    const artistLink=document.getElementById('hero-artist-link');artistLink.href=`#artist/${encodeURIComponent(card.artistId)}`;artistLink.hidden=false;
    const thumb=document.getElementById('hero-thumbnail'), fallback=document.querySelector('.thumbnail-fallback');
    thumb.onerror=null;thumb.fetchPriority='low';thumb.loading='eager';thumb.alt=`Illustration for the ${decade}s.`;thumb.src=`art/eras/retroverse-era-${art}-480.webp`;thumb.hidden=false;fallback.hidden=true;
    document.getElementById('hero-media-note').textContent=`Peak #${card.hot100.peak} · ${card.hot100.weeks} weeks`;
    showcaseDisplayed=true;
    return true;
  }
  function syncShowcaseRotation() {
    if (!showcaseDisplayAllowed()) { stopShowcaseRotation(); return; }
    if (showcaseTimer) return;
    if (!showcaseLoading && !showcaseCards) showcaseLoading=window.RetroverseMusicContext?.showcaseCards().then(cards=>{showcaseCards=cards||[];showcaseLoading=null;}).catch(()=>{showcaseCards=[];showcaseLoading=null;});
    if (showcaseLoading) { void showcaseLoading.then(()=>syncShowcaseRotation()); return; }
    if (!showcaseCards?.length) return;
    if (!showcaseDisplayed) {
      showcaseIndex=(showcaseIndex+1)%showcaseCards.length;
      if (!paintShowcaseCard(showcaseCards[showcaseIndex])) return;
    }
    if (!showcaseRotationAllowed() || showcaseCards.length < 2) return;
    showcaseTimer=window.setTimeout(()=>{
      showcaseTimer=0;
      if (!showcaseDisplayAllowed()) return;
      showcaseIndex=(showcaseIndex+1)%showcaseCards.length;
      if (paintShowcaseCard(showcaseCards[showcaseIndex])) { showcaseDisplayed=true; syncShowcaseRotation(); }
    },showcaseIntervalMs);
  }
  function shouldRestoreArchive(state, isLive, isManualArchive) { return state !== 'fresh' && state !== 'checking' && isLive && !isManualArchive; }
  function liveMessage(state, detail) {
    latestFeedState=state;
    if (shouldRestoreArchive(state,liveMode,manualArchiveMode)) {
      if (state === 'idle') {
        heroDisplayVersion++; liveMode=false;
        document.getElementById('hero-mode-label').textContent='FEATURED';
        document.getElementById('archive-return').hidden=true; document.getElementById('show-live-song').hidden=true;
        document.querySelector('.still-label').textContent='DECADE ART';
        document.getElementById('featured-title').textContent='';
        document.getElementById('hero-artist').textContent=''; document.getElementById('hero-artist').removeAttribute('href');
        document.getElementById('hero-year').textContent=''; document.getElementById('hero-year-stamp').textContent='';
        document.getElementById('hero-song-link').href='#'; document.getElementById('hero-song-link').innerHTML=`Song details${icon('arrow')}`;
        document.getElementById('hero-artist-link').hidden=true;
        document.getElementById('hero-thumbnail').hidden=true; document.querySelector('.thumbnail-fallback').hidden=true;
        document.getElementById('hero-media-note').textContent=''; document.getElementById('live-track-status').textContent='';
      } else restoreArchiveDisplay();
    }
    const badge=document.getElementById('live-feed-badge'), label=document.getElementById('live-track-status');
    const title=document.getElementById('live-strip-title'), copy=document.getElementById('live-strip-copy'), mark=document.getElementById('live-mark');
    const texts={checking:['CHECKING','Checking…','Checking',''],fresh:['LIVE NOW','Now playing','Connected',''],stale:['STALE','Live feed stale','Stale','Last report is older than 25 minutes.'],offline:['OFFLINE','Live feed unavailable','Offline','Retrying automatically.'],idle:['NOT PLAYING','No song playing','Connected',''],invalid:['UNAVAILABLE','Live data unavailable','Data error','']};
    const t=texts[state]||texts.offline;
    badge.textContent=state==='fresh'&&manualArchiveMode?'LIVE FEED CONNECTED':t[0];
    badge.dataset.state=state; label.textContent=detail||(state==='fresh'&&manualArchiveMode?'Archive selection kept':t[1]); title.textContent=t[2]; copy.textContent=t[3]; mark.dataset.state=state;
    if (state === 'fresh') { stopShowcaseRotation(); showcaseDisplayed=false; }
    else syncShowcaseRotation();
  }
  function showLiveTrack(track) {
    heroDisplayVersion++;
    latestLiveTrack=track; liveMode=true;
    document.getElementById('hero-mode-label').textContent='NOW PLAYING';
    document.getElementById('archive-return').hidden=false;
    document.getElementById('show-live-song').hidden=true;
    document.getElementById('hero-year').textContent=track.year??'Year not listed';
    document.getElementById('hero-year-stamp').innerHTML=track.year?`<span>${String(track.year).slice(0,2)}</span><span>${String(track.year).slice(-2)}</span>${icon('record')}`:'';
    document.getElementById('featured-title').textContent=track.title;
    const artist=document.getElementById('hero-artist'); artist.textContent=track.artist; artist.removeAttribute('href');
    const song=document.getElementById('hero-song-link'); song.href='#live-song'; song.textContent='Find in catalog';
    document.getElementById('hero-artist-link').hidden=true;
    const thumb=document.getElementById('hero-thumbnail'), fallback=document.querySelector('.thumbnail-fallback'), stillLabel=document.querySelector('.still-label'), mediaNote=document.getElementById('hero-media-note');
    const heroVersion=heroDisplayVersion;
    if(track.heroUrl){
      thumb.fetchPriority='high';thumb.alt=`${track.artist} performance still for ${track.title}.`;thumb.hidden=false;fallback.hidden=true;stillLabel.textContent='LIVE STILL';mediaNote.textContent='';thumb.onerror=()=>{if(heroVersion!==heroDisplayVersion||!liveMode)return;thumb.hidden=true;fallback.hidden=false;fallback.textContent='Still unavailable';stillLabel.textContent='LIVE';mediaNote.textContent='';};thumb.src=track.heroUrl;
    } else {
      thumb.hidden=true;fallback.hidden=false;fallback.textContent='Still unavailable';stillLabel.textContent='LIVE';mediaNote.textContent='';thumb.onerror=null;
    }
    document.getElementById('live-track-status').textContent=`Updated ${new Intl.DateTimeFormat('en-US',{hour:'numeric',minute:'2-digit'}).format(new Date(track.timestamp))}`;
  }
  function restoreArchiveDisplay() {
    const restoreVersion=++heroDisplayVersion;
    liveMode=false; document.getElementById('hero-mode-label').textContent='ARCHIVE SELECTION';
    document.getElementById('archive-return').hidden=true; document.getElementById('show-live-song').hidden=latestFeedState!=='fresh'||!latestLiveTrack; document.getElementById('hero-artist-link').hidden=false;
    document.querySelector('.still-label').textContent='ARCHIVE IMAGE'; document.querySelector('.thumbnail-fallback').textContent='Still unavailable';
    document.getElementById('featured-title').textContent='Restoring archive selection…';
    document.getElementById('hero-artist').textContent=''; document.getElementById('hero-artist').removeAttribute('href');
    document.getElementById('hero-year').textContent=''; document.getElementById('hero-year-stamp').textContent='';
    document.getElementById('hero-song-link').href='#'; document.getElementById('hero-song-link').innerHTML=`Song details${icon('arrow')}`;
    document.getElementById('live-track-status').textContent='';
    document.getElementById('hero-thumbnail').hidden=true; document.querySelector('.thumbnail-fallback').hidden=false;
    document.getElementById('hero-media-note').textContent='';
    loadCatalog().then(({tracks:all})=>{if(restoreVersion!==heroDisplayVersion)return;const chosen=all.find(t=>t.id===selectionId())||all.find(t=>t.id==='RVTR607320');if(chosen)updateHero(chosen);}).catch(()=>{});
  }
  function returnToArchive() { manualArchiveMode=true; if(latestFeedState==='fresh')document.getElementById('live-feed-badge').textContent='LIVE FEED CONNECTED'; restoreArchiveDisplay(); }
  async function pollLiveFeed() {
    try {
      const response=await fetch(`${liveFeedUrl}?ts=${Date.now()}`,{cache:'no-store',mode:'cors',headers:{Accept:'application/json'}});
      if(!response.ok){liveMessage('offline');settleFirstLiveCheck(false);return;}
      let payload; try{payload=await response.json();}catch{liveMessage('invalid');settleFirstLiveCheck(false);return;}
      if(!payload||typeof payload!=='object'||Array.isArray(payload)){liveMessage('invalid');settleFirstLiveCheck(false);return;}
      lastFeedSuccess=Date.now();
      const result=resolveLivePayload(payload);
      if(result.state==='fresh'){const track=result.track,changed=latestLiveTrack?.timestamp!==track.timestamp||latestLiveTrack?.title!==track.title||latestLiveTrack?.artist!==track.artist;latestLiveTrack=track;if(!manualArchiveMode&&(!liveMode||changed))showLiveTrack(track);liveMessage('fresh');settleFirstLiveCheck(true);return;}
      liveMessage(result.state);settleFirstLiveCheck(false);
    } catch(error) {
      liveMessage(lastFeedSuccess&&Date.now()-lastFeedSuccess>liveFreshnessMs?'stale':'offline');settleFirstLiveCheck(false);
    }
  }
  function applySavedHero() {try {const id=localStorage.getItem('retroverse-selected-song');if(!id||manualArchiveMode||liveMode)return;const version=++heroDisplayVersion;loadCatalog().then(({tracks:all})=>{const track=all.find(t=>t.id===id);if(track&&version===heroDisplayVersion&&!liveMode&&!manualArchiveMode)updateHero(track);});} catch {}}
  function settleFirstLiveCheck(isFresh) {if(firstLiveCheckSettled)return;firstLiveCheckSettled=true;if(!isFresh&&latestFeedState!=='idle')applySavedHero();}
  function pagedList(container,items,showYear=true) {
    let page=1;
    const paint=()=>{const visible=items.slice(0,page*batchSize);container.innerHTML=rows(visible,showYear)+ (visible.length<items.length?`<button class="load-more button button-secondary" type="button">Show ${Math.min(batchSize,items.length-visible.length)} more · ${visible.length} of ${prettyCount(items.length)}</button>`:'');const more=container.querySelector('.load-more');if(more)more.addEventListener('click',()=>{page++;paint();});};paint();
  }
  async function songPanel(id, expectedRouteVersion=routeVersion) {
    const track=tracks.find(t=>t.id===id);if(!track)return missingPanel('Song not found');
    const card=window.RetroverseMusicContext?await window.RetroverseMusicContext.forTrack(track):null;
    if(expectedRouteVersion!==routeVersion)return;
    const decade=Number.isInteger(track.year)?Math.floor(track.year/10)*10:null;
    const thumbnail=imageForTrack[track.id]?`<img class="detail-thumbnail" src="${imageForTrack[track.id]}" width="480" height="360" alt="${esc(track.artist)} performing ${esc(track.title)}">`:missingThumb();
    const metadata=card?'':`<div class="metadata-grid"><div class="metadata-cell"><strong>${track.year??'—'}</strong><span>Catalog year</span></div><div class="metadata-cell"><strong>${track.peak?`#${track.peak}`:'—'}</strong><span>Best chart position</span></div><div class="metadata-cell"><strong>${track.weeks||'—'}</strong><span>Chart weeks</span></div></div>`;
    showPanel(`<span class="eyebrow">SONG DETAILS</span><div class="detail-hero">${thumbnail}<div><h2 id="panel-title">${esc(track.title)}</h2><p class="panel-subtitle"><a href="#artist/${esc(track.artistSlug)}">${esc(track.artist)}</a> · ${track.year??'Year not listed'}</p><button class="button button-primary select-song" type="button" data-track="${esc(track.id)}">Show this song on Discover</button></div></div>${metadata}<div id="music-context-slot" class="music-context-slot" hidden></div><h3>Chart history</h3>${chart(track,!card)}<div class="panel-button-row">${decade===null?'':`<a class="button button-secondary" href="#era/${decade}">${decade}s catalog</a>`}<a class="button button-secondary" href="#answers?q=${encodeURIComponent(track.title)}">Catalog lookup</a></div>${sourceNote}`,track.title);
    const contextSlot=document.getElementById('music-context-slot');
    if(contextSlot&&card)window.RetroverseMusicContext.render(contextSlot,card);
    content.querySelector('.select-song').addEventListener('click',()=>{setSelection(track);closePanel();});
  }
  function artistPanel(slug) {
    const artist=artists.find(a=>a.id===slug);if(!artist)return missingPanel('Artist not found');
    const matching=tracks.filter(t=>t.artistSlug===slug).sort((a,b)=>a.year-b.year||a.title.localeCompare(b.title));
    const total=artist.count||matching.length;
    showPanel(`<span class="eyebrow">ARTIST</span><h2 id="panel-title">${esc(artist.name)}</h2><div class="metadata-grid"><div class="metadata-cell"><strong>${prettyCount(total)}</strong><span>Catalog songs</span></div><div class="metadata-cell"><strong>${prettyCount(artist.charted||0)}</strong><span>Chart records</span></div></div><h3>Songs</h3><div id="artist-songs"></div><div class="panel-button-row"><a class="button button-secondary" href="#search?q=${encodeURIComponent(artist.name)}">Search artist</a></div>${sourceNote}`,artist.name);
    pagedList(document.getElementById('artist-songs'),matching);
  }
  function decadeCards(summary) {
    const decades=Object.keys(summary.decades).map(Number).sort((a,b)=>a-b);
    return decades.map(decade=>{const art=artForDecade[decade];return `<a class="era-card era-${decade}" href="#era/${decade}"><div class="era-image ${art?'':'era-type'}">${art?`<img src="art/eras/retroverse-era-${art}-480.webp" srcset="art/eras/retroverse-era-${art}-480.webp 480w, art/eras/retroverse-era-${art}-768.webp 768w, art/eras/retroverse-era-${art}-1280.webp 1280w" sizes="(min-width:900px) 33vw, (min-width:600px) 45vw, 90vw" width="768" height="512" alt="" loading="lazy">`:`<div class="era-record-art" aria-hidden="true"><span>${String(decade).slice(-2)}</span><i></i></div>`}<span class="era-year">${decade}s</span></div><div class="era-caption"><span>${prettyCount(summary.decades[decade])} catalog songs</span><span class="round-arrow">${icon('arrow')}</span></div></a>`;}).join('');
  }
  function renderEraIndex(summary) {document.getElementById('era-grid').innerHTML=decadeCards(summary);document.getElementById('footer-count').textContent=`${prettyCount(summary.trackCount)} songs · ${prettyCount(summary.artistCount)} artists · all listed decades`;
    // Anchor route is handled as an accessible full list in the detail panel.
  }
  function eraPanel(decade) {
    const unknown=decade==='unknown-year';
    const items=tracks.filter(t=>unknown?t.year===null:t.year>=decade&&t.year<decade+10).sort((a,b)=>a.title.localeCompare(b.title));
    if(!items.length)return missingPanel(unknown?'No songs with an unlisted year':'No songs listed for this decade');
    if(unknown){showPanel(`<div class="era-panel-banner era-type"><div class="era-record-art" aria-hidden="true"><span>?</span><i></i></div><span>Unknown year</span></div><span class="eyebrow">YEAR NOT LISTED</span><h2 id="panel-title">Unknown year</h2><div class="era-controls"><p>${prettyCount(items.length)} catalog songs · year not listed</p><label class="sr-only" for="era-sort">Sort songs</label><select id="era-sort"><option value="title">Title A–Z</option><option value="artist">Artist A–Z</option><option value="peak">Best chart position</option></select></div><div id="era-tracks"></div>${sourceNote}`,`Unknown year`);const box=document.getElementById('era-tracks');let sorted=items;pagedList(box,sorted);document.getElementById('era-sort').addEventListener('change',event=>{const mode=event.target.value;sorted=[...items].sort((a,b)=>mode==='peak'?(a.peak||999)-(b.peak||999)||a.title.localeCompare(b.title):String(a[mode]).localeCompare(String(b[mode])));pagedList(box,sorted);announcement.textContent=`Sorted ${sorted.length} songs.`;});return;}
    const art=artForDecade[decade];
    showPanel(`${art?`<div class="era-panel-banner"><img src="art/eras/retroverse-era-${art}-768.webp" alt="" width="768" height="512"><span>${decade}s</span></div>`:`<div class="era-panel-banner era-type"><div class="era-record-art" aria-hidden="true"><span>${String(decade).slice(-2)}</span><i></i></div><span>${decade}s</span></div>`}<span class="eyebrow">DECADE</span><h2 id="panel-title">${decade}s</h2><div class="era-controls"><p>${prettyCount(items.length)} catalog songs</p><label class="sr-only" for="era-sort">Sort songs</label><select id="era-sort"><option value="title">Title A–Z</option><option value="artist">Artist A–Z</option><option value="peak">Best chart position</option></select></div><div id="era-tracks"></div>${sourceNote}`,`${decade}s`);
    const box=document.getElementById('era-tracks');let sorted=items;
    pagedList(box,sorted);
    document.getElementById('era-sort').addEventListener('change',event=>{const mode=event.target.value;sorted=[...items].sort((a,b)=>mode==='peak'?(a.peak||999)-(b.peak||999)||a.title.localeCompare(b.title):String(a[mode]).localeCompare(String(b[mode])));pagedList(box,sorted);announcement.textContent=`Sorted ${sorted.length} songs.`;});
  }
  function makeSearchHash() {const p=new URLSearchParams();if(searchState.q)p.set('q',searchState.q);if(searchState.type!=='songs')p.set('type',searchState.type);if(searchState.page>1)p.set('page',String(searchState.page));return '#search'+(p.size?'?'+p.toString():'');}
  function searchPanel(params) {
    searchState={q:params.get('q')||'',type:params.get('type')==='artists'?'artists':'songs',page:Math.max(1,parseInt(params.get('page')||'1',10)||1)};
    showPanel(`<span class="eyebrow">SEARCH</span><h2 id="panel-title">Find a song or artist</h2><form class="search-form" role="search"><label class="sr-only" for="catalog-search">Song, artist, or year</label><div class="search-field">${icon('search')}<input id="catalog-search" type="search" name="q" placeholder="Song, artist, or year" value="${esc(searchState.q)}" autocomplete="off" autofocus><button type="button" class="search-clear" aria-label="Clear search">${icon('close')}</button></div></form><div class="filter-tabs" role="group" aria-label="Search result type"><button type="button" data-search-tab="songs" aria-pressed="${searchState.type==='songs'}">Songs</button><button type="button" data-search-tab="artists" aria-pressed="${searchState.type==='artists'}">Artists</button></div><div id="search-results"><p class="panel-loading" role="status">Searching catalog…</p></div>`,`Search`);
    const input=document.getElementById('catalog-search');
    const update=(replace=true)=>{searchState.q=input.value;searchState.page=1;const hash=makeSearchHash();currentHash=hash;if(replace)history.replaceState({retroverse:true},'',hash);paintSearch();};
    input.addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>update(),120);});
    content.querySelector('.search-form').addEventListener('submit',e=>{e.preventDefault();update();input.blur();});
    content.querySelector('.search-clear').addEventListener('click',()=>{input.value='';update();input.focus();});
    content.querySelectorAll('[data-search-tab]').forEach(button=>button.addEventListener('click',()=>{searchState.type=button.dataset.searchTab;searchState.page=1;history.pushState({retroverse:true},'',makeSearchHash());currentHash=makeSearchHash();content.querySelectorAll('[data-search-tab]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));paintSearch();}));
    paintSearch();
  }
  function paintSearch() {
    if(!tracks)return;
    const q=searchState.q.trim().toLocaleLowerCase();
    const matches=tracks.filter(t=>!q||`${t.title} ${t.artist} ${t.year}`.toLocaleLowerCase().includes(q));
    let items=matches;
    if(searchState.type==='artists') items=[...new Set(matches.map(t=>t.artistSlug))].map(id=>artistsById.get(id)).filter(Boolean).sort((a,b)=>a.name.localeCompare(b.name));
    const total=items.length,pages=Math.max(1,Math.ceil(total/batchSize));searchState.page=Math.min(searchState.page,pages);
    const visible=items.slice((searchState.page-1)*batchSize,searchState.page*batchSize);
    const countLabel=searchState.type==='songs'?'songs':'artists';
    const intro=`<p class="result-count" role="status">${prettyCount(total)} ${countLabel}${q?' found':' in catalog'} · Page ${searchState.page} of ${pages}</p>`;
    let list='';
    if(!total)list=`<div class="empty-state"><h3>No matches</h3><p>Try a different title, artist, or year.</p></div>`;
    else if(searchState.type==='songs')list=rows(visible,true,(searchState.page-1)*batchSize);
    else list=`<ul class="track-list">${visible.map(a=>`<li><a class="track-link" href="#artist/${esc(a.id)}"><span class="track-copy"><span class="track-title">${esc(a.name)}</span><span class="track-byline">${prettyCount(a.count)} catalog songs</span></span>${icon('arrow')}</a></li>`).join('')}</ul>`;
    const pager=total>batchSize?`<div class="pager"><button class="button button-secondary" data-page="${searchState.page-1}" ${searchState.page<=1?'disabled':''}>Previous</button><span>${searchState.page} / ${pages}</span><button class="button button-secondary" data-page="${searchState.page+1}" ${searchState.page>=pages?'disabled':''}>Next</button></div>`:'';
    const box=document.getElementById('search-results');if(box){box.innerHTML=intro+list+pager;box.querySelectorAll('[data-page]').forEach(b=>b.addEventListener('click',()=>{searchState.page=Number(b.dataset.page);const hash=makeSearchHash();currentHash=hash;history.pushState({retroverse:true},'',hash);paintSearch();box.scrollIntoView({block:'nearest'});}));}
  }
  function answerPanel(params) {
    const q=params.get('q')||'';
    showPanel(`<span class="eyebrow">CATALOG LOOKUP</span><h2 id="panel-title">Catalog lookup</h2><form class="answer-form"><label for="answer-query">Song or artist</label><div class="answer-input-row"><input id="answer-query" value="${esc(q)}" placeholder="e.g. Blue Monday" autocomplete="off"><button class="button button-primary" type="submit">Look up</button></div></form><div id="answer-result" aria-live="polite"></div>${sourceNote}`,`Catalog lookup`);
    const form=content.querySelector('.answer-form');form.addEventListener('submit',e=>{e.preventDefault();const input=document.getElementById('answer-query');const query=input.value.trim();history.replaceState({retroverse:true},'',`#answers?q=${encodeURIComponent(query)}`);answer(query);});
    if(q)answer(q);
  }
  function answer(query) {
    const box=document.getElementById('answer-result');if(!box)return;
    const normalized=query.toLocaleLowerCase().replace(/[?!.]/g,'').trim();
    if(!normalized){box.innerHTML='<p class="answer-note">Enter a song or artist to look it up.</p>';return;}
    const exact=tracks.filter(t=>t.title.toLocaleLowerCase()===normalized||`${t.title} ${t.artist}`.toLocaleLowerCase()===normalized);
    const artistExact=artists.find(a=>a.name.toLocaleLowerCase()===normalized);
    const candidates=exact.length?exact:artistExact?tracks.filter(t=>t.artistSlug===artistExact.id):tracks.filter(t=>t.title.toLocaleLowerCase().includes(normalized)||t.artist.toLocaleLowerCase().includes(normalized)).slice(0,8);
    if(!candidates.length){box.innerHTML='<div class="empty-state"><h3>No catalog match</h3><p>Try a song or artist name.</p></div>';return;}
    if(candidates.length>1){box.innerHTML=`<p class="result-count">${candidates.length} possible matches</p>${rows(candidates.slice(0,8))}`;return;}
    const t=candidates[0];box.innerHTML=`<article class="answer-card"><span class="eyebrow">CATALOG FACTS</span><h3>${esc(t.title)}</h3><p>${esc(t.artist)} · ${t.year}</p><dl><div><dt>Best chart position</dt><dd>${t.peak?`#${t.peak}`:'Not listed'}</dd></div><div><dt>Listed chart weeks</dt><dd>${t.weeks||'Not listed'}</dd></div><div><dt>First chart date</dt><dd>${date(t.firstChart)}</dd></div></dl><a class="text-link" href="#song/${esc(t.id)}">Song details ${icon('arrow')}</a></article>`;
  }
  function rankerPanel(params) {
    const yearParam=Number(params.get('year'));const supported=[...new Set(tracks.map(t=>t.year).filter(Number.isInteger))].sort((a,b)=>a-b);const year=supported.includes(yearParam)?yearParam:supported.at(-1);
    const list=tracks.filter(t=>t.year===year).sort((a,b)=>(a.peak||999)-(b.peak||999)||b.weeks-a.weeks||a.title.localeCompare(b.title));
    showPanel(`<span class="eyebrow">CATALOG RANKINGS</span><h2 id="panel-title">Chart peaks by year</h2><p class="small-note">Sorted by best listed position and chart weeks.</p><label class="year-select-label" for="ranker-year">Catalog year</label><select id="ranker-year">${supported.map(y=>`<option value="${y}" ${y===year?'selected':''}>${y}</option>`).join('')}</select><p class="result-count">${prettyCount(list.length)} songs · best peak first</p><div id="ranker-list"></div>${sourceNote}`,`Rankings ${year}`);
    pagedList(document.getElementById('ranker-list'),list);
    document.getElementById('ranker-year').addEventListener('change',e=>{const next=`#ranker?year=${e.target.value}`;currentHash=next;history.pushState({retroverse:true},'',next);renderRoute();});
  }
  function livePanel() {const t=latestLiveTrack;showPanel(`<span class="eyebrow">LIVE STATUS</span><h2 id="panel-title">${esc(latestFeedState==='fresh'?'Now playing':latestFeedState==='stale'?'Live feed is stale':latestFeedState==='idle'?'No song playing':latestFeedState==='checking'?'Checking live feed':'Live feed unavailable')}</h2><div class="status-card">${t?`<p><strong>${esc(t.title)}</strong> · ${esc(t.artist)}${t.year?` · ${t.year}`:''}</p><p class="small-note">Last update: ${esc(t.timestamp)}</p>`:''}</div><div class="panel-button-row"><a class="button button-primary" href="#">Return to archive selection</a></div>`,`Live status`);}
  function erasPanel(summary) {showPanel(`<span class="eyebrow">BROWSE BY YEAR</span><h2 id="panel-title">All decades</h2><p class="small-note">Songs with no listed year stay in the catalog and are available in Unknown year.</p><div class="panel-era-grid">${decadeCards(summary)}<a class="era-card unknown-year-card" href="#era/unknown-year"><div class="era-image era-type"><div class="era-record-art" aria-hidden="true"><span>?</span><i></i></div><span class="era-year">Unknown year</span></div><div class="era-caption"><span>${prettyCount(summary.unknownYearCount)} catalog songs</span><span class="round-arrow">${icon('arrow')}</span></div></a></div>${sourceNote}`,`All decades`);}
  function missingPanel(title) {showPanel(`<span class="eyebrow">RETROVERSE CATALOG</span><h2 id="panel-title">${esc(title)}</h2><p class="panel-subtitle">This record could not be found in the catalog.</p><div class="panel-button-row"><a class="button button-primary" href="#search">Search the catalog ${icon('search')}</a></div>`,title);}
  function errorPanel(retry) {showPanel(`<span class="eyebrow">CATALOG</span><h2 id="panel-title">Catalog unavailable</h2><div class="error-state"><p>The catalog could not be opened. Check the connection and try again.</p><button type="button" class="button button-primary" id="retry-catalog">Try again</button></div>`,`Catalog unavailable`);document.getElementById('retry-catalog').addEventListener('click',retry);}
  async function renderRoute() {
    const version=++routeVersion,hash=currentHash||'';updateNav(hash);
    if(!isPanel(hash)){if(dialog.open)dialog.close();document.body.classList.remove('body-modal-open');document.title=pageTitle;if(hash==='#eras')requestAnimationFrame(()=>document.getElementById('eras').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'}));else if(!hash||hash==='#')window.scrollTo({top:0,behavior:'instant'});syncShowcaseRotation();return;}
    syncShowcaseRotation();
    const [path,queryString='']=hash.slice(1).split('?');const [route,routeId='']=path.split('/');const params=new URLSearchParams(queryString);
    if(route==='live')return livePanel();
    if(route==='live-song')return liveSongRoute(version);
    if(route==='eras-index'){try{return erasPanel(await loadOverview());}catch{return errorPanel(renderRoute);}}
    if(route==='eras')return erasPanel(await loadOverview());
    if(route==='search'||route==='song'||route==='artist'||route==='era'||route==='answers'||route==='ranker'){
      if(!tracks)showPanel('<h2 id="panel-title">Catalog</h2><p class="panel-loading" role="status">Opening catalog…</p>','Catalog',false);
      try{await loadCatalog();}catch{return errorPanel(renderRoute);}
      if(version!==routeVersion||!currentHash.includes(route))return;
      if(route==='song')await songPanel(decodeURIComponent(routeId),version);
      else if(route==='artist')artistPanel(decodeURIComponent(routeId));
      else if(route==='era')eraPanel(routeId==='unknown-year'?'unknown-year':Number(routeId));
      else if(route==='search')searchPanel(params);
      else if(route==='answers')answerPanel(params);
      else if(route==='ranker')rankerPanel(params);
      return;
    }
    if(route==='eras-index')return;
    missingPanel('Page not found');
  }
  async function liveSongRoute(version) {
    const current=latestLiveTrack;
    if(!current){livePanel();return;}
    if(latestFeedState==='fresh'&&window.RetroverseMusicContext){
      const card=await window.RetroverseMusicContext.forLive(current);
      if(version!==routeVersion||currentHash!=='#live-song')return;
      if(card){
        const search=`#search?q=${encodeURIComponent(`${current.title} ${current.artist}`)}`;
        showPanel(`<span class="eyebrow">SONG + ARTIST HISTORY</span><h2 id="panel-title">${esc(current.title)}</h2><p class="panel-subtitle">${esc(current.artist)} · ${card.year}</p><div id="live-music-context-slot" class="music-context-slot"></div><div class="panel-button-row"><a class="button button-secondary" href="${search}">Search catalog</a></div>`,current.title);
        window.RetroverseMusicContext.render(document.getElementById('live-music-context-slot'),card);
        return;
      }
    }
    if(!tracks)showPanel('<h2 id="panel-title">Catalog</h2><p class="panel-loading" role="status">Finding song…</p>','Catalog',false);
    try{await loadCatalog();}catch{return errorPanel(renderRoute);}
    if(version!==routeVersion||currentHash!=='#live-song')return;
    const byId=current.id?tracks.find(track=>track.id===current.id):null;
    if(byId){await songPanel(byId.id,version);return;}
    const norm=value=>String(value??'').normalize('NFKC').trim().toLocaleLowerCase();
    const matches=tracks.filter(track=>norm(track.title)===norm(current.title)&&norm(track.artist)===norm(current.artist));
    if(matches.length===1){await songPanel(matches[0].id,version);return;}
    searchPanel(new URLSearchParams({q:`${current.title} ${current.artist}`}));
  }
  document.addEventListener('click',event=>{const link=event.target.closest('a[href^="#"]');if(!link||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||event.button!==0)return;event.preventDefault();navigate(link.getAttribute('href'),link);});
  document.querySelector('[data-open-search]').addEventListener('click',event=>navigate('#search',event.currentTarget));
  document.getElementById('archive-return').addEventListener('click',returnToArchive);
  document.getElementById('show-live-song').addEventListener('click',()=>{manualArchiveMode=false;if(latestLiveTrack)showLiveTrack(latestLiveTrack);});
  document.querySelector('.panel-close').addEventListener('click',closePanel);
  dialog.addEventListener('cancel',event=>{event.preventDefault();closePanel();});
  dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const b=dialog.getBoundingClientRect();if(event.clientX<b.left||event.clientX>b.right||event.clientY<b.top||event.clientY>b.bottom)closePanel();});
  backButton.addEventListener('click',()=>{const previous=backStack.pop();if(!previous)return closePanel();history.replaceState({retroverse:true},'',previous);currentHash=previous;renderRoute();});
  window.addEventListener('popstate',()=>{currentHash=location.hash;backStack=[];renderRoute();});
  window.addEventListener('hashchange',()=>{if(currentHash!==location.hash){currentHash=location.hash;backStack=[];renderRoute();}});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState!=='visible')stopShowcaseRotation();else {latestFeedState='checking';liveMessage('checking');void pollLiveFeed();}});
  const motionPreference=matchMedia('(prefers-reduced-motion: reduce)');
  motionPreference.addEventListener?.('change',syncShowcaseRotation);
  if ('IntersectionObserver' in window) new IntersectionObserver(entries=>{showcaseHeroVisible=Boolean(entries[0]?.isIntersecting);syncShowcaseRotation();},{threshold:0.25}).observe(document.getElementById('hero-media'));
  loadOverview().then(renderEraIndex).catch(()=>{document.getElementById('era-grid').innerHTML='<p class="catalog-status">Decade counts unavailable.</p>';});
  pollLiveFeed(); window.setInterval(()=>{if(document.visibilityState==='visible')void pollLiveFeed();},livePollMs);
  renderRoute();
})();
