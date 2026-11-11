'use strict';
/* Presentation only. A fallback theme never supplies or changes a song year. */
(function(root){
 const decades=Object.freeze([1950,1960,1970,1980,1990,2000,2010,2020]);
 const storageKey='retroverse-theme-year-fallback-v2:';
 function usableYear(year){return Number.isInteger(year)&&year>=1900&&year<=2100;}
 function decadeForYear(year){return Number.isInteger(year)&&year>=1950&&year<=2029?Math.floor(year/10)*10:null;}
 function createThemeController({storage,random=Math.random,apply=()=>{}}={}){
  const fallbackYears=new Map();
  function fallbackYear(identity='unresolved'){
   const key=String(identity||'unresolved');
   if(fallbackYears.has(key))return fallbackYears.get(key);
   let value=null;
   try{const saved=storage?.getItem(storageKey+key);const parsed=Number(saved);if(saved!=null&&Number.isInteger(parsed)&&parsed>=1965&&parsed<=1995)value=parsed;}catch{}
   if(value===null){const sample=random();value=1965+Math.floor((Number.isFinite(sample)&&sample>=0&&sample<1?sample:0)*31);try{storage?.setItem(storageKey+key,String(value));}catch{}}
   fallbackYears.set(key,value);return value;
  }
  function presentation(year,identity){const known=usableYear(year),supported=decadeForYear(year);const selectedYear=known?year:fallbackYear(identity);return {year:selectedYear,decade:supported??decadeForYear(known?fallbackYear(identity):selectedYear),source:supported===null?'fallback':'year'};}
  return Object.freeze({presentation,resolve(year,identity){return presentation(year,identity).decade;},setYear(year,identity){const selected=presentation(year,identity);apply(selected.decade,selected.source);return selected.decade;}});
 }
 const api={decades,decadeForYear,createThemeController};
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root){let storage;try{storage=root.sessionStorage;}catch{};root.RetroverseDecadeTheme={...api,controller:createThemeController({storage,apply(decade,source){const html=root.document?.documentElement;if(html){html.dataset.decade=String(decade);html.dataset.themeSource=source;}}})};}
})(typeof window!=='undefined'?window:null);
