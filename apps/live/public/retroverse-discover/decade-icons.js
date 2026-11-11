'use strict';
/* Exact, approved review-sheet artwork. View boxes select each icon without a redraw.
   Presentation only: no catalog, VirtualDJ, network feed or song-year mutation. */
(function(root){
 const kinds=Object.freeze(['music','movies','tv']);
 const sheets=Object.freeze(['theme-art/retroverse-simple-icons-1950s-1980s.png','theme-art/retroverse-simple-icons-1990s-2020s.png']);
 const boxes=Object.freeze({"1950":[[176,234,240,301],[449,259,291,279],[771,217,286,321]],"1960":[[157,575,261,294],[436,613,323,246],[784,560,255,308]],"1970":[[143,911,289,248],[448,900,263,260],[741,921,324,236]],"1980":[[157,1192,265,247],[421,1262,320,173],[756,1179,286,265]],"1990":[[145,233,297,295],[455,232,291,305],[744,242,320,281]],"2000":[[160,575,280,296],[438,574,281,285],[727,588,344,279]],"2010":[[159,902,249,263],[403,907,304,266],[728,917,336,242]],"2020":[[159,1187,221,257],[385,1226,331,215],[730,1195,330,243]]});
 function render(kind,decade) {
  const index=kinds.indexOf(kind),row=boxes[decade];
  if(index<0||!row||!Number.isInteger(decade))return '';
  const sheet=sheets[decade<1990?0:1],box=row[index],clip='approved-icon-'+decade+'-'+kind;
  const shape=kind==='music'&&decade===1970?'<path d="M157 911H432V1159H143V1070H157Z"/>':kind==='music'&&decade===1990?'<path d="M155 233H442V528H145V398H155Z"/>':'<rect x="'+box[0]+'" y="'+box[1]+'" width="'+box[2]+'" height="'+box[3]+'"/>';
  return '<svg class="year-portal-art approved-decade-icon" data-icon-decade="'+decade+'" data-icon-kind="'+kind+'" viewBox="'+box.join(' ')+'" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false"><defs><clipPath id="'+clip+'">'+shape+'</clipPath></defs><image clip-path="url(#'+clip+')" href="'+sheet+'" x="0" y="0" width="1086" height="1448"/></svg>';
 }
 const api=Object.freeze({render,decades:Object.freeze(Object.keys(boxes).map(Number)),kinds});
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.RetroverseDecadeIcons=api;
})(typeof window!=='undefined'?window:null);
