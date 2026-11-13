/* Review-only recreation from the public Muse reference. No bridge or API writes. */
(function(root){
  'use strict';
  const ID=/^[a-zA-Z0-9_-]{11}$/;
  function validate(rows){
    if(!Array.isArray(rows)||!rows.length)throw Error('No selections available');
    const codes=new Set();
    return rows.map(row=>{
      if(!row||typeof row.title!=='string'||!row.title.trim()||typeof row.artist!=='string'||!row.artist.trim()||!ID.test(row.youtubeId)||! /^[A-Z][0-9]$/.test(row.selection)||codes.has(row.selection))throw Error('Invalid selection data');
      codes.add(row.selection);return {title:row.title,artist:row.artist,selection:row.selection,youtubeId:row.youtubeId};
    });
  }
  function queues(songs){const out=[];for(let i=0;i<songs.length;i+=50)out.push('https://www.youtube.com/watch_videos?video_ids='+songs.slice(i,i+50).map(s=>s.youtubeId).join(','));return out;}
  function visible(state,hash,manual=false){return (manual||state==='idle')&&(!hash||hash==='#');}
  function createView(){let manual=false;return {open(){manual=true;},close(){manual=false;},route(hash){if(hash&&hash!=='#')manual=false;},get manual(){return manual;},visible:(state,hash)=>visible(state,hash,manual)};}
  if(typeof module==='object'&&module.exports){module.exports={validate,queues,visible,createView};return;}
  const status=document.createElement('p');status.className='jb-feed-status';status.hidden=true;status.setAttribute('role','status');document.body.append(status);
  const panel=document.createElement('section');panel.id='idle-jukebox';panel.hidden=true;panel.setAttribute('aria-label','The Daily Jukebox');
  panel.innerHTML='<div class="jb-cabinet"><div class="jb-coin" aria-hidden="true"><b>COINS</b><span>NICKELS, DIMES<br>AND QUARTERS</span></div><div class="jb-glass"><div class="jb-strips" tabindex="0" role="region" aria-label="Song selections"></div><div class="jb-sign"><small aria-hidden="true">10¢<br>PER SELECTION</small><h1>The Daily Jukebox</h1><small aria-hidden="true">3 FOR<br>25¢</small></div></div><div class="jb-divider"></div><div class="jb-pages"><button type="button" class="jb-chrome jb-prev" aria-label="Previous selections">◀</button><div class="jb-meter" aria-hidden="true"><div class="jb-rail"><i></i><b></b></div></div><button type="button" class="jb-chrome jb-next" aria-label="Next selections">▶</button></div><div class="jb-select"><div class="jb-letters"></div><div class="jb-numbers"></div><output class="jb-readout" aria-live="polite">MAKE YOUR SELECTION</output></div><div class="jb-play"></div><p class="jb-error" role="status" hidden></p></div>';
  const returnButton=document.createElement('button');returnButton.type='button';returnButton.className='jb-return';returnButton.textContent='← Return to live screen';returnButton.setAttribute('aria-label','Return to live screen');returnButton.hidden=true;panel.prepend(returnButton);
  document.body.append(panel);
  const launcher=document.createElement('button');launcher.type='button';launcher.className='jb-launcher';launcher.setAttribute('aria-label','Open jukebox');launcher.title='Open jukebox';launcher.setAttribute('aria-controls','idle-jukebox');launcher.setAttribute('aria-expanded','false');
  launcher.innerHTML='<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false"><path d="M6 28V13a10 10 0 0 1 20 0v15H6Z"/><path d="M10 20v-7a6 6 0 0 1 12 0v7H10Zm-4 4h20M13 28v-4m6 4v-4M10 16h12"/><circle cx="16" cy="10" r="1"/></svg>';document.body.append(launcher);
  const view=createView();
  function returnToLive(){view.close();show();if(!launcher.hidden)launcher.focus();else if(!panel.hidden)list.focus();}
  launcher.addEventListener('click',()=>{view.open();show();returnButton.focus();});returnButton.addEventListener('click',returnToLive);
  panel.addEventListener('keydown',event=>{if(event.key==='Escape'&&view.manual){event.preventDefault();event.stopPropagation();returnToLive();}});
  const list=panel.querySelector('.jb-strips'),readout=panel.querySelector('.jb-readout'),prev=panel.querySelector('.jb-prev'),next=panel.querySelector('.jb-next'),meter=panel.querySelector('.jb-rail');
  let state='checking',loaded=false,loading=false,selected='',songs=[],byCode=new Map(),oldFocus=null;const inertBefore=new Map();
  function show(){
    const on=view.visible(state,location.hash);
    const home=!location.hash||location.hash==='#';
    launcher.hidden=!home||on;launcher.setAttribute('aria-expanded',String(on));
    returnButton.hidden=!view.manual;panel.classList.toggle('jb-manual',view.manual);
    status.hidden=on||!home||!['checking','offline','stale','invalid','unavailable'].includes(state);
    status.textContent=state==='checking'?'Checking live status…':state==='stale'?'The live update is out of date. Checking for a new update…':'Live status is unavailable. Retrying automatically.';
    if(on===!panel.hidden)return;
    panel.hidden=!on;document.body.classList.toggle('jb-active',on);
    if(on){oldFocus=document.activeElement;for(const e of document.body.children){if(e===panel||e===status||e===launcher||/^(SCRIPT|STYLE|LINK)$/.test(e.tagName))continue;inertBefore.set(e,e.inert);e.inert=true;}load();}
    else{for(const [e,v]of inertBefore)e.inert=v;inertBefore.clear();if(panel.contains(document.activeElement)){if(oldFocus?.isConnected&&!oldFocus.inert)oldFocus.focus();else document.body.focus();}}
  }
  function position(){const max=Math.max(0,list.scrollHeight-list.clientHeight);const pct=max?Math.min(1,Math.max(0,list.scrollTop/max)):0;prev.disabled=pct<=.001;next.disabled=pct>=.999;meter.style.setProperty('--position',pct);}
  list.addEventListener('scroll',position,{passive:true});new ResizeObserver(position).observe(list);
  function step(dir){list.scrollBy({top:dir*Math.max(1,list.clientHeight-8),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}
  prev.addEventListener('click',()=>step(-1));next.addEventListener('click',()=>step(1));
  function button(text,parent,fn){const b=document.createElement('button');b.type='button';b.textContent=text;b.addEventListener('click',fn);parent.append(b);return b;}
  function chooseLetter(letter){selected=letter;readout.textContent=letter+' —';for(const b of panel.querySelectorAll('.jb-letters button'))b.setAttribute('aria-pressed',String(b.textContent===letter));for(const b of panel.querySelectorAll('.jb-numbers button'))b.disabled=!byCode.has(letter+b.textContent);}
  function chooseNumber(number){const code=selected+number,song=byCode.get(code);if(!song)return;readout.textContent=code;window.open('https://www.youtube.com/watch?v='+song.youtubeId,'_blank','noopener,noreferrer');}
  async function load(){if(loaded||loading)return;loading=true;try{
    const response=await fetch('jukebox-songs.json',{cache:'no-cache'});if(!response.ok)throw Error('Unavailable');const data=await response.json();songs=validate(data.songs);byCode=new Map(songs.map(s=>[s.selection,s]));
    for(const s of songs){const a=document.createElement('a');a.className='jb-strip';a.href='https://www.youtube.com/watch?v='+s.youtubeId;a.target='_blank';a.rel='noopener noreferrer';a.setAttribute('aria-label',s.selection+': '+s.title+' by '+s.artist);const code=document.createElement('b');code.textContent=s.selection;const copy=document.createElement('span'),title=document.createElement('strong'),artist=document.createElement('small');title.textContent=s.title;artist.textContent=s.artist;copy.append(title,artist);a.append(code,copy);list.append(a);}
    const letters=[...new Set(songs.map(s=>s.selection[0]))];if(letters.length===11&&letters.join('')==='ABCDEFGHIJK')letters.push('L');
    for(const letter of letters){const b=button(letter,panel.querySelector('.jb-letters'),()=>chooseLetter(letter));b.disabled=!songs.some(s=>s.selection.startsWith(letter));b.setAttribute('aria-pressed','false');}
    for(const n of '1234567890'){const b=button(n,panel.querySelector('.jb-numbers'),()=>chooseNumber(n));b.disabled=true;}
    queues(songs).forEach((url,i)=>{const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=i===0?'▶ Play':i===1?'▶ Play the rest':'▶ Keep playing';a.setAttribute('aria-label',`Play songs ${i*50+1} through ${Math.min(songs.length,(i+1)*50)} in YouTube`);panel.querySelector('.jb-play').append(a);});loaded=true;position();
  }catch{const error=panel.querySelector('.jb-error');error.hidden=false;error.textContent='Selections are unavailable. ';button('Try again',error,()=>{error.hidden=true;error.replaceChildren();load();});}finally{loading=false;}}
  window.addEventListener('retroverse:feed-state',e=>{state=e.detail?.state;show();});const onRoute=()=>{view.route(location.hash);show();};window.addEventListener('retroverse:route-changed',onRoute);window.addEventListener('hashchange',onRoute);window.addEventListener('popstate',onRoute);show();
})(typeof window==='undefined'?null:window);
