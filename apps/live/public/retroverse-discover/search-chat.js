/* Search chat orchestration only. No provider, key or persistent history. */
(function(root,factory){'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.RetroverseSearchChat=api;})(typeof window==='object'?window:globalThis,function(){
 'use strict';
 const LIMITS=Object.freeze({input:300,turns:6,answer:6000,timeout:10000});
 const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
 const validToken=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
 const clean=(v,max)=>typeof v==='string'&&v.trim().length>0&&v.length<=max&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(v)?v.trim():null;
 function validate(reply,request){
  if(!record(reply)||reply.status!=='ready'||reply.requestId!==request.requestId||reply.selectionToken!==request.selectionToken||!clean(reply.text,LIMITS.answer)||!Array.isArray(reply.sources)||!reply.sources.length||reply.sources.length>30||!Array.isArray(reply.supports)||!reply.supports.length||reply.supports.length>30||!Array.isArray(reply.followups)||reply.followups.length!==2)return null;
  const sources=[];for(const s of reply.sources){if(!record(s)||!clean(s.title,300)||typeof s.url!=='string'||s.url.length>2048||/[\u0000-\u0020\u007f]/.test(s.url))return null;try{const u=new URL(s.url);if(u.protocol!=='https:'||u.username||u.password)return null;sources.push({title:s.title,url:u.href});}catch{return null}}
  const supports=[];for(const s of reply.supports){if(!record(s)||!Number.isInteger(s.start)||!Number.isInteger(s.end)||s.start<0||s.end<=s.start||s.end>reply.text.length||!Array.isArray(s.sourceIndexes)||!s.sourceIndexes.length||s.sourceIndexes.length>30||s.sourceIndexes.some(i=>!Number.isInteger(i)||i<0||i>=sources.length)||new Set(s.sourceIndexes).size!==s.sourceIndexes.length)return null;supports.push({start:s.start,end:s.end,sourceIndexes:[...s.sourceIndexes]})}
  supports.sort((a,b)=>a.start-b.start);if(supports.some((s,i)=>i>0&&s.start<supports[i-1].end))return null;
  const followups=reply.followups.map(v=>clean(v,LIMITS.input));if(followups.some(v=>!v)||followups[0]===followups[1])return null;
  return {text:reply.text,sources,supports,followups};
 }
 function boundedRequest(request,payload,signal){return new Promise((resolve,reject)=>{if(signal.aborted){reject(Error('cancelled'));return}const abort=()=>reject(Error('cancelled'));signal.addEventListener('abort',abort,{once:true});Promise.resolve().then(()=>{if(signal.aborted)throw Error('cancelled');return request(payload,{signal})}).then(resolve,reject).finally(()=>signal.removeEventListener('abort',abort));});}
 function createHttpRequest({fetch:send=globalThis.fetch}={}){
  return async(payload,{signal}={})=>{
   if(typeof send!=='function'||!signal||signal.aborted)throw Error('Search unavailable');
   const body=JSON.stringify(payload);if(new TextEncoder().encode(body).byteLength>131072)throw Error('Search unavailable');
   const response=await send('/api/song-research/chat',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body,signal,cache:'no-store',credentials:'omit',redirect:'error'});
   if(signal.aborted||response.redirected||!response.body)throw Error('Search unavailable');
   const length=response.headers.get('content-length');if(length!==null&&(!/^\d+$/.test(length)||Number(length)>65536)){void response.body.cancel().catch(()=>{});throw Error('Search unavailable')}
   const reader=response.body.getReader(),chunks=[];let total=0;
   try{for(;;){if(signal.aborted)throw Error('cancelled');const part=await reader.read();if(part.done)break;total+=part.value.byteLength;if(total>65536)throw Error('Search unavailable');chunks.push(part.value)}
    if(signal.aborted)throw Error('cancelled');const bytes=new Uint8Array(total);let at=0;for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.byteLength}
    const value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));if(!record(value)||!response.ok&&value.status==='ready')throw Error('Search unavailable');return value;
   }finally{void reader.cancel().catch(()=>{})}
  };
 }
 function createController({request,onChange=()=>{},setTimeout:schedule=setTimeout,clearTimeout:unschedule=clearTimeout}={}){
  let current=null,job=null,serial=0,state={status:'idle',query:'',messages:[],followups:[],error:null};
  const snapshot=()=>JSON.parse(JSON.stringify(state));
  const emit=()=>onChange(snapshot());
  function stop(){if(job){job.controller.abort();unschedule(job.timer);job=null}}
  function cancel(){stop();current=null;state={status:'idle',query:'',messages:[],followups:[],error:null};emit()}
  function failure(message,status='error',rollback=false){const messages=rollback&&state.messages.at(-1)?.role==='user'?state.messages.slice(0,-1):state.messages;state={...state,messages,status,error:message,followups:[]};emit()}
  async function send(query,mode){
   const text=clean(query,LIMITS.input);if(!text){failure(`Use 1–${LIMITS.input} characters.`);return false}
   if(!current||!current.isCurrent()){cancel();return false}
   if(state.status==='loading')return false;
   if(mode==='followup'&&state.messages.length===0)mode='query';
   if(mode==='followup'&&state.messages.filter(m=>m.role==='user').length>=LIMITS.turns){failure('Start a new search to keep exploring.');return false}
   if(typeof request!=='function'){failure('Search is not connected yet.','disabled');return false}
   stop();if(mode==='query')state={status:'idle',query:text,messages:[],followups:[],error:null};
   const selection=current,history=state.messages.map(({role,text})=>({role,text}));
   const payload={requestId:String(++serial),selectionToken:selection.token,mode,query:text,history};
   const active={controller:new AbortController(),timer:null};job=active;
   state={...state,status:'loading',query:mode==='followup'?state.query:text,messages:[...state.messages,{role:'user',text}],followups:[],error:null};emit();
   const fresh=()=>job===active&&current===selection&&!active.controller.signal.aborted&&selection.isCurrent();
   active.timer=schedule(()=>{if(job!==active)return;stop();if(current===selection&&selection.isCurrent())failure('Search took too long. Try another question.','error',true);},LIMITS.timeout);
   try{const reply=await boundedRequest(request,payload,active.controller.signal);if(!fresh())return false;
    if(reply?.status==='disabled'){failure('Search is not connected yet.','disabled',true);return false}
    if(reply?.status==='unavailable'||reply?.status==='ungrounded'){failure('A verified source is not available for this question yet.','error',true);return false}
    if(reply?.status==='stale'){failure('The song changed. Open Search again.','error',true);return false}
    const result=validate(reply,payload);if(!result){failure('Search is unavailable. Try another question.','error',true);return false}
    state={...state,status:'ready',messages:[...state.messages,{role:'assistant',...result}],followups:result.followups,error:null};emit();return true;
   }catch{if(fresh())failure('Search is unavailable. Try another question.','error',true);return false}
   finally{if(job===active){unschedule(active.timer);job=null}}
  }
  function open({selectionToken,title,artist,isCurrent=()=>true}){
   if(!validToken(selectionToken)||!clean(title,240)||!clean(artist,240)||typeof isCurrent!=='function'){cancel();failure('Current song is not available.');return Promise.resolve(false)}
   if(current?.token===selectionToken&&current.title===title&&current.artist===artist){current.isCurrent=isCurrent;return Promise.resolve(state.status==='ready')}
   cancel();current={token:selectionToken,title,artist,isCurrent};const query=`${title} — ${artist}`;return send(query.length<=LIMITS.input?query:title,'current');
  }
  return {open,ask:text=>send(text,'followup'),newQuery:text=>{stop();if(state.status==='loading')state={...state,status:'idle'};return send(text,'query')},cancel,getState:snapshot};
 }
 function render(container,state,{onFollowup=()=>{}}={}){
  const doc=container.ownerDocument,fragment=doc.createElement('div');fragment.className='search-chat-thread';fragment.setAttribute('aria-live','polite');
  for(const message of state.messages){const bubble=doc.createElement('div');bubble.className=`search-chat-message search-chat-${message.role}`;bubble.style.whiteSpace='pre-wrap';
   if(message.role==='user')bubble.textContent=message.text;
   else {let at=0;for(const span of message.supports){bubble.appendChild(doc.createTextNode(message.text.slice(at,span.start)));for(const [n,i]of span.sourceIndexes.entries()){if(n)bubble.appendChild(doc.createTextNode(' '));const link=doc.createElement('a');link.textContent=n?`[${i+1}]`:message.text.slice(span.start,span.end);link.href=message.sources[i].url;link.title=message.sources[i].title;link.target='_blank';link.rel='noopener noreferrer';link.referrerPolicy='no-referrer';link.style.textDecoration='underline';bubble.appendChild(link)}at=span.end}bubble.appendChild(doc.createTextNode(message.text.slice(at)))}fragment.appendChild(bubble)}
  if(state.status==='loading'||state.error){const status=doc.createElement('p');status.className='search-chat-status';status.setAttribute('role',state.error?'alert':'status');status.textContent=state.error||'Searching…';fragment.appendChild(status)}
  if(state.followups.length){const links=doc.createElement('nav');links.className='search-followups';links.setAttribute('aria-label','Follow-up questions');for(const q of state.followups){const button=doc.createElement('button');button.type='button';button.textContent=q;button.addEventListener('click',()=>onFollowup(q));links.appendChild(button)}fragment.appendChild(links)}
  container.replaceChildren(fragment);container.hidden=false;
 }
 function createPreparedSampleRequest(){return async(request,{signal}={})=>{
  if(signal?.aborted)throw Error('cancelled');
  const intro='Billy Preston recorded “My Sweet Lord” for Encouraging Words, released on Apple in September 1970. George Harrison wrote the song and co-produced Preston’s recording; Harrison’s own version followed that November. So this is not simply a later cover of Harrison’s hit: Preston’s recording came first. [1]';
  const recording='The recording behind the song\nThat distinction makes Preston an interesting starting point. Listen to his gospel-rooted delivery, then compare it with Harrison’s version: the same composition can lead you into two different musical worlds. The album also includes Harrison’s “All Things Must Pass,” connecting Preston’s solo work to the songs Harrison was developing at the time. [2]';
  const concert='A performance worth exploring\nPreston returned to Harrison’s music at Concert for George. The tribute took place at London’s Royal Albert Hall on November 29, 2002, one year after Harrison’s death, with Preston among a lineup that included Eric Clapton, Paul McCartney and Ringo Starr. The official concert site is a useful next stop for the film and recordings. [3]';
  const context='Why the dates can look different\nThe 1970 album release and a later chart year describe different events. A chart entry is not automatically the date a recording first appeared. For this song, keeping the performer, recording and event separate gives you a much more useful story than a single year or chart position. [1]';
  const q=request.query.toLowerCase();if(request.mode==='query'&&!q.includes('my sweet lord'))return {status:'unavailable'};if(request.mode==='followup'&&!q.includes('concert')&&!q.includes('first'))return {status:'unavailable'};const text=request.mode==='current'||request.mode==='query'?[intro,recording,concert,context].join('\n\n'):q.includes('concert')?concert+'\n\n'+intro:q.includes('first')?intro+'\n\n'+context:recording+'\n\n'+intro;
  const sources=[{title:'My Sweet Lord — recording and release history',url:'https://en.wikipedia.org/wiki/My_Sweet_Lord'},{title:'Encouraging Words — album and track listing',url:'https://en.wikipedia.org/wiki/Encouraging_Words'},{title:'Concert for George — official site',url:'https://concertforgeorge.com/'}];
  const supports=[...text.matchAll(/\[([123])\]/g)].map(m=>({start:m.index,end:m.index+3,sourceIndexes:[Number(m[1])-1]}));
  return {status:'ready',requestId:request.requestId,selectionToken:request.selectionToken,text,sources,supports,followups:['Did Billy Preston release it first?','What was Concert for George?']};
 };}
 function createMockRequest(){return async(request,{signal}={})=>{if(signal?.aborted)throw Error('cancelled');const text='Demo answer: this shows where a sourced answer to your question will appear. No live AI search has been run. [1]';const start=text.indexOf('[1]');return {status:'ready',requestId:request.requestId,selectionToken:request.selectionToken,text,sources:[{title:'Example citation (demo only)',url:'https://example.com/'}],supports:[{start,end:start+3,sourceIndexes:[0]}],followups:['What is the story behind this song?','Where has this song appeared in films or TV?']};};}
 return {LIMITS,validToken,validate,createHttpRequest,createController,render,createMockRequest,createPreparedSampleRequest};
});
