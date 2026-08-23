"use client";
import { useState } from 'react';
import type { WoodstockPresentationAsset as Asset } from '@/lib/retroverse/woodstock-presentation-types';
import { woodstockHeroUrl } from '@/lib/retroverse/woodstock-presentation-types';
import { Rv2PublicShell } from '@/components/retroverse-2/Rv2PublicShell';

export function WoodstockPresentationAsset({ asset }: { asset: Asset }) {
  const [slide, setSlide] = useState(0);
  const current = asset.slides[slide] ?? asset.slides[0];
  return <Rv2PublicShell className="woodstock-presentation" activeNav="live" minimalNavigation broadcastChrome={false}>
    <main style={{maxWidth:720,margin:'0 auto',padding:'20px 16px 56px',color:'#fff'}} aria-label="Woodstock presentation">
      <p style={{letterSpacing:'.16em',fontSize:12,color:'#f3b35f'}}>WOODSTOCK 1969</p>
      <img src={woodstockHeroUrl(asset.vdjIdentity)} alt="" style={{width:'100%',aspectRatio:'16/9',objectFit:'cover',borderRadius:12,background:'#222'}} />
      <p style={{margin:'18px 0 6px',fontSize:12,letterSpacing:'.12em',color:'#f3b35f'}}>{asset.presentationType.replace('_',' ')}</p>
      <h1 style={{fontSize:'clamp(30px,7vw,58px)',lineHeight:1.02,margin:'0 0 8px'}}>{asset.title}</h1>
      {asset.subtitle ? <p style={{fontSize:18,margin:'0 0 22px',opacity:.78}}>{asset.subtitle}</p> : null}
      <section style={{padding:'22px 0',borderTop:'1px solid rgba(255,255,255,.2)'}} aria-live="polite">
        <p style={{fontSize:12,letterSpacing:'.12em',color:'#f3b35f'}}>SLIDE {slide+1} / {asset.slides.length}</p>
        <h2 style={{fontSize:26,margin:'8px 0 10px'}}>{current.title}</h2>
        <p style={{fontSize:18,lineHeight:1.55,margin:0,maxWidth:640}}>{current.body}</p>
      </section>
      <nav aria-label="Woodstock slides" style={{display:'flex',gap:12,marginTop:12}}>
        <button type="button" onClick={()=>setSlide(Math.max(0,slide-1))} disabled={slide===0} style={{padding:'12px 18px',fontSize:16}}>Back</button>
        <button type="button" onClick={()=>setSlide(Math.min(asset.slides.length-1,slide+1))} disabled={slide===asset.slides.length-1} style={{padding:'12px 18px',fontSize:16}}>Next</button>
      </nav>
    </main>
  </Rv2PublicShell>;
}
