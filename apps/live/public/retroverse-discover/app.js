'use strict';
(() => {
  const dialog = document.getElementById('detail-dialog');
  const content = document.getElementById('panel-content');
  const backButton = document.querySelector('.panel-back');
  const announcement = document.getElementById('announcement');
  const pageTitle = 'Music';
  const artForDecade = {};
  const imageForTrack = {};
  const batchSize = 24;
  const liveFeedUrl = '/api/sunday-nights/current';
  const livePollMs = 7000, liveFreshnessMs = 25 * 60_000, showcaseIntervalMs = 28000;
  const discovery = window.RetroverseDiscoveryHelpers;
  const livePollGate = discovery.createSingleFlightPollGate();
  let pauseStorage=null;try{pauseStorage=window.sessionStorage;}catch{}
  const liveDisplay=window.RetroverseLiveDisplay.create({storage:pauseStorage});
  const songResearch = window.RetroverseSongResearch?.createController({fetch:(...args)=>fetch(...args)});
  let searchChat = null, sampleThemeActive = false;
  let tracks = null, artists = null, artistsById = null, catalogPromise = null, overview = null;
  let catalogReviewActive = false;
  let routeVersion = 0, currentHash = location.hash, backStack = [], lastTrigger = null;
  let liveMode = false, manualArchiveMode = false, latestLiveTrack = null, latestFeedState = 'checking', lastFeedSuccess = 0, heroDisplayVersion = 0, firstLiveCheckSettled = false;
  // Three full public reads per selection, only on existing visible feed polls.
  const liveMediaMaxAttempts = 3, liveMediaTimeoutMs = 5000;
  let liveMediaKey = null, liveMediaAttempts = 0, liveMediaGeneration = 0, liveMediaPending = null, failedLiveHeroUrl = null;
  let showcaseTimer = 0, showcaseCards = null, showcaseLoading = null, showcaseIndex = -1, showcaseDisplayed = false, showcaseHeroVisible = true;
  let searchState = {q:'',type:'songs',page:1}, searchTimer;
  let displayedTrack = null;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon = name => `<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const prettyCount = value => Number(value).toLocaleString('en-US');
  const date = value => value ? new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'}).format(new Date(`${value}T12:00:00Z`)) : 'Not listed';
  const sourceNote = '';

  // Fit the complete homepage label group, not independent arbitrary height caps.
  // Normal content retains the doubled CSS size. Long labels shrink together;
  // no scrolling, clipping, or ellipsis is needed at supported viewports.
  function fitPosterTitle(title) {
    const copy=document.querySelector('.feature-copy');
    const labels=[title,document.getElementById('hero-artist'),document.getElementById('hero-year')].filter(Boolean);
    if(!copy||!title||typeof window.getComputedStyle!=='function'||copy.clientWidth<=0)return;
    for(const label of labels)label.style.fontSize='';
    const sizes=labels.map(label=>parseFloat(window.getComputedStyle(label).fontSize));
    if(sizes.some(size=>!Number.isFinite(size)||size<=0))return;
    const fits=()=>copy.scrollHeight<=copy.clientHeight+1&&copy.scrollWidth<=copy.clientWidth+1;
    if(fits())return;
    const apply=scale=>labels.forEach((label,i)=>{label.style.fontSize=`${sizes[i]*scale}px`;});
    let low=.01,high=1;
    apply(low);
    for(let step=0;step<14;step++){
      const scale=(low+high)/2;apply(scale);
      if(fits())low=scale;else high=scale;
    }
    apply(low);
  }
  function installPosterTitleFit() {
    const title=document.getElementById('featured-title'),artist=document.getElementById('hero-artist'),feature=document.querySelector('.feature');
    if(!title || !feature || typeof title.getBoundingClientRect!=='function' || typeof window.requestAnimationFrame!=='function')return;
    let queued=false;
    const schedule=()=>{if(queued)return;queued=true;window.requestAnimationFrame(()=>{queued=false;fitPosterTitle(title);});};
    if(typeof window.ResizeObserver==='function'){let lastSize;new window.ResizeObserver(entries=>{const rect=entries[0]?.contentRect,key=`${rect?.width}:${rect?.height}`;if(key!==lastSize){lastSize=key;schedule();}}).observe(feature);}
    if(typeof window.MutationObserver==='function')new window.MutationObserver(schedule).observe(document.querySelector('.feature-copy'),{childList:true,characterData:true,subtree:true});
    window.addEventListener('resize',schedule);
    window.addEventListener('retroverse:feed-state',schedule);
    window.addEventListener('retroverse:route-changed',schedule);
    document.addEventListener('visibilitychange',schedule);
    window.visualViewport?.addEventListener('resize',schedule);
    document.fonts?.ready?.then(schedule);
    schedule();
  }
  installPosterTitleFit();

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
  const isPanel = hash => hash && hash !== '#' && hash !== '#eras' && hash !== '#main';
  function updateNav(hash) {
    const active = hash.startsWith('#era') ? 'eras' : hash.startsWith('#search') ? 'search' : hash === '#live' ? 'live' : 'discover';
    document.querySelectorAll('[data-nav]').forEach(a => a.dataset.nav === active ? a.setAttribute('aria-current','page') : a.removeAttribute('aria-current'));
    document.querySelectorAll('.desktop-nav a').forEach(a => a.classList.toggle('current', a.hash === (active === 'eras' ? '#eras' : active === 'live' ? '#live' : '')));
  }
  function navigate(hash, trigger) {
    if (trigger) lastTrigger = trigger;
    if (hash === currentHash && isPanel(hash)) return;
    if (isPanel(currentHash)) backStack.push(currentHash); else backStack = [];
    history.pushState({retroverse:true,panels:[...backStack]},'',hash || location.pathname + location.search);
    currentHash = hash; return renderRoute();
  }
  function closePanel() {
    songResearch?.cancel();searchChat?.cancel();restoreSampleTheme();
    routeVersion++;clearTimeout(searchTimer);
    if (dialog.open) dialog.close();
    document.body.classList.remove('body-modal-open'); backStack=[];
    history.replaceState(null,'',location.pathname + location.search); currentHash=''; updateNav(''); document.title=pageTitle; window.dispatchEvent(new Event("retroverse:route-changed"));
    if (lastTrigger && lastTrigger.isConnected && !dialog.contains(lastTrigger)) lastTrigger.focus({preventScroll:true});
    else document.querySelector('[data-open-search]').focus({preventScroll:true});
    syncShowcaseRotation();
  }
  function showPanel(html,title,focus=true) {
    content.innerHTML=html; backButton.hidden=backStack.length===0; backButton.setAttribute('aria-label','Back to previous panel');
    if (!dialog.open) dialog.showModal();
    document.body.classList.add('body-modal-open'); document.title=title;
    dialog.scrollTop=0;
    if(focus){const target=content.querySelector('[autofocus]')||content.querySelector('h2');if(target){if(target.tagName!=='INPUT')target.tabIndex=-1;target.focus({preventScroll:true});}}
  }
  function missingThumb(track={}) { return `<div class="record-sleeve" role="img" aria-label="Record sleeve illustration, not original artwork"><div class="vinyl-disc" aria-hidden="true"></div><span class="sleeve-year">${Number.isInteger(track.year)?track.year:'MUSIC'}</span></div>`; }
  function journeyCards(track) {
    const points=(track.chart||[]).filter(r=>discovery.validChartDate(r[0]));
    const peak=points.reduce((best,row)=>!best||row[1]<best[1]?row:best,null);
    return `<nav class="journey-grid" aria-label="Keep exploring"><a class="journey-card journey-artist" href="#artist/${esc(track.artistSlug)}"><small>THE ARTIST</small><strong>${esc(discovery.displayArtist(track))}</strong></a>${Number.isInteger(track.year)?`<a class="journey-card journey-year" href="#year/${track.year}"><small>THE YEAR</small><strong>${track.year}</strong></a>`:''}${peak?`<a class="journey-card journey-week" href="#week/${peak[0]}"><small>THE CHART WEEK</small><strong>#${peak[1]}</strong><span>${esc(date(peak[0]))} →</span></a>`:''}</nav>`;
  }
  function yearChartWeeks(year) {
    const weeks=new Map();
    for(const track of tracks) for(const point of track.chart||[]) {
      if(!Array.isArray(point)||!discovery.validChartDate(point[0])||Number(point[0].slice(0,4))!==year||!Number.isInteger(point[1])||point[1]<1||point[1]>100)continue;
      if(!weeks.has(point[0]))weeks.set(point[0],new Set());
      weeks.get(point[0]).add(point[1]);
    }
    return [...weeks].sort(([a],[b])=>a.localeCompare(b)).map(([week,positions])=>({week,count:positions.size}));
  }
  function yearPortalArt(kind) {
    const approved=window.RetroverseDecadeIcons?.render(kind,Number(document.documentElement?.dataset?.decade));
    if(approved)return approved;
    const drawings={
      music:'<circle cx="82" cy="64" r="49" fill="currentColor"/><g fill="none" stroke="var(--cream)" opacity=".4"><circle cx="82" cy="64" r="40"/><circle cx="82" cy="64" r="34"/><circle cx="82" cy="64" r="28"/></g><circle cx="82" cy="64" r="18" fill="var(--accent)"/><circle cx="82" cy="64" r="4" fill="var(--cream)"/><path d="m18 24 7 8 10-1-7 8 2 10-9-6-9 5 3-10-6-8 10 1Z" fill="var(--accent)"/>',
      movies:'<rect x="29" y="44" width="104" height="66" rx="7" fill="var(--cream)" stroke="currentColor" stroke-width="5"/><path d="m26 29 101-17 5 28L31 57Z" fill="currentColor"/><path d="m39 27 17 25m7-29 17 25m7-29 17 25m7-29 17 25" stroke="var(--cream)" stroke-width="9"/><path d="m73 65 23 14-23 14Z" fill="currentColor"/>',
      tv:'<path d="m61 15 21 19 24-23" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/><rect x="22" y="35" width="119" height="74" rx="16" fill="var(--accent)" stroke="currentColor" stroke-width="5"/><rect x="33" y="45" width="78" height="53" rx="12" fill="var(--cream)" stroke="currentColor" stroke-width="4"/><path d="M48 56h48M44 65h53M44 74h53M48 83h48" stroke="currentColor" opacity=".25" stroke-width="3"/><g fill="currentColor"><circle cx="125" cy="54" r="5"/><circle cx="125" cy="72" r="5"/></g><path d="m44 109-5 9m80-9 5 9" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>'
    };
    return `<svg class="year-portal-art" viewBox="0 0 164 128" aria-hidden="true">${drawings[kind]}</svg>`;
  }
  function updateHomeYearLinks(year) {
    const nav=document.getElementById('hero-year-links');if(!nav)return;
    const valid=Number.isInteger(year)&&year>=1900&&year<=2100;
    nav.hidden=true;nav.innerHTML='';
    const area=document.getElementById('hero-year-area');if(area)area.hidden=!valid;
  }
  function popStandYearHref(year, track = null) {
    const identity=track?JSON.stringify([track.id||'',track.artist||'',track.title||'']):'';
    return window.RetroversePopStand.hrefForYear(year,identity);
  }
  function yearPanel(year) {
    if(!Number.isInteger(year)||year<1900||year>2100)return missingPanel('Year not found');
    const track=displayedTrack?.year===year?displayedTrack:null;
    const href=popStandYearHref(year,track);
    if(href){location.replace(href);return;}
    showPanel(`<h2 id="panel-title">PopStand · ${year}</h2><p>PopStand covers 1950–2025. There is no issue for ${year} in this edition.</p><a class="text-link" href="/popstand/index.html#/">Browse PopStand</a>`,`PopStand · ${year}`);
  }
  function weekPanel(week) {
    if(!discovery.validChartDate(week))return missingPanel('Chart week not found');
    const items=tracks.flatMap(t=>{const point=(t.chart||[]).find(r=>r[0]===week);return point?[{...t,weekRank:point[1]}]:[];}).sort((a,b)=>a.weekRank-b.weekRank);
    showPanel(`<section class="chapter-banner chapter-week"><span class="eyebrow">Top 100</span><h2 id="panel-title">${esc(date(week))}</h2>${items.length<100?`<p class="small-note">${items.length} of 100 positions available</p>`:''}</section><ol class="week-records">${items.map(t=>`<li><span class="week-rank">${t.weekRank}</span><a href="#song/${esc(t.id)}"><strong>${esc(t.title)}</strong><span>${esc(discovery.displayArtist(t))}</span></a></li>`).join('')}</ol>`,date(week));
  }

  function rows(items,showYear=true,offset=0) {
    if(!items.length) return '';
    return `<ul class="track-list">${items.map((track,index)=>`<li><a class="track-link" href="#song/${esc(track.id)}"><span class="track-number" aria-hidden="true">${String(offset+index+1).padStart(2,'0')}</span><span class="track-copy"><span class="track-title">${esc(track.title)}</span><span class="track-byline">${esc(discovery.displayArtist(track))}</span></span>${showYear?`<span class="track-year">${track.year??'—'}</span>`:''}${icon('arrow')}</a></li>`).join('')}</ul>`;
  }
  function chart(track, showDateRange=true) {
    const points=Array.isArray(track.chart)?track.chart.filter(r=>Array.isArray(r)&&discovery.validChartDate(r[0])&&Number.isInteger(r[1])&&r[1]>=1&&r[1]<=100):[];
    if(!points.length)return '<p class="small-note">No weekly chart positions are listed for this song.</p>';
    const coords=points.map((r,i)=>[32+i*(456/Math.max(points.length-1,1)),16+(r[1]-1)*1.65]);
    const peak=points.reduce((best,r,i)=>r[1]<points[best][1]?i:best,0);
    const dateRange=showDateRange?`<div class="chart-dates"><span>${date(points[0][0])}</span><span>${date(points.at(-1)[0])}</span></div>`:'';
    return `<div class="chart-wrap"><svg viewBox="0 0 510 195" role="img" aria-label="${esc(track.title)}: ${points.length} listed weeks, best position ${points[peak][1]}.">${[1,50,100].map(rank=>`<line x1="32" y1="${16+(rank-1)*1.65}" x2="488" y2="${16+(rank-1)*1.65}" stroke="#d6cfbf" stroke-dasharray="3 5"/><text x="4" y="${20+(rank-1)*1.65}" fill="#586663" font-size="10">${rank}</text>`).join('')}<polyline points="${coords.map(p=>p.join(',')).join(' ')}" fill="none" stroke="#176b6c" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>${coords.map((p,i)=>`<circle cx="${p[0]}" cy="${p[1]}" r="${i===peak?5:2.5}" fill="${i===peak?'#d83c20':'#176b6c'}" stroke="#fffaf0" stroke-width="1.5"/>`).join('')}</svg>${dateRange}</div><details class="chart-details"><summary>View weekly positions</summary><table><thead><tr><th scope="col">Week of</th><th scope="col">Position</th></tr></thead><tbody>${points.map(r=>{const href=discovery.chartWeekHref(track.id,r[0],r[1]);return `<tr><td>${href?`<a class="chart-week-link" href="#week/${esc(r[0])}" aria-label="Open chart week ${esc(date(r[0]))}, position ${r[1]}">${esc(date(r[0]))}</a>`:esc(date(r[0]))}</td><td>${r[1]}</td></tr>`;}).join('')}</tbody></table></details>`;
  }
  function reviewTrackId(pageLocation=location) {
    try {
      const origin=new URL(pageLocation.origin),values=new URLSearchParams(pageLocation.search||'').getAll('review-track');
      return origin.protocol==='http:'&&['127.0.0.1','localhost','[::1]'].includes(origin.hostname)&&values.length===1&&/^RVTR[0-9]{6}$/.test(values[0])?values[0]:null;
    } catch { return null; }
  }
  async function startCatalogReview(id) {
    catalogReviewActive=true;manualArchiveMode=true;
    const banner=document.getElementById('catalog-review-banner');banner.hidden=false;
    document.body.classList.add('is-catalog-review');
    try {
      const data=await loadCatalog(),track=data.tracks.find(item=>item.id===id);
      if(!track){banner.querySelector('strong').textContent='Catalog preview unavailable';return;}
      setSelection(track);
      const fallback=document.querySelector('.thumbnail-fallback');
      if(!imageForTrack[track.id]){fallback.hidden=false;fallback.textContent='Video still unavailable in this preview';}
      document.title=`${track.title} · Catalog design preview`;
    } catch { banner.querySelector('strong').textContent='Catalog preview unavailable'; }
  }
  function selectionId() { try { return localStorage.getItem('retroverse-selected-song') || 'RVTR607320'; } catch { return 'RVTR607320'; } }
  function setSelection(track) {
    invalidateLiveMedia();
    heroDisplayVersion++;
    try { localStorage.setItem('retroverse-selected-song',track.id); } catch {}
    liveMode=false; manualArchiveMode=true; document.getElementById('hero-mode-label').textContent='ARCHIVE SELECTION'; document.getElementById('archive-return').hidden=true; document.getElementById('show-live-song').hidden=!latestLiveTrack; document.getElementById('hero-artist-link').hidden=false;
    document.querySelector('.still-label').textContent='ARCHIVE IMAGE'; document.getElementById('live-track-status').textContent='';
    if(latestFeedState==='fresh')document.getElementById('live-feed-badge').textContent='LIVE FEED CONNECTED';
    updateHero(track); announcement.textContent=`${track.title} by ${track.artist} selected.`;
    syncShowcaseRotation();
  }
  function themeYear(track) { const usable=y=>Number.isInteger(y)&&y>=1900&&y<=2100;return usable(track?.vdjYear)?track.vdjYear:(usable(track?.year)?track.year:null); }
  function themeIdentity(track) { return JSON.stringify([track?.id||'',track?.artist||'',track?.title||'']); }
  function updateHero(track) {
    displayedTrack=track;document.getElementById('hero-screen').href='#search';
    const archiveVersion=++heroDisplayVersion;
    window.RetroverseDecadeTheme?.controller.setYear(themeYear(track),themeIdentity(track));
    document.getElementById('live-notes').hidden=true;document.getElementById('live-tags').textContent='';
    document.getElementById('featured-title').textContent=track.title;
    const artist=document.getElementById('hero-artist');artist.textContent=discovery.displayArtist(track);artist.href=`#artist/${encodeURIComponent(track.artistSlug)}`;
    document.getElementById('hero-year').textContent=Number.isInteger(track.year)?track.year:'';
    const yearLink=document.getElementById('hero-year');if(Number.isInteger(track.year)){yearLink.href=popStandYearHref(track.year,track)||`#year/${track.year}`;yearLink.setAttribute('aria-label',`PopStand · ${track.year}`);}else{yearLink.removeAttribute('href');yearLink.removeAttribute('aria-label');}
    updateHomeYearLinks(track.year);
    document.getElementById('hero-year-stamp').innerHTML=track.year?`<span>${String(track.year).slice(0,2)}</span><span>${String(track.year).slice(-2)}</span>${icon('record')}`:'';
    const songLink=document.getElementById('hero-song-link');songLink.href=`#song/${encodeURIComponent(track.id)}`;document.getElementById('hero-title-link').href=songLink.href;songLink.innerHTML=`Song details${icon('arrow')}`;
    document.getElementById('hero-artist-link').href=`#artist/${encodeURIComponent(track.artistSlug)}`;
    const thumb=document.getElementById('hero-thumbnail'),fallback=document.querySelector('.thumbnail-fallback');
    thumb.onerror=null;thumb.onload=null;
    if(imageForTrack[track.id]) {thumb.onerror=()=>{if(archiveVersion!==heroDisplayVersion||liveMode)return;thumb.hidden=true;fallback.hidden=true;fallback.textContent='';};thumb.fetchPriority='high';thumb.src=imageForTrack[track.id];thumb.alt=`${track.artist} performing ${track.title}.`;thumb.hidden=false;fallback.hidden=true;}
    else {thumb.hidden=true;fallback.hidden=false;fallback.textContent='';}
    document.getElementById('hero-media-note').textContent='';
  }
  function resolveLivePayload(payload, now=Date.now()) {
    const live = payload?.live;
    const classification=window.RetroverseMusicContext?.classifyLive(live,now,liveFreshnessMs);
    if(!classification)return {state:'invalid'};
    if(!['fresh','idle','stale'].includes(classification.state))return classification;
    // Decode only safe, real bridge identity for presentation during a pause.
    // A paused card never receives a research authorization token.
    const parsed=typeof live?.bridgeTimestamp==='string'?Date.parse(live.bridgeTimestamp):NaN;
    const hasIdentity=typeof live?.title==='string'&&live.title.trim()&&typeof live?.artist==='string'&&live.artist.trim()&&!/^drag a song on this deck to load it$/i.test(live.title.trim());
    const markerTime=live.playing===false&&Object.prototype.hasOwnProperty.call(live,'bridgeStoppedAt')?Date.parse(live.bridgeStoppedAt):parsed;
    if(!Number.isFinite(markerTime)||markerTime>now+(live.playing?120_000:0))return {state:'invalid'};
    const marker={source:live.source,playing:live.playing,timestamp:new Date(markerTime).toISOString()};
    if(classification.state!=='fresh'&&(!hasIdentity||!Number.isFinite(parsed)))return {...classification,marker};
    const candidateIds=[payload.publicSong?.rvtr,payload.track?.rvtr,live.rvtr,payload.currentTrackId];
    const id=candidateIds.find(value=>typeof value==='string'&&/^RVTR\d{6}$/i.test(value))?.toUpperCase()||null;
    return {state:classification.state,marker,track:{startedAt:typeof live.startedAt==='string'&&Number.isFinite(Date.parse(live.startedAt))?new Date(live.startedAt).toISOString():null,researchSelectionToken:classification.state==='fresh'&&window.RetroverseSongResearch?.validToken(live.researchSelectionToken)?live.researchSelectionToken:null,...(Object.prototype.hasOwnProperty.call(live,'vdjYear')?{vdjYear:Number.isInteger(live.vdjYear)&&live.vdjYear>=1900&&live.vdjYear<=2100?live.vdjYear:null}:{}),id, title:live.title.trim(), artist:live.artist.trim(), year:Number.isInteger(live.vdjYear)&&live.vdjYear>=1900&&live.vdjYear<=2100?live.vdjYear:(Number.isInteger(live.year)?live.year:(Number.isInteger(payload.publicSong?.year)?payload.publicSong.year:null)), timestamp:new Date(parsed).toISOString(), notes:discovery.publicLiveNotes(payload), heroUrl:safeLiveHeroUrl(payload.publicSong?.heroUrl)}};
  }
  function safeLiveHeroUrl(value) {
    if(typeof value!=='string'||value.length>2048||/[\\\u0000-\u0020]/.test(value))return null;
    try {
      const url=new URL(value,location.origin),page=new URL(location.origin);
      const loopback=['localhost','127.0.0.1','[::1]'].includes(page.hostname);
      const publicPreview=loopback&&url.origin==='https://retroverse.live';
      if((url.origin!==location.origin&&!publicPreview)||url.username||url.password||url.hash||url.pathname!=='/api/experience/visual-asset'||url.searchParams.getAll('file').length!==1||url.searchParams.getAll('rvtr').length!==1||url.searchParams.get('file')!=='hero-video.jpg'||!/^(?:VDJ-[0-9A-F]{16}|RVTR[0-9]{6})$/i.test(url.searchParams.get('rvtr')||''))return null;
      if((url.protocol!=='https:'&&!(loopback&&url.origin===page.origin&&url.protocol==='http:'))||[...url.searchParams.keys()].some(key=>key!=='file'&&key!=='rvtr'))return null;
      return publicPreview?url.href:`${url.pathname}${url.search}`;
    } catch { return null; }
  }
  function stopShowcaseRotation() { if (showcaseTimer) window.clearTimeout(showcaseTimer); showcaseTimer = 0; }
  // Unlabelled HOME must never substitute automatic archive/showcase metadata.
  function showcaseDisplayAllowed() { return false; }
  function showcaseRotationAllowed() { return false; }
  function paintShowcaseCard() { return false; }
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
  function clearAutomaticHero() {
    displayedTrack=null;document.getElementById('hero-screen').removeAttribute('href');
    heroDisplayVersion++;liveMode=false;stopShowcaseRotation();
    for(const id of ['featured-title','hero-artist','hero-year','hero-year-stamp'])document.getElementById(id).textContent='';
    for(const id of ['hero-title-link','hero-artist','hero-year'])document.getElementById(id).removeAttribute('href');
    updateHomeYearLinks(null);
    const thumb=document.getElementById('hero-thumbnail');thumb.hidden=true;thumb.onerror=null;thumb.onload=null;thumb.removeAttribute('src');thumb.alt='';
    const fallback=document.querySelector('.thumbnail-fallback');fallback.hidden=true;fallback.textContent='';
    document.getElementById('hero-media-note').textContent='';
    document.getElementById('archive-return').hidden=true;document.getElementById('show-live-song').hidden=true;
  }
  function liveMessage(state, detail, candidate=null, marker=null) {
    latestFeedState=state;
    const displayState=liveDisplay.update(state,candidate||latestLiveTrack,marker);
    if(displayState==='paused'&&!manualArchiveMode){
      const prior=candidate?discovery.mergeLiveEnrichment(latestLiveTrack,candidate):(latestLiveTrack||liveDisplay.retainedTrack());
      // Keep the visual card, never its previous live research authorization.
      const held=prior?{...prior,researchSelectionToken:null}:null;
      if(held&&(!liveMode||liveTrackKey(held)!==liveTrackKey(latestLiveTrack)||displayedTrack?.researchSelectionToken))showLiveTrack(held);
      document.getElementById('hero-mode-label').textContent='LAST PLAYED';
    }
    window.dispatchEvent(new CustomEvent("retroverse:feed-state", {detail:{state:displayState,feedState:state}}));
    if(state!=='fresh'){songResearch?.cancel();if(!isLocalChatFixture())searchChat?.cancel();invalidateLiveMedia();}
    if(state!=='fresh'&&state!=='checking'){document.getElementById('live-notes').hidden=true;document.getElementById('live-tags').textContent='';}
    if(state!=='fresh'&&displayState!=='paused'&&!manualArchiveMode)clearAutomaticHero();
    const badge=document.getElementById('live-feed-badge'), label=document.getElementById('live-track-status');
    const title=document.getElementById('live-strip-title'), copy=document.getElementById('live-strip-copy'), mark=document.getElementById('live-mark');
    const texts={checking:['CHECKING','Checking…','Checking',''],fresh:['LIVE NOW','Now playing','Connected',''],stale:['STALE','Live feed stale','Stale','Last report is older than 25 minutes.'],offline:['OFFLINE','Live feed unavailable','Offline','Retrying automatically.'],idle:['NOT PLAYING','No song playing','Connected',''],unavailable:['STATUS UNKNOWN','Live status unavailable','Status unavailable',''],invalid:['UNAVAILABLE','Live data unavailable','Data error','']};
    const t=texts[state]||texts.offline;
    badge.textContent=state==='fresh'&&manualArchiveMode?'LIVE FEED CONNECTED':t[0];
    badge.dataset.state=state; label.textContent=detail||(state==='fresh'&&manualArchiveMode?'Archive selection kept':t[1]); title.textContent=t[2]; copy.textContent=t[3]; mark.dataset.state=state;
    if (state === 'fresh') { stopShowcaseRotation(); showcaseDisplayed=false; }
    else syncShowcaseRotation();
    return displayState;
  }
  function showLiveTrack(track) {
    displayedTrack=track;document.getElementById('hero-screen').href='#search';
    selectLiveMediaTrack(track);
    window.RetroverseDecadeTheme?.controller.setYear(themeYear(track),themeIdentity(track));
    heroDisplayVersion++;
    if(latestLiveTrack?.researchSelectionToken!==track.researchSelectionToken||latestLiveTrack?.title!==track.title||latestLiveTrack?.artist!==track.artist||latestLiveTrack?.id!==track.id){songResearch?.cancel();if(!isLocalChatFixture())searchChat?.cancel();}
    latestLiveTrack=track; liveMode=true;
    document.getElementById('hero-mode-label').textContent='NOW PLAYING';
    document.getElementById('archive-return').hidden=false;
    document.getElementById('show-live-song').hidden=true;
    document.getElementById('hero-year').textContent=Number.isInteger(track.year)?track.year:'';
    const yearLink=document.getElementById('hero-year');if(Number.isInteger(track.year)){yearLink.href=popStandYearHref(track.year,track)||`#year/${track.year}`;yearLink.setAttribute('aria-label',`PopStand · ${track.year}`);}else{yearLink.removeAttribute('href');yearLink.removeAttribute('aria-label');}
    updateHomeYearLinks(track.year);
    document.getElementById('hero-year-stamp').innerHTML=track.year?`<span>${String(track.year).slice(0,2)}</span><span>${String(track.year).slice(-2)}</span>${icon('record')}`:'';
    document.getElementById('featured-title').textContent=track.title;
    const notes=document.getElementById('live-notes'); notes.hidden=false; notes.textContent=track.notes?.comment||'No public DJ note supplied for this song.';
    const tags=document.getElementById('live-tags'); tags.innerHTML=(track.notes?.tags||[]).map(tag=>`<span>${esc(tag)}</span>`).join('');
    const artist=document.getElementById('hero-artist'); artist.textContent=track.artist; artist.href=`#search?type=artists&q=${encodeURIComponent(track.artist)}`;
    const song=document.getElementById('hero-song-link'); song.href='#live-song';document.getElementById('hero-title-link').href=song.href; song.textContent='Find in catalog';
    document.getElementById('hero-artist-link').hidden=true;
    const thumb=document.getElementById('hero-thumbnail'), fallback=document.querySelector('.thumbnail-fallback'), stillLabel=document.querySelector('.still-label'), mediaNote=document.getElementById('hero-media-note');
    const heroVersion=heroDisplayVersion;
    if(track.heroUrl&&track.heroUrl!==failedLiveHeroUrl){
      thumb.fetchPriority='high';thumb.alt=`Video frame for ${track.title} by ${track.artist}.`;thumb.hidden=!(thumb.getAttribute('src')===track.heroUrl&&thumb.complete&&thumb.naturalWidth>0);fallback.hidden=true;stillLabel.textContent='LIVE STILL';mediaNote.textContent='';thumb.onload=()=>{if(heroVersion===heroDisplayVersion&&liveMode&&thumb.getAttribute('src')===track.heroUrl){failedLiveHeroUrl=null;thumb.hidden=false;}};thumb.onerror=()=>{if(heroVersion!==heroDisplayVersion||!liveMode)return;failedLiveHeroUrl=track.heroUrl;thumb.hidden=true;fallback.hidden=false;fallback.textContent='';stillLabel.textContent='LIVE';mediaNote.textContent='';};thumb.src=track.heroUrl;
    } else {
      thumb.hidden=true;fallback.hidden=false;fallback.textContent='';stillLabel.textContent='LIVE';mediaNote.textContent='';thumb.onerror=null;thumb.onload=null;thumb.removeAttribute('src');
    }
    document.getElementById('live-track-status').textContent=`Updated ${new Intl.DateTimeFormat('en-US',{hour:'numeric',minute:'2-digit'}).format(new Date(track.timestamp))}`;
    void loadCatalog().then(({tracks:all})=>{
      if(heroVersion!==heroDisplayVersion||!liveMode)return;
      const exact=discovery.exactTitleArtistMatches(all,track.title,track.artist);
      const matches=track.id?exact.filter(t=>t.id===track.id):exact;
      if(matches.length!==1)return;
      const match=matches[0];song.href=`#song/${encodeURIComponent(match.id)}`;document.getElementById('hero-title-link').href=song.href;song.textContent='Explore this song';
      artist.href=`#artist/${encodeURIComponent(match.artistSlug)}`;
      const artistLink=document.getElementById('hero-artist-link');artistLink.href=artist.href;artistLink.hidden=false;
    }).catch(()=>{});

  }
  function restoreArchiveDisplay() {
    displayedTrack=null;document.getElementById('hero-screen').removeAttribute('href');
    const restoreVersion=++heroDisplayVersion;
    liveMode=false; document.getElementById('hero-mode-label').textContent='ARCHIVE SELECTION';
    document.getElementById('archive-return').hidden=true; document.getElementById('show-live-song').hidden=latestFeedState!=='fresh'||!latestLiveTrack; document.getElementById('hero-artist-link').hidden=false;
    document.querySelector('.still-label').textContent='ARCHIVE IMAGE'; document.querySelector('.thumbnail-fallback').textContent='';
    document.getElementById('featured-title').textContent='';
    document.getElementById('hero-title-link').removeAttribute('href');
    document.getElementById('hero-artist').textContent=''; document.getElementById('hero-artist').removeAttribute('href');
    document.getElementById('hero-year').removeAttribute('href');document.getElementById('hero-year').textContent=''; document.getElementById('hero-year-stamp').textContent='';
    updateHomeYearLinks(null);
    document.getElementById('hero-song-link').href='#'; document.getElementById('hero-song-link').innerHTML=`Song details${icon('arrow')}`;
    document.getElementById('live-track-status').textContent='';
    document.getElementById('hero-thumbnail').hidden=true; document.querySelector('.thumbnail-fallback').hidden=false;
    document.getElementById('hero-media-note').textContent='';
    loadCatalog().then(({tracks:all})=>{if(restoreVersion!==heroDisplayVersion)return;const chosen=all.find(t=>t.id===selectionId())||all.find(t=>t.id==='RVTR607320');if(chosen)updateHero(chosen);}).catch(()=>{});
  }
  function returnToArchive() { invalidateLiveMedia();manualArchiveMode=true; if(latestFeedState==='fresh')document.getElementById('live-feed-badge').textContent='LIVE FEED CONNECTED'; restoreArchiveDisplay(); }
  async function pollLiveFeed() {
    if(catalogReviewActive)return;
    if(document.visibilityState&&document.visibilityState!=='visible')return;
    const pollToken=livePollGate.begin();
    if(pollToken===null)return;
    const isCurrentPoll=()=>livePollGate.isCurrent(pollToken);
    try {
      const response=await fetch(`${liveFeedUrl}?view=identity&ts=${Date.now()}`,{cache:'no-store',mode:'cors',headers:{Accept:'application/json'}});
      if(!isCurrentPoll())return;
      if(!response.ok){liveMessage('offline');settleFirstLiveCheck(false);return;}
      let payload; try{payload=await response.json();}catch{if(!isCurrentPoll())return;liveMessage('invalid');settleFirstLiveCheck(false);return;}
      if(!isCurrentPoll())return;
      if(!payload||typeof payload!=='object'||Array.isArray(payload)){liveMessage('invalid');settleFirstLiveCheck(false);return;}
      lastFeedSuccess=Date.now();
      const result=resolveLivePayload(payload);
      if(result.state==='fresh'){
        const track=discovery.mergeLiveEnrichment(latestLiveTrack,result.track);
        const selectionChanged=liveTrackKey(latestLiveTrack)!==liveTrackKey(track);
        const changed=selectionChanged||latestLiveTrack?.vdjYear!==track.vdjYear||latestLiveTrack?.year!==track.year||latestLiveTrack?.timestamp!==track.timestamp||latestLiveTrack?.heroUrl!==track.heroUrl||JSON.stringify(latestLiveTrack?.notes)!==JSON.stringify(track.notes);
        if(selectionChanged)songResearch?.cancel();
        selectLiveMediaTrack(track);latestLiveTrack=track;
        if(!manualArchiveMode)window.RetroverseDecadeTheme?.controller.setYear(themeYear(track),themeIdentity(track));
        if(!manualArchiveMode&&(!liveMode||changed||latestFeedState!=='fresh'))showLiveTrack(track);
        liveMessage('fresh');settleFirstLiveCheck(true);
        if(selectionChanged&&!manualArchiveMode&&!isLocalChatFixture()&&currentHash.startsWith('#search')&&searchState.autoCurrent){if(document.getElementById('chat-conversation'))searchPanel(new URLSearchParams());else{searchState.q=`${track.title} ${track.artist}`;const input=document.getElementById('catalog-search');if(input)input.value=searchState.q;paintSearch();}}
        if(changed&&currentHash==='#live-song')void liveSongRoute(++routeVersion);
        if(payload.identityOnly===true)void enrichLiveMedia(track);
        return;
      }
      const displayState=liveMessage(result.state,null,result.track,result.marker);settleFirstLiveCheck(displayState==='paused');
    } catch(error) {
      if(!isCurrentPoll())return;
      liveMessage('offline');settleFirstLiveCheck(false);
    } finally {
      livePollGate.finish(pollToken);
    }
  }
  function liveTrackKey(track) {
    return track?JSON.stringify([track.id??null,track.title,track.artist,track.researchSelectionToken??null,track.startedAt??null]):null;
  }
  function matchesLiveMediaSelection(expected,actual) {
    // Full public payloads may omit the identity-only research token or resolve
    // a previously unknown canonical ID. Neither changes our current identity.
    return expected.title===actual.title&&expected.artist===actual.artist&&
      (!expected.id||!actual.id||expected.id===actual.id)&&
      (!actual.researchSelectionToken||expected.researchSelectionToken===actual.researchSelectionToken)&&
      (expected.startedAt??null)===(actual.startedAt??null);
  }
  function invalidateLiveMedia() {
    liveMediaGeneration++;
    liveMediaPending?.controller.abort();
  }
  function selectLiveMediaTrack(track) {
    const key=liveTrackKey(track);
    if(key===liveMediaKey)return;
    invalidateLiveMedia();liveMediaKey=key;liveMediaAttempts=0;failedLiveHeroUrl=null;
  }
  async function enrichLiveMedia(track) {
    // This reads only the public current feed. It never starts song research.
    // A heartbeat can advance while media is loading; merge into the newest
    // identity rather than reverting notes, VDJ year, or timestamp to this tick.
    const key=liveTrackKey(track);
    if(document.visibilityState!=='visible'||manualArchiveMode||!liveMode||latestFeedState!=='fresh'||key!==liveMediaKey||key!==liveTrackKey(latestLiveTrack)||liveMediaPending||liveMediaAttempts>=liveMediaMaxAttempts||(track.heroUrl&&track.heroUrl!==failedLiveHeroUrl))return;
    const request={controller:new AbortController(),generation:liveMediaGeneration,key};
    liveMediaPending=request;liveMediaAttempts++;
    const timer=setTimeout(()=>request.controller.abort(),liveMediaTimeoutMs);
    const isCurrent=()=>!request.controller.signal.aborted&&liveMediaPending===request&&request.generation===liveMediaGeneration&&request.key===liveTrackKey(latestLiveTrack)&&liveMode&&!manualArchiveMode&&latestFeedState==='fresh'&&document.visibilityState==='visible';
    try {
      const response=await fetch(`${liveFeedUrl}?ts=${Date.now()}`,{cache:'no-store',headers:{Accept:'application/json'},signal:request.controller.signal});
      if(!isCurrent()||!response.ok)return;
      const payload=await response.json();
      if(!isCurrent()||payload?.identityOnly===true)return;
      const fullLive=payload?.live;
      if(Object.prototype.hasOwnProperty.call(fullLive||{},'researchSelectionToken')&&(typeof fullLive.researchSelectionToken!=='string'||!/^[a-f0-9]{64}$/.test(fullLive.researchSelectionToken)||fullLive.researchSelectionToken!==track.researchSelectionToken))return;
      const result=resolveLivePayload(payload);
      if(result.state!=='fresh'||!matchesLiveMediaSelection(track,result.track)||Date.parse(result.track.timestamp)<Date.parse(track.timestamp))return;
      const current=latestLiveTrack;
      const enriched={...current,heroUrl:current.heroUrl&&current.heroUrl!==failedLiveHeroUrl?current.heroUrl:(result.track.heroUrl||current.heroUrl),year:current.year??result.track.year};
      if(enriched.heroUrl!==current.heroUrl||enriched.year!==current.year||(enriched.heroUrl&&enriched.heroUrl===failedLiveHeroUrl)){failedLiveHeroUrl=null;showLiveTrack(enriched);}
    } catch { /* Keep the live identity; another visible poll may use the budget. */ }
    finally {clearTimeout(timer);if(liveMediaPending===request)liveMediaPending=null;}
  }
  function applySavedHero() { if(manualArchiveMode)restoreArchiveDisplay(); }
  function settleFirstLiveCheck(isFresh) {if(firstLiveCheckSettled)return;firstLiveCheckSettled=true;if(!isFresh&&!manualArchiveMode)clearAutomaticHero();}
  function pagedList(container,items,showYear=true) {
    let page=1;
    const paint=()=>{const visible=items.slice(0,page*batchSize);container.innerHTML=rows(visible,showYear)+ (visible.length<items.length?`<button class="load-more button button-secondary" type="button">Show ${Math.min(batchSize,items.length-visible.length)} more · ${visible.length} of ${prettyCount(items.length)}</button>`:'');const more=container.querySelector('.load-more');if(more)more.addEventListener('click',()=>{page++;paint();});};paint();
  }
  async function songPanel(id, expectedRouteVersion=routeVersion) {
    const track=tracks.find(t=>t.id===id);if(!track)return missingPanel('Song not found');
    const card=null;
    if(expectedRouteVersion!==routeVersion)return;
    const decade=Number.isInteger(track.year)?Math.floor(track.year/10)*10:null;
    const thumbnail=imageForTrack[track.id]?`<img class="detail-thumbnail" src="${imageForTrack[track.id]}" width="480" height="360" alt="${esc(track.artist)} performing ${esc(track.title)}">`:missingThumb(track);
    const metadata=card?'':`<div class="metadata-grid"><div class="metadata-cell"><strong>${track.year??'—'}</strong><span>Catalog year</span></div><div class="metadata-cell"><strong>${track.peak?`#${track.peak}`:'—'}</strong><span>Best chart position</span></div><div class="metadata-cell"><strong>${track.weeks||'—'}</strong><span>Chart weeks</span></div></div>`;
    showPanel(`<div class="detail-hero">${thumbnail}<div><h2 id="panel-title">${esc(track.title)}</h2><p class="panel-subtitle"><a href="#artist/${esc(track.artistSlug)}">${esc(discovery.displayArtist(track))}</a> · ${track.year??'Year not listed'}</p><button class="button button-primary select-song" type="button" data-track="${esc(track.id)}">Show song</button></div></div>${metadata}${journeyCards(track)}<div id="music-context-slot" class="music-context-slot" hidden></div><h3>Chart history</h3>${chart(track,!card)}${storyConnection(track)}${sameTitleCardSection(track)}<div class="panel-button-row">${decade===null?'':`<a class="button button-secondary" href="#era/${decade}">${decade}s catalog</a>`}<a class="button button-secondary" href="#answers?q=${encodeURIComponent(track.title)}">Catalog lookup</a></div>${sourceNote}`,track.title);
    const contextSlot=document.getElementById('music-context-slot');
    if(contextSlot&&window.RetroverseMusicContext)void window.RetroverseMusicContext.forTrack(track).then(card=>{if(card&&expectedRouteVersion===routeVersion&&contextSlot.isConnected)window.RetroverseMusicContext.render(contextSlot,card);}).catch(()=>{});
    content.querySelector('.select-song').addEventListener('click',()=>{setSelection(track);closePanel();});
  }
  function storyConnection(track) {
    const connection=window.RetroverseEditorial?.forTrack(track.id);if(!connection)return '';
    const related=connection.relatedIds.filter(id=>id!==track.id).map(id=>tracks.find(t=>t.id===id)).filter(Boolean);
    return `<section class="story-connection" aria-label="Music and film connection"><span class="eyebrow">FOLLOW THE STORY · FILM</span><h3>${esc(connection.title)}</h3><p>${esc(connection.copy)}</p><div class="story-records">${related.map(t=>`<a href="#song/${esc(t.id)}">${esc(t.title)} ${icon('arrow')}</a>`).join('')}</div><p class="story-caption">Explore the songs in our catalog. Soundtrack appearances may be different recordings or excerpts.</p><div class="story-sources">${connection.sources.map(source=>`<a href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">${esc(source.label)}</a>`).join('')}</div></section>`;
  }
  function sameTitleCardSection(track) {
    const matches=discovery.sameTitleTracks(tracks,track);
    if(!matches.length)return '';
    return `<section class="same-title-section" aria-labelledby="same-title-heading"><h3 id="same-title-heading">Other records with this title</h3><div class="same-title-grid">${matches.map(item=>`<article class="same-title-card"><a class="same-title-song" href="#song/${esc(item.id)}">${esc(item.title)}</a><a class="same-title-artist" href="#artist/${esc(item.artistSlug)}">${esc(discovery.displayArtist(item))}</a><span>${Number.isInteger(item.year)?item.year:'Year not listed'}${item.peak?` · Peak #${item.peak}`:''}${item.weeks?` · ${item.weeks} weeks`:''}</span></article>`).join('')}</div></section>`;
  }
  function artistPanel(slug) {
    const artist=artists.find(a=>a.id===slug);if(!artist)return missingPanel('Artist not found');
    const matching=tracks.filter(t=>t.artistSlug===slug).sort((a,b)=>a.year-b.year||a.title.localeCompare(b.title));
    const total=artist.count||matching.length;
    const credits=[...new Set(matching.map(discovery.displayArtist))];
    const artistLabel=credits.length===1?credits[0]:artist.name;
    showPanel(`<h2 id="panel-title">${esc(artistLabel)}</h2><div class="metadata-grid"><div class="metadata-cell"><strong>${prettyCount(total)}</strong><span>Catalog songs</span></div><div class="metadata-cell"><strong>${prettyCount(artist.charted||0)}</strong><span>Chart records</span></div></div><h3>Songs</h3><div id="artist-songs"></div><div class="panel-button-row"><a class="button button-secondary" href="#search?q=${encodeURIComponent(artist.name)}">Search artist</a></div>${sourceNote}`,artist.name);
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
    if(unknown){showPanel(`<div class="era-panel-banner era-type"><div class="era-record-art" aria-hidden="true"><span>?</span><i></i></div><span>Unknown year</span></div><h2 id="panel-title">Unknown year</h2><div class="era-controls"><p>${prettyCount(items.length)} catalog songs · year not listed</p><label class="sr-only" for="era-sort">Sort songs</label><select id="era-sort"><option value="title">Title A–Z</option><option value="artist">Artist A–Z</option><option value="peak">Best chart position</option></select></div><div id="era-tracks"></div>${sourceNote}`,`Unknown year`);const box=document.getElementById('era-tracks');let sorted=items;pagedList(box,sorted);document.getElementById('era-sort').addEventListener('change',event=>{const mode=event.target.value;sorted=[...items].sort((a,b)=>mode==='peak'?(a.peak||999)-(b.peak||999)||a.title.localeCompare(b.title):String(a[mode]).localeCompare(String(b[mode])));pagedList(box,sorted);announcement.textContent=`Sorted ${sorted.length} songs.`;});return;}
    const art=artForDecade[decade];
    showPanel(`${art?`<div class="era-panel-banner"><img src="art/eras/retroverse-era-${art}-768.webp" alt="" width="768" height="512"><span>${decade}s</span></div>`:`<div class="era-panel-banner era-type"><div class="era-record-art" aria-hidden="true"><span>${String(decade).slice(-2)}</span><i></i></div><span>${decade}s</span></div>`}<h2 id="panel-title">${decade}s</h2><div class="era-controls"><p>${prettyCount(items.length)} catalog songs</p><label class="sr-only" for="era-sort">Sort songs</label><select id="era-sort"><option value="title">Title A–Z</option><option value="artist">Artist A–Z</option><option value="peak">Best chart position</option></select></div><div id="era-tracks"></div>${sourceNote}`,`${decade}s`);
    const box=document.getElementById('era-tracks');let sorted=items;
    pagedList(box,sorted);
    document.getElementById('era-sort').addEventListener('change',event=>{const mode=event.target.value;sorted=[...items].sort((a,b)=>mode==='peak'?(a.peak||999)-(b.peak||999)||a.title.localeCompare(b.title):String(a[mode]).localeCompare(String(b[mode])));pagedList(box,sorted);announcement.textContent=`Sorted ${sorted.length} songs.`;});
  }
  function makeSearchHash() {const p=new URLSearchParams();if(searchState.q)p.set('q',searchState.q);if(searchState.type!=='songs')p.set('type',searchState.type);if(searchState.page>1)p.set('page',String(searchState.page));return '#search'+(p.size?'?'+p.toString():'');}
  function restoreSampleTheme() {
    if(!sampleThemeActive)return;
    sampleThemeActive=false;window.RetroverseDecadeTheme?.controller.setYear(themeYear(displayedTrack),themeIdentity(displayedTrack));
  }
  function isLocalChatFixture() {return ['localhost','127.0.0.1'].includes(location.hostname)&&new URLSearchParams(location.search).get('chatFixture')==='1';}
  function insertSearchStill(slot,url,track) {
    const src=safeLiveHeroUrl(url);if(!src)return;
    const answer=slot.querySelector('.search-chat-assistant');if(!answer)return;
    const walker=document.createTreeWalker(answer,NodeFilter.SHOW_TEXT);let text;
    while((text=walker.nextNode())){const cut=text.data.indexOf('\n\n');if(cut<0)continue;
      const remainder=text.splitText(cut+2),figure=document.createElement('figure'),img=document.createElement('img');
      figure.className='chat-video-still';img.src=src;img.alt=`Video still from ${track?.title||'the current song'}${track?.artist?' - '+track.artist:''}`;img.width=720;img.height=406;img.loading='lazy';img.decoding='async';img.referrerPolicy='no-referrer';img.onerror=()=>figure.remove();figure.appendChild(img);remainder.parentNode.insertBefore(figure,remainder);break;
    }
  }
  function insertSearchPortrait(slot) {
    const answer=slot.querySelector('.search-chat-assistant');if(!answer||answer.querySelector('.chat-artist-portrait'))return;
    const walker=document.createTreeWalker(answer,NodeFilter.SHOW_TEXT);let text;
    while((text=walker.nextNode())){const cut=text.data.indexOf('\n\n');if(cut<0)continue;
      const remainder=text.splitText(cut+2),figure=document.createElement('figure'),img=document.createElement('img'),caption=document.createElement('figcaption'),source=document.createElement('a');
      figure.className='chat-artist-portrait';figure.setAttribute('aria-label','Billy Preston artist portrait');
      img.src='art/people/billy-preston-1974.jpg';img.alt='Artist portrait of Billy Preston in the Oval Office, December 13, 1974.';img.width=2072;img.height=2816;img.loading='lazy';img.decoding='async';img.referrerPolicy='no-referrer';img.onerror=()=>figure.remove();
      caption.textContent='Artist portrait · Billy Preston, 1974. Photo: David Hume Kennerly / White House, courtesy Gerald R. Ford Library. Public domain. ';
      source.href='https://commons.wikimedia.org/wiki/File:Billy_Preston.jpg';source.textContent='Portrait source and rights';source.target='_blank';source.rel='noopener noreferrer';source.referrerPolicy='no-referrer';caption.appendChild(source);figure.appendChild(img);figure.appendChild(caption);remainder.parentNode.insertBefore(figure,remainder);break;
    }
  }
  function searchPanel(params) {
    searchChat?.cancel();
    if(params.get('type')==='artists'||params.get('catalog')==='1'||!window.RetroverseSearchChat)return catalogSearchPanel(params);
    const fixture=isLocalChatFixture();
    const prepared=fixture&&new URLSearchParams(location.search).get('sample')==='preston';
    const track=prepared?{title:'My Sweet Lord',artist:'Billy Preston',researchSelectionToken:'a'.repeat(64)}:displayedTrack;
    const initial=params.get('q')||(track?[track.title,track.artist].filter(Boolean).join(' - '):'');
    if(prepared){sampleThemeActive=true;window.RetroverseDecadeTheme?.controller.setYear(1970,'prepared-preston-sample');}
    searchState={autoCurrent:!params.has('q'),q:initial,type:'songs',page:1};
    showPanel(`<section class="search-page chat-search-page"><div class="search-page-inner"><h2 id="panel-title" class="sr-only">Search</h2><form class="search-form" role="search"><label class="sr-only" for="chat-query">Search or ask a question</label><div class="search-field"><input id="chat-query" type="search" maxlength="300" name="q" placeholder="Search or ask a question" value="${esc(initial)}" autocomplete="off"><button class="search-submit" type="submit" aria-label="Search">${icon('arrow')}</button></div></form>${fixture?`<p class="chat-demo-label">${prepared?'Prepared sample · not live AI':'Demo answers'}</p>`:''}<div id="chat-conversation" class="search-answer chat-conversation" aria-live="polite"></div><form class="chat-reply-form"><label class="sr-only" for="chat-reply">Ask a follow-up</label><input id="chat-reply" maxlength="300" placeholder="Ask anything" autocomplete="off"><button type="submit" aria-label="Send follow-up">${icon('arrow')}</button></form></div></section>`,`Search`);
    backButton.hidden=false;backButton.setAttribute('aria-label',backStack.length?'Back to previous panel':'Close search');
    const token=track?.researchSelectionToken||(fixture?'a'.repeat(64):null),version=routeVersion;
    const isCurrent=()=>version===routeVersion&&currentHash.startsWith('#search')&&(fixture||displayedTrack?.title===track?.title&&displayedTrack?.artist===track?.artist&&displayedTrack?.researchSelectionToken===token);
    const slot=document.getElementById('chat-conversation');
    const showWaiting=()=>{slot.textContent=token?'The live song changed or is unavailable. Open Search again.':'Search needs a current live song. Open Search again when the live feed reconnects.';slot.hidden=false;};
    searchChat=window.RetroverseSearchChat.createController({request:fixture?(prepared?window.RetroverseSearchChat.createPreparedSampleRequest():window.RetroverseSearchChat.createMockRequest()):window.RetroverseSearchChat.createHttpRequest(),onChange:state=>{if(version!==routeVersion)return;if(state.status==='idle'){showWaiting();return;}window.RetroverseSearchChat.render(slot,state,{onFollowup:q=>{searchState.autoCurrent=false;void searchChat.ask(q);}});if(prepared)insertSearchPortrait(slot);else insertSearchStill(slot,track?.heroUrl,track);}});
    const query=document.getElementById('chat-query'),reply=document.getElementById('chat-reply');
    content.querySelector('.search-form').addEventListener('submit',event=>{event.preventDefault();if(!token){showWaiting();return;}searchState.autoCurrent=false;searchState.q=query.value;void searchChat.newQuery(query.value);query.blur();});
    content.querySelector('.chat-reply-form').addEventListener('submit',event=>{event.preventDefault();if(!token){showWaiting();return;}const value=reply.value;reply.value='';searchState.autoCurrent=false;void searchChat.ask(value);reply.blur();});
    if(token&&track){searchChat.open({selectionToken:token,title:track.title,artist:track.artist,isCurrent});
      if(params.has('q')&&initial!==[track.title,track.artist].filter(Boolean).join(' - '))void searchChat.newQuery(initial);
    }else showWaiting();
  }
  function catalogSearchPanel(params) {
    searchState={autoCurrent:!params.has('q'),q:params.has('q')?params.get('q'):(displayedTrack?`${displayedTrack.title} ${displayedTrack.artist}`:''),type:params.get('type')==='artists'?'artists':'songs',page:Math.max(1,parseInt(params.get('page')||'1',10)||1)};
    showPanel(`<section class="search-page"><div class="search-page-inner"><h2 id="panel-title" class="search-masthead">SEARCH</h2><form class="search-form" role="search"><label class="sr-only" for="catalog-search">Song, artist, or year</label><div class="search-field"><input id="catalog-search" type="search" name="q" placeholder="Song, artist, or year" value="${esc(searchState.q)}" autocomplete="off" autofocus><button type="button" class="search-edit" aria-label="Edit search">${icon('edit')}</button><button type="button" class="search-clear" aria-label="Clear search">${icon('close')}</button><button class="search-submit" type="submit" aria-label="Search">${icon('arrow')}</button></div></form><div id="search-results"><p class="panel-loading" role="status">Searching catalog…</p></div><details class="search-options"><summary>Browse songs & artists</summary><div class="filter-tabs" role="group" aria-label="Search result type"><button type="button" data-search-tab="songs" aria-pressed="${searchState.type==='songs'}">Songs</button><button type="button" data-search-tab="artists" aria-pressed="${searchState.type==='artists'}">Artists</button></div><nav class="search-suggestions" aria-label="Search ideas"><a href="#search?q=The%20Graduate">The Graduate</a><a href="#search?q=Simon%20%26%20Garfunkel">Simon &amp; Garfunkel</a><a href="#search?q=1965">1965</a></nav></details></div></section>`,`Search`);
    backButton.hidden=false;backButton.setAttribute('aria-label',backStack.length?'Back to previous panel':'Close search');
    const input=document.getElementById('catalog-search');
    content.querySelector('.search-edit').addEventListener('click',()=>{input.focus();input.select();});
    const update=(replace=true)=>{searchState.autoCurrent=false;searchState.q=input.value;searchState.page=1;const hash=makeSearchHash();currentHash=hash;if(replace)history.replaceState({retroverse:true,panels:[...backStack]},'',hash);paintSearch();};
    input.addEventListener('input',()=>{songResearch?.cancel();searchState.autoCurrent=false;clearTimeout(searchTimer);searchTimer=setTimeout(()=>update(),120);});
    content.querySelector('.search-form').addEventListener('submit',e=>{e.preventDefault();update();input.blur();});
    content.querySelector('.search-clear').addEventListener('click',()=>{input.value='';update();input.focus();});
    content.querySelectorAll('[data-search-tab]').forEach(button=>button.addEventListener('click',()=>{searchState.type=button.dataset.searchTab;searchState.page=1;history.pushState({retroverse:true,panels:[...backStack]},'',makeSearchHash());currentHash=makeSearchHash();content.querySelectorAll('[data-search-tab]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));paintSearch();}));
    paintSearch();
  }
  // Artist browsing must not derive matches from unrelated song titles.
  function searchArtists(query, entities) {
    const normalizeName=value=>String(value??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/&/g,' and ').toLocaleLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
    const key=normalizeName(query),words=key.split(/\s+/).filter(Boolean);
    const named=entities.map(artist=>({artist,names:[artist.name,discovery.displayArtistEntity(artist)].map(normalizeName)}));
    const exact=key?named.filter(entry=>entry.names.includes(key)):[];
    const found=exact.length?exact:named.filter(entry=>!key||entry.names.some(name=>words.every(word=>name.includes(word))));
    return found.map(entry=>entry.artist).sort((a,b)=>discovery.displayArtistEntity(a).localeCompare(discovery.displayArtistEntity(b)));
  }
  function paintSearch() {
    if(!tracks)return;
    const q=searchState.q.trim().toLocaleLowerCase();
    const matches=tracks.filter(t=>discovery.matchesTrackQuery(t,q));
    let items=matches;
    if(searchState.type==='artists') items=searchArtists(searchState.q,artists);
    const total=items.length,pages=Math.max(1,Math.ceil(total/batchSize));searchState.page=Math.min(searchState.page,pages);
    const visible=items.slice((searchState.page-1)*batchSize,searchState.page*batchSize);
    const countLabel=searchState.type==='songs'?'songs':'artists';
    const intro=`<p class="result-count" role="status">${prettyCount(total)} ${countLabel}${q?' found':' in catalog'} · Page ${searchState.page} of ${pages}</p>`;
    let list='';
    if(!total)list=`<div class="empty-state"><h3>No matches</h3><p>Try a different title, artist, or year.</p></div>`;
    else if(searchState.type==='songs')list=rows(visible,true,(searchState.page-1)*batchSize);
    else list=`<ul class="track-list">${visible.map(a=>`<li><a class="track-link" href="#artist/${esc(a.id)}"><span class="track-copy"><span class="track-title">${esc(discovery.displayArtistEntity(a))}</span><span class="track-byline">${prettyCount(a.count)} catalog songs</span></span>${icon('arrow')}</a></li>`).join('')}</ul>`;
    const pager=total>batchSize?`<div class="pager"><button class="button button-secondary" data-page="${searchState.page-1}" ${searchState.page<=1?'disabled':''}>Previous</button><span>${searchState.page} / ${pages}</span><button class="button button-secondary" data-page="${searchState.page+1}" ${searchState.page>=pages?'disabled':''}>Next</button></div>`:'';
    // Use an answer card only for an unambiguous record, never guess a recording.
    const currentQuery=latestLiveTrack?`${latestLiveTrack.title} ${latestLiveTrack.artist}`.toLocaleLowerCase():null;
    const exactCurrent=q===currentQuery?discovery.exactTitleArtistMatches(matches,latestLiveTrack.title,latestLiveTrack.artist).filter(t=>!latestLiveTrack.id||t.id===latestLiveTrack.id):[];
    const exactTitle=matches.filter(t=>t.title.toLocaleLowerCase()===q);
    const selected=searchState.type==='songs'&&q?(q===currentQuery?(exactCurrent.length===1?exactCurrent[0]:null):exactTitle.length===1?exactTitle[0]:matches.length===1?matches[0]:null):null;
    const answer=selected?`<article class="search-answer"><span class="eyebrow">CATALOG FACTS</span><h3>${esc(selected.title)}</h3><p class="search-answer-artist">${esc(discovery.displayArtist(selected))}</p><div class="search-answer-facts"><p>${Number.isInteger(selected.year)?`Catalog year: <strong>${selected.year}</strong>.`:'A release year is not listed.'}</p><p>${selected.peak?`Best listed Top 100 position: <strong>#${selected.peak}</strong>.`:'No chart peak is listed.'} ${selected.weeks?`${selected.weeks} chart weeks.`:''}</p></div><div id="song-research-slot" hidden aria-live="polite"></div><a class="text-link" href="#song/${esc(selected.id)}">Explore the record ${icon('arrow')}</a></article><nav class="search-followups" aria-label="Keep exploring"><a href="#artist/${esc(selected.artistSlug)}" aria-label="More about ${esc(discovery.displayArtist(selected))}" title="More about ${esc(discovery.displayArtist(selected))}">${discovery.displayArtist(selected).length>18?'More about this artist':`More about ${esc(discovery.displayArtist(selected))}`} ${icon('arrow')}</a>${Number.isInteger(selected.year)?`<a href="#year/${selected.year}">Explore ${selected.year} ${icon('arrow')}</a>`:`<a href="#eras-index">Explore the decades ${icon('arrow')}</a>`}</nav>`:'';
    const box=document.getElementById('search-results');if(box){box.innerHTML=answer+(answer?'':intro+list+pager);box.querySelectorAll('[data-page]').forEach(b=>b.addEventListener('click',()=>{searchState.page=Number(b.dataset.page);const hash=makeSearchHash();currentHash=hash;history.pushState({retroverse:true,panels:[...backStack]},'',hash);paintSearch();box.scrollIntoView({block:'nearest'});}));}
    const token=latestLiveTrack?.researchSelectionToken,version=routeVersion;
    if(selected&&selected.id===latestLiveTrack?.id&&q===currentQuery&&latestFeedState==='fresh'&&window.RetroverseSongResearch?.validToken(token)){
      songResearch.show({token,slot:document.getElementById('song-research-slot'),isCurrent:()=>version===routeVersion&&currentHash.startsWith('#search')&&latestFeedState==='fresh'&&latestLiveTrack?.researchSelectionToken===token&&latestLiveTrack?.id===selected.id&&searchState.type==='songs'&&searchState.q.trim().toLocaleLowerCase()===currentQuery&&document.visibilityState==='visible'});
    }else songResearch?.cancel();
  }
  function answerPanel(params) {
    const q=params.get('q')||'';
    showPanel(`<h2 id="panel-title">Catalog lookup</h2><form class="answer-form"><label for="answer-query">Song or artist</label><div class="answer-input-row"><input id="answer-query" value="${esc(q)}" placeholder="e.g. Blue Monday" autocomplete="off"><button class="button button-primary" type="submit">Look up</button></div></form><div id="answer-result" aria-live="polite"></div>${sourceNote}`,`Catalog lookup`);
    const form=content.querySelector('.answer-form');form.addEventListener('submit',e=>{e.preventDefault();const input=document.getElementById('answer-query');const query=input.value.trim();currentHash=`#answers?q=${encodeURIComponent(query)}`;history.replaceState({retroverse:true,panels:[...backStack]},'',currentHash);answer(query);});
    if(q)answer(q);
  }
  function answer(query) {
    const box=document.getElementById('answer-result');if(!box)return;
    const normalized=query.toLocaleLowerCase().replace(/[?!.]/g,'').trim();
    if(!normalized){box.innerHTML='<p class="answer-note">Enter a song or artist to look it up.</p>';return;}
    const exact=discovery.exactSongQueryMatches(tracks,query);
    const artistExact=artists.find(a=>a.name.toLocaleLowerCase()===normalized);
    const hasExactIdentity=exact.length>0||Boolean(artistExact);
    const candidates=exact.length?exact:artistExact?tracks.filter(t=>t.artistSlug===artistExact.id):tracks.filter(t=>discovery.matchesTrackQuery(t,query)).slice(0,8);
    if(!candidates.length){box.innerHTML='<div class="empty-state"><h3>No catalog match</h3><p>Try a song or artist name.</p></div>';return;}
    if(!hasExactIdentity||candidates.length>1){box.innerHTML=`<p class="result-count">${candidates.length} possible matches</p>${rows(candidates.slice(0,8))}`;return;}
    const t=candidates[0];box.innerHTML=`<article class="answer-card"><span class="eyebrow">CATALOG FACTS</span><h3>${esc(t.title)}</h3><p>${esc(discovery.displayArtist(t))} · ${t.year??'Year not listed'}</p><dl><div><dt>Best chart position</dt><dd>${t.peak?`#${t.peak}`:'Not listed'}</dd></div><div><dt>Listed chart weeks</dt><dd>${t.weeks||'Not listed'}</dd></div><div><dt>First chart date</dt><dd>${date(t.firstChart)}</dd></div></dl><a class="text-link" href="#song/${esc(t.id)}">Song details ${icon('arrow')}</a></article>`;
  }
  function rankerPanel(params) {
    const yearParam=Number(params.get('year'));const supported=[...new Set(tracks.map(t=>t.year).filter(Number.isInteger))].sort((a,b)=>a-b);const year=supported.includes(yearParam)?yearParam:supported.at(-1);
    const list=tracks.filter(t=>t.year===year).sort((a,b)=>(a.peak||999)-(b.peak||999)||b.weeks-a.weeks||a.title.localeCompare(b.title));
    showPanel(`<h2 id="panel-title">Chart peaks by year</h2><p class="small-note">Sorted by best listed position and chart weeks.</p><label class="year-select-label" for="ranker-year">Catalog year</label><select id="ranker-year">${supported.map(y=>`<option value="${y}" ${y===year?'selected':''}>${y}</option>`).join('')}</select><p class="result-count">${prettyCount(list.length)} songs · best peak first</p><div id="ranker-list"></div>${sourceNote}`,`Rankings ${year}`);
    pagedList(document.getElementById('ranker-list'),list);
    document.getElementById('ranker-year').addEventListener('change',e=>{const next=`#ranker?year=${e.target.value}`;currentHash=next;history.pushState({retroverse:true,panels:[...backStack]},'',next);renderRoute();});
  }
  function livePanel() {const t=latestLiveTrack;showPanel(`<span class="eyebrow">LIVE STATUS</span><h2 id="panel-title">${esc(latestFeedState==='fresh'?'Now playing':latestFeedState==='stale'?'Live feed is stale':latestFeedState==='idle'?'No song playing':latestFeedState==='checking'?'Checking live feed':'Live feed unavailable')}</h2><div class="status-card">${t?`<p><strong>${esc(t.title)}</strong> · ${esc(t.artist)}${t.year?` · ${t.year}`:''}</p><p class="small-note">Last update: ${esc(t.timestamp)}</p>`:''}</div><div class="panel-button-row"><a class="button button-primary" href="#">Return to archive selection</a></div>`,`Live status`);}
  function erasPanel(summary) {showPanel(`<h2 id="panel-title">All decades</h2><div class="panel-era-grid">${decadeCards(summary)}<a class="era-card unknown-year-card" href="#era/unknown-year"><div class="era-image era-type"><div class="era-record-art" aria-hidden="true"><span>?</span><i></i></div><span class="era-year">Unknown year</span></div><div class="era-caption"><span>${prettyCount(summary.unknownYearCount)} catalog songs</span><span class="round-arrow">${icon('arrow')}</span></div></a></div>${sourceNote}`,`All decades`);}
  function missingPanel(title) {showPanel(`<h2 id="panel-title">${esc(title)}</h2><p class="panel-subtitle">This record could not be found in the catalog.</p><div class="panel-button-row"><a class="button button-primary" href="#search">Search the catalog ${icon('search')}</a></div>`,title);}
  function errorPanel(retry) {showPanel(`<h2 id="panel-title">Catalog unavailable</h2><div class="error-state"><p>The catalog could not be opened. Check the connection and try again.</p><button type="button" class="button button-primary" id="retry-catalog">Try again</button></div>`,`Catalog unavailable`);document.getElementById('retry-catalog').addEventListener('click',retry);}
  async function renderRoute() {
    window.dispatchEvent(new Event("retroverse:route-changed"));
    songResearch?.cancel();searchChat?.cancel();restoreSampleTheme();
    clearTimeout(searchTimer);
    const version=++routeVersion,hash=currentHash||'';updateNav(hash);
    if(!isPanel(hash)){if(dialog.open)dialog.close();document.body.classList.remove('body-modal-open');document.title=pageTitle;if(hash==='#main'){document.getElementById('main').focus({preventScroll:true});}else if(hash==='#eras')requestAnimationFrame(()=>document.getElementById('eras').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'}));else if(!hash||hash==='#')window.scrollTo({top:0,behavior:'instant'});syncShowcaseRotation();return;}
    syncShowcaseRotation();
    const [path,queryString='']=hash.slice(1).split('?');const [route,routeId='']=path.split('/');const params=new URLSearchParams(queryString);
    let decodedRouteId;try{decodedRouteId=decodeURIComponent(routeId);}catch{return missingPanel('Invalid link');}
    if(route==='year')return yearPanel(Number(routeId));
    if(route==='live')return livePanel();
    if(route==='live-song')return liveSongRoute(version);
    if(route==='eras-index'){try{const summary=await loadOverview();if(version===routeVersion)return erasPanel(summary);return;}catch{if(version===routeVersion)return errorPanel(renderRoute);return;}}
    if(route==='eras'){try{const summary=await loadOverview();if(version===routeVersion)return erasPanel(summary);}catch{if(version===routeVersion)return errorPanel(renderRoute);}return;}
    if(route==='search'||route==='song'||route==='artist'||route==='era'||route==='week'||route==='answers'||route==='ranker'){
      if(!tracks)showPanel('<h2 id="panel-title">Catalog</h2><p class="panel-loading" role="status">Opening catalog…</p>','Catalog',false);
      try{await loadCatalog();}catch{if(version===routeVersion)return errorPanel(renderRoute);return;}
      if(version!==routeVersion||!currentHash.includes(route))return;
      if(route==='song')await songPanel(decodedRouteId,version);
      else if(route==='artist')artistPanel(decodedRouteId);
      else if(route==='era')eraPanel(routeId==='unknown-year'?'unknown-year':Number(routeId));
      else if(route==='week')weekPanel(routeId);
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
    if(!current||latestFeedState!=='fresh'){livePanel();return;}
    const stillCurrent=()=>version===routeVersion&&currentHash==='#live-song'&&latestFeedState==='fresh'&&latestLiveTrack?.id===current.id&&latestLiveTrack?.title===current.title&&latestLiveTrack?.artist===current.artist&&latestLiveTrack?.timestamp===current.timestamp;
    const query=`${current.title} ${current.artist}`;
    showPanel(`<h2 id="panel-title">${esc(current.title)}</h2><p class="panel-subtitle">${esc(current.artist)}</p>${current.notes?.comment?`<p class="dj-note">${esc(current.notes.comment)}</p>`:''}<div id="live-music-context-slot" class="music-context-slot" hidden></div><p id="live-discovery-status" class="small-note" role="status">Finding discovery links…</p><div class="panel-button-row"><a class="button button-secondary" href="#search?q=${encodeURIComponent(query)}">Search catalog</a></div>`,current.title);
    const slot=document.getElementById('live-music-context-slot');
    if(window.RetroverseMusicContext)void window.RetroverseMusicContext.forLive(current).then(card=>{if(card&&stillCurrent()&&slot?.isConnected)window.RetroverseMusicContext.render(slot,card);}).catch(()=>{});
    try{await loadCatalog();}catch{if(stillCurrent()){const status=document.getElementById('live-discovery-status');if(status)status.textContent='Discovery links are unavailable. Live song details remain above.';}return;}
    if(!stillCurrent())return;
    const byId=current.id?tracks.find(track=>track.id===current.id):null;
    if(byId&&discovery.exactTitleArtistMatches([byId],current.title,current.artist).length===1){await songPanel(byId.id,version);return;}
    const matches=discovery.exactTitleArtistMatches(tracks,current.title,current.artist);
    if(matches.length===1){await songPanel(matches[0].id,version);return;}
    // Establish the real route before the search controller checks its lifetime.
    currentHash=`#search?q=${encodeURIComponent(query)}`;
    history.replaceState({retroverse:true,panels:[...backStack]},'',currentHash);
    return renderRoute();
  }
  document.addEventListener('click',event=>{const link=event.target.closest('a[href^="#"]');if(!link||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||event.button!==0)return;event.preventDefault();navigate(link.getAttribute('href'),link);});
  document.querySelector('[data-open-search]').addEventListener('click',event=>navigate('#search',event.currentTarget));
  document.getElementById('archive-return').addEventListener('click',returnToArchive);
  document.getElementById('show-live-song').addEventListener('click',()=>{manualArchiveMode=false;if(latestLiveTrack){showLiveTrack(latestLiveTrack);void enrichLiveMedia(latestLiveTrack);}});
  document.querySelector('.panel-close').addEventListener('click',closePanel);
  dialog.addEventListener('cancel',event=>{event.preventDefault();closePanel();});
  dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const b=dialog.getBoundingClientRect();if(event.clientX<b.left||event.clientX>b.right||event.clientY<b.top||event.clientY>b.bottom)closePanel();});
  backButton.addEventListener('click',()=>{if(!backStack.length)return closePanel();history.back();});
  window.addEventListener('popstate',()=>{currentHash=location.hash;backStack=Array.isArray(history.state?.panels)?history.state.panels.filter(hash=>typeof hash==='string'&&isPanel(hash)):[];renderRoute();});
  window.addEventListener('hashchange',()=>{if(currentHash!==location.hash){currentHash=location.hash;backStack=[];renderRoute();}});
  document.addEventListener('visibilitychange',()=>{if(catalogReviewActive)return;if(document.visibilityState!=='visible'){songResearch?.cancel();searchChat?.cancel();livePollGate.invalidate();invalidateLiveMedia();stopShowcaseRotation();}else {latestFeedState='checking';liveMessage('checking');void pollLiveFeed();}});
  const motionPreference=matchMedia('(prefers-reduced-motion: reduce)');
  motionPreference.addEventListener?.('change',syncShowcaseRotation);
  if ('IntersectionObserver' in window) new IntersectionObserver(entries=>{showcaseHeroVisible=Boolean(entries[0]?.isIntersecting);syncShowcaseRotation();},{threshold:0.25}).observe(document.getElementById('hero-media'));
  window.RetroverseDecadeTheme?.controller.setYear(null);
  loadOverview().then(renderEraIndex).catch(()=>{document.getElementById('era-grid').innerHTML='<p class="catalog-status">Decade counts unavailable.</p>';});
  const reviewId=reviewTrackId();
  if(reviewId)void startCatalogReview(reviewId);
  else {pollLiveFeed();window.setInterval(()=>{if(document.visibilityState==='visible')void pollLiveFeed();},livePollMs);}
  renderRoute();
})();
