/* Optional current-song context. No prompts, provider keys, HTML or persistent cache. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RetroverseSongResearch = api;
})(typeof window === 'object' ? window : globalThis, function () {
  'use strict';
  const validToken = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
  const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  function validate(value, token) {
    if (!validToken(token) || !record(value) || value.status !== 'ready' || value.selectionToken !== token || !record(value.attribution) || value.attribution.required !== true || value.attribution.format !== 'inline-clickable-citations') return null;
    const {text, sources, supports} = value;
    if (typeof text !== 'string' || !text.trim() || text.length > 6000 || /[\uD800-\uDFFF\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(text) || !Array.isArray(sources) || !sources.length || sources.length > 30 || !Array.isArray(supports) || !supports.length || supports.length > 30) return null;
    const links = [];
    for (const source of sources) {
      if (!record(source) || typeof source.title !== 'string' || !source.title.trim() || source.title.length > 300 || /[\u0000-\u001f\u007f]/.test(source.title) || typeof source.url !== 'string' || source.url.length > 2048 || /[\u0000-\u0020\u007f]/.test(source.url)) return null;
      try { const url = new URL(source.url); if (url.protocol !== 'https:' || url.username || url.password) return null; links.push({title:source.title,url:url.href}); } catch { return null; }
    }
    const ranges = [];
    for (const support of supports) {
      if (!record(support) || !Number.isInteger(support.start) || !Number.isInteger(support.end) || support.start < 0 || support.end <= support.start || support.end > text.length || !Array.isArray(support.sourceIndexes) || !support.sourceIndexes.length || support.sourceIndexes.length > 30 || support.sourceIndexes.some(i => !Number.isInteger(i) || i < 0 || i >= links.length) || new Set(support.sourceIndexes).size !== support.sourceIndexes.length) return null;
      ranges.push({start:support.start,end:support.end,sourceIndexes:[...support.sourceIndexes]});
    }
    ranges.sort((a,b) => a.start - b.start || a.end - b.end);
    if (ranges.some((r,i) => i > 0 && r.start < ranges[i-1].end)) return null;
    return {text,sources:links,supports:ranges};
  }
  function citationLabel(span, source, index) {
    // Recognize only a complete provider citation span, not general Markdown.
    // Match its URL to the already-validated annotation before shortening it.
    const bare = span.startsWith('(') && span.endsWith(')') ? span.slice(1,-1) : span;
    const match = bare.match(/^\[([^\[\]\r\n]{1,300})\]\((https:\/\/[^\s<>]+)\)$/);
    if (!match || !match[1].trim()) return span;
    try {
      const url = new URL(match[2]);
      if (url.protocol === 'https:' && !url.username && !url.password && url.href === source.url) return `[${index+1}]`;
    } catch { /* Leave any unrecognized span as inert literal text. */ }
    return span;
  }
  function render(slot, result) {
    const doc = slot.ownerDocument, section = doc.createElement('section');
    const heading = doc.createElement('h4'); heading.textContent = 'Song context'; section.appendChild(heading);
    const prose = doc.createElement('p'); prose.style.whiteSpace = 'pre-line';
    const cite = (index, label) => {
      const source = result.sources[index], link = doc.createElement('a');
      link.textContent = label; link.href = source.url; link.title = source.title;
      link.setAttribute('aria-label', `${label} — ${source.title}`);
      link.target = '_blank'; link.rel = 'noopener noreferrer'; link.referrerPolicy = 'no-referrer';
      link.style.textDecoration = 'underline'; link.style.textUnderlineOffset = '3px';
      return link;
    };
    let cursor = 0;
    for (const range of result.supports) {
      prose.appendChild(doc.createTextNode(result.text.slice(cursor,range.start)));
      const first = range.sourceIndexes[0], span = result.text.slice(range.start,range.end);
      prose.appendChild(cite(first,citationLabel(span,result.sources[first],first)));
      for (const index of range.sourceIndexes.slice(1)) { prose.appendChild(doc.createTextNode(' ')); prose.appendChild(cite(index,`[${index+1}]`)); }
      cursor = range.end;
    }
    prose.appendChild(doc.createTextNode(result.text.slice(cursor))); section.appendChild(prose);
    const attribution = doc.createElement('p'); attribution.className = 'answer-source';
    attribution.textContent = 'Researched with OpenAI web search. Sources are linked in the text.';
    section.appendChild(attribution); slot.replaceChildren(section); slot.hidden = false;
  }
  function abortable(start, signal) {
    return new Promise((resolve,reject) => {
      if (signal.aborted) { reject(Error('cancelled')); return; }
      const abort = () => reject(Error('cancelled'));
      signal.addEventListener('abort',abort,{once:true});
      Promise.resolve().then(() => { if(signal.aborted)throw Error('cancelled'); return start(); })
        .then(resolve,reject).finally(() => signal.removeEventListener('abort',abort));
    });
  }
  async function readBody(response, signal) {
    if (!response.body || response.redirected) throw Error('unavailable');
    const length = response.headers.get('content-length');
    if (length !== null && (!/^\d+$/.test(length) || Number(length) > 65536)) { void response.body.cancel().catch(()=>{}); throw Error('too large'); }
    const reader = response.body.getReader(), chunks = []; let size = 0;
    try {
      for (;;) { const part = await abortable(()=>reader.read(),signal); if(part.done)break; size += part.value.byteLength; if(size > 65536)throw Error('too large'); chunks.push(part.value); }
      const bytes = new Uint8Array(size); let offset = 0;
      for(const chunk of chunks){bytes.set(chunk,offset);offset += chunk.byteLength;}
      return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
    } finally { void reader.cancel().catch(()=>{}); }
  }
  function createController({fetch:fetchResponse, AbortController:Controller = AbortController, setTimeout:schedule = setTimeout, clearTimeout:unschedule = clearTimeout} = {}) {
    let active = null, disabled = false;
    const attempted = new Set();
    function cancel() {
      const previous = active; active = null;
      if (!previous) return;
      previous.controller.abort(); unschedule(previous.timer);
      previous.slot.replaceChildren(); previous.slot.hidden = true;
    }
    function show({token,slot,isCurrent}) {
      if (!slot || !validToken(token) || typeof isCurrent !== 'function' || !isCurrent() || disabled || typeof fetchResponse !== 'function') { cancel(); return; }
      // Repainting the same current search moves only its already-visible DOM,
      // without caching or replaying grounded text after navigation/dismissal.
      if (active?.token === token) {
        if (slot !== active.slot) { slot.replaceChildren(...active.slot.childNodes); slot.hidden = active.slot.hidden; active.slot.hidden = true; active.slot = slot; }
        active.isCurrent = isCurrent; return;
      }
      cancel();
      // One attempt per playback selection per page. Failures never auto-retry.
      // Bound this session ledger by stopping rather than evicting old identities.
      if (attempted.has(token) || attempted.size >= 128) return;
      attempted.add(token);
      const job = {token,slot,isCurrent,controller:new Controller(),timer:null}; active = job;
      job.timer = schedule(()=>{if(active === job)cancel();},10000);
      const current = () => active === job && !job.controller.signal.aborted && job.slot.isConnected && job.isCurrent();
      void (async()=>{
        try {
          const response = await abortable(()=>fetchResponse('/api/song-research',{method:'GET',cache:'no-store',credentials:'same-origin',mode:'same-origin',redirect:'error',headers:{Accept:'application/json'},signal:job.controller.signal}),job.controller.signal);
          // Non-success payloads are used only to discover hard-disable. No errors
          // or provider messages are surfaced; the catalog remains on screen.
          if (!current()) { void response.body?.cancel().catch(()=>{}); return; }
          const value = await readBody(response,job.controller.signal);
          if (!current()) return;
          if (record(value) && value.status === 'disabled') { disabled = true; cancel(); return; }
          const result = response.ok ? validate(value,token) : null;
          if (!result) { cancel(); return; }
          render(job.slot,result);
        } catch { if(active === job)cancel(); }
        finally { unschedule(job.timer); }
      })();
    }
    return {show,cancel};
  }
  return {validToken,validate,render,createController};
});
