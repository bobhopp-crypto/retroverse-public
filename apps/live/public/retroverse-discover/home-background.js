/* Presentation sizing only. Never reads or replaces song identity/media. */
(()=>{'use strict';const copy=document.querySelector('.feature-copy'),title=document.getElementById('featured-title'),artist=document.getElementById('hero-artist'),year=document.getElementById('hero-year');if(!copy||!title||!artist||!year)return;
 let pending=false;
 function fit(){pending=false;for(const el of [title,artist,year])el.style.removeProperty('font-size');
  const available=Math.max(60,innerHeight-100-parseFloat(getComputedStyle(copy).bottom||0));
  for(let i=0;i<60&&(copy.getBoundingClientRect().height>available||copy.scrollWidth>copy.clientWidth+1);i++){
   let changed=false;for(const el of [title,artist,year]){const size=parseFloat(getComputedStyle(el).fontSize);if(size>12){el.style.fontSize=Math.max(12,size-1)+'px';changed=true;}}if(!changed)break;
  }
 }
 const schedule=()=>{if(!pending){pending=true;requestAnimationFrame(fit);}};
 new MutationObserver(schedule).observe(copy,{childList:true,subtree:true,characterData:true});
 addEventListener('resize',schedule);document.fonts?.ready.then(schedule);schedule();
})();
