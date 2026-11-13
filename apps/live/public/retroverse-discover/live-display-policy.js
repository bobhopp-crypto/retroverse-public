/* Presentation only: never changes feed identity, freshness, or research authorization. */
(function(root){
  'use strict';
  const GRACE_MS=25*60_000, STORAGE_KEY='retroverse:live-display-pause:v2';
  function identity(track){return track&&typeof track.title==='string'&&track.title.trim()&&typeof track.artist==='string'&&track.artist.trim()?JSON.stringify([track.title.trim(),track.artist.trim()]):null;}
  function safeCard(track,t){
    if(!track||typeof track.title!=='string'||!track.title.trim()||track.title.length>300||typeof track.artist!=='string'||!track.artist.trim()||track.artist.length>300)return null;
    const stamp=Date.parse(track.timestamp||'');if(!Number.isFinite(stamp)||stamp>t+120_000)return null;
    const year=value=>Number.isInteger(value)&&value>=1900&&value<=2100?value:null;
    let heroUrl=null;
    try{if(typeof track.heroUrl==='string'&&track.heroUrl.startsWith('/')&&!track.heroUrl.startsWith('//')&&track.heroUrl.length<2048){const u=new URL(track.heroUrl,'https://retroverse.invalid');if(u.origin==='https://retroverse.invalid'&&!u.hash&&u.pathname==='/api/experience/visual-asset'&&u.searchParams.getAll('file').length===1&&u.searchParams.get('file')==='hero-video.jpg'&&u.searchParams.getAll('rvtr').length===1&&/^(?:VDJ-[0-9A-F]{16}|RVTR[0-9]{6})$/i.test(u.searchParams.get('rvtr')||'')&&[...u.searchParams.keys()].every(k=>k==='file'||k==='rvtr'))heroUrl=u.pathname+u.search;}}catch{}
    return {title:track.title.trim(),artist:track.artist.trim(),id:/^RVTR[0-9]{6}$/.test(track.id||'')?track.id:null,year:year(track.year),vdjYear:year(track.vdjYear),timestamp:new Date(stamp).toISOString(),heroUrl,researchSelectionToken:null};
  }
  function create({storage=null,now=()=>Date.now()}={}){
    let pause=null,wasFresh=false,retained=null;
    try{const p=JSON.parse(storage?.getItem(STORAGE_KEY)||'null'),t=now();if(p&&p.version===2&&typeof p.key==='string'&&p.key.length<=2048&&Number.isFinite(p.until)&&p.until>=0&&p.until<=t+GRACE_MS)pause={version:2,key:p.key,until:p.until,markerTimestamp:typeof p.markerTimestamp==='string'?p.markerTimestamp:null,card:safeCard(p.card,t)};if(pause?.card&&identity(pause.card)!==pause.key)pause.card=null;}catch{}
    function save(){try{if(pause)storage?.setItem(STORAGE_KEY,JSON.stringify(pause));else storage?.removeItem(STORAGE_KEY);}catch{}}
    return {retainedTrack:()=>retained,update(state,track,marker){
      retained=null;
      const t=now();
      if(!identity(track)&&state==='idle'&&pause?.until>t&&pause.markerTimestamp===marker?.timestamp)track=pause.card;
      const key=identity(track),stamp=Date.parse(marker?.timestamp||'');
      const valid=marker?.source==='bridge'&&typeof marker.playing==='boolean'&&Number.isFinite(stamp)&&stamp<=t+(marker.playing?120_000:0);
      if(state==='fresh'){pause=null;wasFresh=true;save();return 'fresh';}
      // Transport/checking/invalid failures must not masquerade as a stopped DJ.
      if(state!=='idle'&&state!=='stale')return state;
      if(state==='stale'){wasFresh=false;return valid&&t-stamp>=GRACE_MS?'idle':'invalid';}
      if(!valid){wasFresh=false;return 'invalid';}
      if(!key){wasFresh=false;return 'idle';}
      if(!pause||pause.key!==key){pause={version:2,key,until:(wasFresh?t:Math.min(t,stamp))+GRACE_MS,markerTimestamp:marker.timestamp,card:safeCard(track,t)};save();}
      wasFresh=false;
      if(t<pause.until){retained=safeCard(track,t);return retained?'paused':'idle';}
      return 'idle';
    }};
  }
  const api={create,GRACE_MS,STORAGE_KEY};if(typeof module==='object'&&module.exports)module.exports=api;else root.RetroverseLiveDisplay=api;
})(typeof window==='undefined'?null:window);
