(() => {
  'use strict';
  // Researched song relationships, kept separate from canonical recording identity.
  const graduateIds=Object.freeze(['RVTR417674','RVTR943642','RVTR556212']);
  const graduate=Object.freeze({
    title:'The Graduate',filmYear:1967,soundtrackYear:1968,
    copy:'The Sound of Silence opens The Graduate (1967). The 1968 soundtrack also includes Scarborough Fair/Canticle and portions of Mrs. Robinson.',
    relatedIds:graduateIds,
    sources:Object.freeze([
      {label:'Film context · Library of Congress',url:'https://blogs.loc.gov/now-see-hear/2022/05/celebrating-graduation-with-the-graduate-and-pomp-and-circumstance/'},
      {label:'Official soundtrack track list',url:'https://simonandgarfunkel.com/music/graduate/'},
    ]),
  });
  window.RetroverseEditorial=Object.freeze({
    forTrack:id=>graduateIds.includes(id)?graduate:null,
    keywordsForTrack:id=>graduateIds.includes(id)?['The Graduate','film soundtrack']:[],
  });
})();
